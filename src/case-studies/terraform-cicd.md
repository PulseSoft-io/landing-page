# Infrastructure as code, properly: a five-stage Terraform pipeline with audit-ready change controls

**Industry:** B2B SaaS — HR and workforce management software
**Engineering org:** ~55 engineers, platform team of 4
**Previous Terraform workflow:** Local execution, per-engineer AWS credentials
**Target:** Centralised CodePipeline-driven IaC pipeline across us-east-1 (primary) and us-east-2 (replica)
**Compliance requirement:** SOC 2 Type II — change management and access control
**Engagement duration:** 8 weeks
**Services:** Infrastructure as code, DevSecOps, CI/CD automation

---

## The challenge

By the time the client's platform team engaged PulseSoft, four engineers were responsible for
managing AWS infrastructure across a production environment serving roughly 8,000 business
customers. All four had production AWS credentials on their laptops. Infrastructure changes
were communicated over Slack. The workflow for applying a Terraform change was: write the
code, run `terraform plan` locally, paste the plan output into a thread, wait for a reply,
run `terraform apply`.

This had worked well enough when the company had two engineers and a handful of AWS resources.
It had stopped working when the company had four engineers, three environments, and
infrastructure complex enough that a plan output ran to 200 lines and nobody was reading it
carefully anymore.

In the 18 months before the engagement, the team had experienced two significant production
infrastructure incidents, both caused by engineers applying changes that had drifted from the
reviewed plan, one because the apply was run hours after the plan against a state that had
since changed. There had also been a slow accumulation of unmanaged infrastructure: EC2
instances spun up manually for testing and never terminated, S3 buckets created outside of
Terraform, RDS snapshots that nobody could account for. The team knew the drift was there.
They had no reliable way to surface it or address it systematically.

What made this urgent rather than merely uncomfortable was an approaching SOC 2 Type II
audit. The company's enterprise customers were beginning to require it, and the audit's
change management controls would ask a question the team couldn't confidently answer: how
do you ensure that infrastructure changes are reviewed and approved before being applied to
production, and how do you prove it? The honest answer was: a Slack message and trust.
That was not going to pass.

---

## Our approach

PulseSoft designed and implemented a five-stage Terraform CI/CD pipeline on AWS CodePipeline,
replacing the local-execution model entirely. The pipeline enforces a strict separation
between the humans who write infrastructure code and the system that applies it, no
engineer runs `terraform apply` against production directly. Every infrastructure change,
without exception, flows through the same auditable sequence of stages.

The secondary objectives were security (KMS-encrypted artifact storage, least-privilege
IAM), resilience (cross-region artifact replication), and ephemeral environment support
(a dedicated Destroy stage that enables clean, automated teardown of non-production
environments).

### Source control: AWS CodeCommit

All Terraform configurations were migrated into a managed AWS CodeCommit repository,
replacing a mix of local directories and an undisciplined GitHub repository that had
grown without branch protection or review requirements. CodeCommit serves as the
single source of truth for all infrastructure definitions. A merge to the main branch
is the only event that triggers a pipeline run, no manual executions, no exceptions.

### CodePipeline IAM role

Rather than individual engineers authenticating to AWS for Terraform operations, a
dedicated CodePipeline service role carries the permissions needed to plan and apply
infrastructure changes. This role was designed with least-privilege IAM policies
scoped to exactly the services and actions required, nothing broader. Engineers who
previously held AdministratorAccess in production for Terraform purposes had those
permissions removed. The credentials risk surface shrank to a single, monitored,
non-human identity.

### Stage 1: Checkout

A merge to the main branch in CodeCommit triggers the pipeline. The first stage checks
out the Terraform configuration from the repository and passes it as an input artifact
to subsequent stages. All inter-stage artifact passing flows through Amazon S3, with
every artifact encrypted at rest using an AWS KMS customer-managed key. This means
the plan file that Stage 3 produces and Stage 4 consumes, is cryptographically
tied to a specific pipeline run. An engineer cannot substitute a different plan file
at apply time.

### Stage 2: Validate

The second stage runs `terraform validate` via AWS CodeBuild before any planning
or state interaction occurs. Validate catches HCL syntax errors, undefined variable
references, and provider configuration issues in seconds, without requiring AWS API
calls or state access. Failures here terminate the pipeline immediately, with the
error surfaced in the CodeBuild log. Teams that previously ran validate locally,
when they remembered to, now have it enforced as a hard gate on every commit.

### Stage 3: Plan

The third stage runs `terraform plan`, producing a detailed execution plan that
describes exactly what infrastructure changes will be applied: resources to be
created, modified, or destroyed, with before and after values for every attribute.
The plan output is stored as an encrypted artifact in S3.

This stage is the change management control the auditors were asking about. Every
infrastructure change that has ever been applied through this pipeline has a
corresponding plan artifact: timestamped, attributed to a specific commit and
committer, and retrievable on demand. The plan stage also introduced a mandatory
human approval gate, a CodePipeline manual approval action sits between Stage 3
and Stage 4, requiring a named approver to review the plan output before the
pipeline proceeds to apply. No infrastructure change reaches production without a
documented approval.

### Stage 4: Apply

The fourth stage runs `terraform apply` against the plan file produced in Stage 3,
not a freshly generated plan. This is the detail that prevents the class of incident
the team had experienced: when apply consumes the Stage 3 artifact directly, it is
applying exactly the reviewed changes, not re-planning against a state that may
have shifted in the hours since the plan was approved.

CodeBuild runs the apply with the same service role used throughout the pipeline.
Apply output is captured in the CodeBuild log and the resulting state is stored
in the team's remote state backend. The full apply record, inputs, outputs,
duration, success or failure, is available in CodePipeline's execution history.

### Stage 5: Destroy

The fifth stage is a conditional destroy, used to terminate ephemeral environments
after a defined lifecycle. Before the pipeline, standing up a development or staging
environment was a manual process that typically took one to two days and was never
reliably torn down. Resources accumulated. The team consistently overspent on
non-production infrastructure relative to what was actually in use.

With the pipeline's Destroy stage, ephemeral environments are torn down by triggering
a parameterised destroy run, the same pipeline, a different execution path. A
staging environment that took 18 minutes to provision takes 12 minutes to destroy
completely. Nothing is left running that isn't supposed to be.

### Artifact storage: S3 and KMS

All pipeline artifacts, plan files, build outputs, inter-stage payloads, are
stored in a dedicated Amazon S3 bucket in us-east-1 with versioning enabled and
server-side encryption using an AWS KMS customer-managed key. The KMS key policy
restricts decrypt access to the CodePipeline service role, meaning no engineer
can decrypt a plan artifact outside of the pipeline execution context.

Amazon S3 cross-region replication copies all artifacts to a replica bucket in
us-east-2. In the event of a regional availability issue affecting us-east-1, the
artifact history and the pipeline's operational continuity are preserved in the
secondary region. For SOC 2 purposes, cross-region replication also satisfies the
availability control requirements that the client's enterprise customers expected
to see evidenced.

### Architecture

![Terraform CI/CD pipeline on AWS CodePipeline with five stages, KMS-encrypted S3 artifact storage, and cross-region replication to us-east-2](/diagrams/terraform-cicd.png)

_The complete pipeline: a user-initiated terraform apply triggers the CodePipeline IAM
role (step 2), which orchestrates five CodeBuild stages: checkout, validate, plan,
apply, destroy (steps 3–7). All inter-stage artifacts pass through KMS-encrypted S3
(step 8), with cross-region replication to a replica bucket in us-east-2 for
resilience and compliance._

---

## Results

The two incident categories that had affected the team in the previous 18 months
were both eliminated. Apply-on-stale-plan incidents became structurally impossible:
Stage 4 consumes the Stage 3 artifact, not a new plan. Unreviewed changes became
impossible: the manual approval gate cannot be bypassed within the pipeline.

The SOC 2 Type II audit passed on its first attempt. The change management finding
that had been flagged in a pre-audit assessment, "no evidence of formal review or
approval for infrastructure changes", was closed. The auditors were provided with
a CodePipeline execution history showing every infrastructure change, its associated
commit, the name of the approver, and the timestamp of the approval. Every required
control was demonstrable from pipeline logs without any manual evidence collection.

The Destroy stage, combined with parameterised environment configurations, enabled
the team to provision and tear down ephemeral staging environments through the pipeline
for the first time. In the first quarter after go-live, the team ran 14 staging
environments that would previously have been standing instances, all terminated on
schedule. Non-production infrastructure spend dropped 31% compared to the same
quarter the previous year.

Direct production Terraform access was removed from all four engineers' IAM identities.
The change was met with less resistance than expected: engineers described the manual
apply workflow as stressful and were glad to have the pipeline carry it.

---

## What our client said

> "Before this, our change management process for infrastructure was a Slack message
> and hoping nobody ran apply at the same time. Now it's five pipeline stages, an
> approval gate, and a complete audit trail. Our SOC 2 auditors asked how we control
> infrastructure changes. We sent them a link to CodePipeline's execution history.
> That was the whole answer."
>
> — Head of Platform Engineering, B2B SaaS

---

## What this made possible

The most significant organisational shift was less technical than it first appeared.
Once infrastructure changes required a pull request and a pipeline run rather than
a local terminal session, the platform team's workflow began to look like the
application engineering team's workflow. PRs got proper reviews. Changes were smaller
and more targeted. The feedback loop tightened: a broken validate caught in Stage 2
took seconds to identify; under the old model, a failed apply might not be noticed
until someone checked Slack an hour later.

The pipeline also became the foundation for the team's ephemeral environment strategy.
With destroy working reliably and environment provisioning consistently under 20
minutes, the team began using staging environments more aggressively: spinning them
up for individual feature branches, testing infrastructure changes in isolation before
merging, and tearing them down the same day. This was not previously possible at a
pace that kept up with the development team's cadence.

The client now has an infrastructure delivery process that is auditable by design,
not retrofitted for compliance. Changes are reviewed before they're applied, applied
from exactly the reviewed plan, and logged permanently. That is what change management
for infrastructure should look like and it took eight weeks to get there.

---

_Managing Terraform manually and looking to build a pipeline that your auditors will
actually understand?
[Schedule an architecture review →](mailto:contact@pulsesoft.io)_
