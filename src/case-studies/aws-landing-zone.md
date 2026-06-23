# Multi-account AWS governance at scale: automated account provisioning and compliance baselining

**Industry:** B2B SaaS — financial compliance and reporting software
**Engineering org:** ~180 engineers across 9 product teams
**AWS accounts at engagement start:** 14 (manually managed)
**AWS accounts at engagement end:** 67 (fully automated)
**Compliance requirement:** SOC 2 Type II
**Engagement duration:** 10 weeks
**Services:** Cloud architecture, DevSecOps, compliance readiness

---

## The challenge

When PulseSoft first engaged with the client's platform engineering lead, the team was managing
14 AWS accounts almost entirely by hand. Each one had been provisioned manually by a platform
engineer, a multi-day process of creating the account, configuring VPCs, standing up IAM roles,
enabling CloudTrail and GuardDuty, and attempting to replicate whatever security posture existed
in the previous account from memory or an aging runbook.

The results were predictable. One account had GuardDuty enabled; two didn't. An S3 bucket with
public access went unnoticed for nearly three months. Security reviews ahead of new account
go-lives consumed an entire sprint. Engineers waited up to a week just to get access to an
isolated AWS environment.

What made this untenable wasn't the speed alone, it was an approaching SOC 2 Type II audit.
The company's enterprise customers were starting to require it as a condition of contract, and
the audit would ask a question the team genuinely couldn't answer: how could they prove that
security controls were applied consistently across every account? The honest answer was that
they couldn't. Every account was one engineer's best effort on a given day. That had to change
before the audit window opened.

---

## Our approach

PulseSoft designed and implemented a Customizations for AWS Control Tower (CfCT) architecture —
an event-driven, fully automated account vending and governance pipeline built entirely on
AWS-native services.

The core design principle was that no AWS account should ever require a human to configure it
manually. Every account enrolled in the organization needed to emerge from a pipeline already
carrying the correct VPC topology, IAM roles, logging configuration, and security guardrails —
identical to every other account, provably so, with a complete audit trail.

### Lifecycle event capture

The pipeline begins the moment a new account is enrolled in AWS Control Tower. Control Tower
fires a lifecycle event which Amazon EventBridge captures and routes into an SQS FIFO queue.
The FIFO ordering matters here: Control Tower operations can conflict when triggered concurrently,
and a naive fan-out approach would cause failures when multiple accounts are provisioned in
quick succession. The queue serializes work, ensuring each account vending operation completes
cleanly before the next begins. AWS Lambda processes each message in sequence and triggers the
downstream pipeline.

### Configuration as code

All account baseline configuration lives in two source locations rather than hardcoded
infrastructure. Amazon S3 holds default upload packages, the standard baseline every new
account receives automatically. AWS CodeCommit holds commit packages: version-controlled
configuration that teams can propose, review, and merge via pull request. Any change to what
a baseline account looks like, adding a new Config rule, tightening an SCP, changing
subnet topology, is a code change, not a manual operation. Every modification is attributed,
reviewed, and reversible. When auditors asked to see how security controls were defined and
who had approved changes to them, the answer was a git log.

### Build and orchestration

AWS CodePipeline pulls from both configuration sources on each account enrollment event.
AWS CodeBuild runs validation against every package before anything is deployed: CloudFormation
template linting, SCP policy syntax checks, and dry-run validation against the target account
to surface errors before they reach production. AWS Step Functions then orchestrates the
actual deployment, branching into two simultaneous tracks that target different layers of
the AWS organization.

### Deployment: two enforcement layers

**Baseline resources via CloudFormation StackSets.** The first track deploys infrastructure
baselines to each new account using CloudFormation StackSets. Every account receives the same
VPC and subnet topology, IAM roles for cross-account access and tooling integration, AWS Config
rules, CloudTrail logging, GuardDuty threat detection, and Security Hub enrollment, all from
the same CloudFormation template, applied identically, every time. StackSets handle the
mechanics of targeting the new account within the organization without requiring any
account-level credentials.

**Preventive controls via AWS Organizations SCPs.** The second track applies Service Control
Policies at the Organizations level, not inside the member account, but above it. Controls
include denying root user API calls, requiring MFA for privileged operations, restricting
workloads to approved AWS regions, enforcing IMDSv2 on EC2 instances, and blocking
the disabling of logging services. Critically, these controls cannot be overridden from
within the member account, regardless of what IAM permissions the account's own administrators
hold. Enforcement is structural, not advisory.

### Architecture

![AWS Control Tower lifecycle event workflow and CodePipeline deployment architecture](/diagrams/aws-landing-zone.png)

_The full pipeline: lifecycle events from Control Tower flow through EventBridge and SQS FIFO
to Lambda, which triggers CodePipeline. Configuration pulled from S3 and CodeCommit passes
through CodeBuild validation before Step Functions orchestrates parallel deployment of
CloudFormation StackSets and service control policies to all managed accounts._

---

## Results

Account provisioning time dropped from five to seven business days to an average of 22 minutes.
Over the six months following the engagement, the client scaled from 14 manually managed accounts
to 67 fully automated accounts without adding a single person to the platform team.

The SOC 2 Type II audit passed on its first attempt. Auditors were given a live demonstration
of the account vending pipeline: an account enrolled in Control Tower, emerging 22 minutes
later with every required control in place, logged, and traceable to source. The audit report
cited automated control enforcement as a strength. No remediations were required.

Configuration drift, which had shown up in every previous internal security review, dropped
to zero. Not because the team became more diligent, but because the architecture made
inconsistency structurally impossible.

---

## What our client said

> "Our auditors kept asking how we could prove security controls were applied consistently
> across 60-plus accounts. The answer we gave them, that a human never touches account
> configuration, that everything comes from a pipeline and a pull request, was the most
> straightforward compliance story we have ever had to tell."
>
> - Head of Platform Engineering, Series A Startup

---

## What this made possible

With account provisioning automated and trustworthy, product teams could request their own
AWS accounts through a self-service form rather than filing a ticket and waiting through a
manual process. New teams stood up isolated environments for experimentation without touching
the platform team's backlog. Platform engineers moved from reactive account hygiene to
proactive governance: tuning baselines, expanding SCP coverage as compliance requirements
evolved, and onboarding new AWS services into the standard baseline through a pull request.

The infrastructure also composed well with the rest of the organization's existing toolchain.
Because every account was guaranteed to carry the correct IAM roles and logging configuration
from the moment it was created, centralized tooling, cost management, security monitoring,
and compliance scanning, worked against every account automatically, with no per-account
onboarding required.

The platform the client has now doesn't just support their current scale. It's the same
architecture that will handle 200 accounts the same way it handled 14, without additional
engineering effort, without manual review, and without the compliance risk that comes from
trusting a runbook more than a pipeline.

---

_Ready to bring the same governance model to your AWS organization?
[Schedule an architecture review →](mailto:contact@pulsesoft.io)_
