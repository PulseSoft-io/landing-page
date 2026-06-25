# From monolith to serverless: migrating a production application to AWS with zero data loss and a 9-minute cutover

**Industry:** B2B SaaS — workflow automation and client portal software
**Engineering org:** ~40 engineers across 4 product squads
**Previous infrastructure:** Single managed virtual server (monolithic Node.js application)
**Migration tool:** CloudEndure
**Target architecture:** Fully serverless — API Gateway, Lambda, S3, CloudFront, Cognito, DynamoDB
**Engagement duration:** 12 weeks
**Services:** Cloud architecture, migration execution, DevSecOps

---

## The challenge

The client had been running their production application on a single managed virtual server for
six years. In the early days, this was fine, the team was small, the codebase was manageable,
and the operational overhead was something a part-time sysadmin could absorb. By the time they
engaged PulseSoft, that calculus had completely changed.

With 40 engineers and four product squads pushing changes to the same codebase, every
production deployment had become a coordinated risk event. The team ran a scheduled deploy
window every other Friday, engineering leadership on a group call, a checklist longer than
any engineer wanted to maintain, and a standing expectation that the night might go badly.
In the previous 18 months, it had gone badly three times: one rollback, one two-hour partial
outage, and one data consistency issue that took a week to fully resolve.

Beyond deployment risk, the infrastructure itself had become a liability. The monolith handled
authentication internally, with hand-rolled session management and password storage that hadn't
been meaningfully reviewed in years. The database ran on the same server as the application.
Scaling required human intervention. Server patching came with its own deployment windows and
its own anxiety.

The business case was straightforward: eliminate the server, eliminate the risk surface, and
give the engineering team the ability to ship independently.

---

## Our approach

PulseSoft designed a fully serverless target architecture and executed the migration using
CloudEndure to minimize cutover risk. Rather than rewriting the application during migration —
a common mistake that conflates two separate problems, we separated the migration from the
modernisation. The server came down; the serverless architecture came up. The application logic
was then decomposed into Lambda functions as a distinct, lower-risk second phase.

The result is an architecture in which no EC2 instance runs in steady state, every component
scales automatically, and deployments are independent by function domain.

### Migration execution with CloudEndure

CloudEndure performs continuous block-level replication from the source server to a staging
environment in AWS, maintaining a near-real-time shadow copy throughout the migration period.
When the cutover window opened, the replication lag had been under two seconds for 72 hours.
The actual cutover, draining connections from the source, promoting the CloudEndure replica,
pointing DNS, completed in nine minutes with no data loss and no perceptible downtime for
end users.

CloudEndure's approach was chosen specifically because it decouples the cutover from the
architectural transformation. The team didn't need to freeze feature development during a
weeks-long migration project. Engineers kept shipping to the existing server while PulseSoft
prepared the serverless target environment in parallel.

### Frontend layer: ECS pipeline, S3, and CloudFront

The frontend, previously rendered server-side and served directly from the monolith, was
separated into a standalone static application and given its own deployment pipeline. Amazon
Elastic Container Service runs the build pipeline: each frontend commit triggers a containerised
build process that compiles, bundles, and pushes static assets to Amazon S3.

Amazon CloudFront sits in front of S3 as the CDN and HTTPS termination layer. Users who
were previously hitting a server in a single region for every HTML, CSS, and JavaScript
file are now served from CloudFront edge locations, with cache hit rates above 94% for
static assets. Frontend deploys, which previously required a full application deployment —
are now a pipeline trigger: a commit lands, ECS builds, S3 is updated, CloudFront
invalidation runs. The whole process takes under three minutes and is entirely automated.

### API layer: API Gateway

Amazon API Gateway replaced the monolith's internal routing layer. It handles HTTPS
termination, request throttling, CORS configuration, and request/response transformation
before traffic reaches Lambda. Critically, API Gateway decouples the public API contract
from the Lambda implementations behind it, function versions can be swapped, canary
deployments can be run, and individual endpoints can be updated without touching anything
else in the stack.

### Lambda functions: decomposition by business domain

The application's backend was decomposed into four Lambda function groups, each corresponding
to a distinct business domain rather than a technical layer. This domain-based split was
deliberate: it means a change to the admin reporting logic requires no deployment of user
functions, and a change to authentication touches only the login functions.

**Login functions** handle all authentication flows, sign-in, token refresh, password reset,
and MFA verification, and integrate directly with Amazon Cognito as the identity provider.
Previously, this logic was scattered across 12 files in the monolith and had never been
formally audited.

**Admin functions** serve the administrative interface: user management, account configuration,
audit log access, and usage reporting. Separating these from user-facing functions provides
a meaningful blast radius boundary, an admin function deployment cannot affect user
session continuity.

**User functions** contain the core product logic accessed by end users and are the most
frequently deployed group. They read from and write to Amazon DynamoDB, which replaced
the relational database that had previously run on the same machine as the application.

**Tools functions** handle integrations with third-party services and internal operational
tooling via AWS Managed Services, including CloudWatch dashboards, automated alerting, and
usage metering.

### Authentication: Amazon Cognito

Amazon Cognito replaced the client's hand-rolled authentication system entirely. Cognito
User Pools now manage password policies, MFA enforcement, token issuance, and session
lifecycle. The team had been responsible for rotating JWT signing keys manually; Cognito
handles this automatically. The login Lambda functions integrate with Cognito via the
AWS SDK, keeping authentication logic thin and the identity system auditable by default.

### Data layer: Amazon DynamoDB

The relational database was migrated to Amazon DynamoDB over a two-week data modelling
and migration sprint. DynamoDB's serverless scaling model meant the team no longer needed
to provision RDS instances, manage read replicas, or schedule maintenance windows for
database patching. The access patterns of the user functions, high read volume against
user-specific records, mapped cleanly to DynamoDB's partition key model, with
provisioned capacity replaced by on-demand billing.

### Architecture

![Server migration to AWS serverless architecture](/diagrams/server_migration.png)

_The complete target architecture: a migration execution server coordinates the CloudEndure
cutover while the serverless application stack receives traffic via CloudFront (static assets
from S3) and API Gateway (business logic via four Lambda function domains connected to
Cognito, DynamoDB, and AWS Managed Services)._

---

## Results

The cutover completed in nine minutes with zero data loss. The engineering team shipped to
production the following Monday morning without scheduling a deploy window.

Within 60 days of the migration:

The Friday deploy window was gone. Lambda function deployments are independent, take between
8 and 40 seconds depending on function size, and require no cross-team coordination. In the
first quarter post-migration, the team shipped 94 times. In the same quarter the previous
year, they had shipped 6 times.

Server administration was eliminated entirely. No EC2 instances run in steady state. No
patching windows, no capacity planning calls, no sysadmin retainer. The operational overhead
that had consumed roughly 15% of the platform team's time is effectively zero.

Infrastructure spend dropped 38% compared to the managed server contract, despite a 20%
increase in user traffic over the same period. Lambda's per-invocation billing model and
DynamoDB's on-demand capacity mean the architecture scales to load without over-provisioning
for peaks.

Authentication incidents dropped to zero. Cognito's managed identity layer, combined with
the login Lambda's clean integration boundary, removed an entire category of production risk
that had contributed to two of the three previous outages.

---

## What our client said

> "We had a production deploy every other Friday. Everyone stayed late, nobody slept well,
> and we'd shipped a production incident more than once. Eight months after the migration,
> we've shipped 94 times. The last deploy was 11 seconds. Nobody even mentions deployment
> windows anymore."
>
> - Founder, Series A Startup

---

## What this made possible

The serverless architecture did something the team hadn't expected: it changed how squads
organised their work. When a deploy touches one Lambda function and takes 11 seconds, there
is no longer a forcing function to batch changes. Squads began shipping at the boundary of
their own readiness rather than at the boundary of the deployment calendar. Feature flags
replaced "let's hold this for the next deploy window." Smaller, more frequent, lower-risk
changes became the default.

The frontend and backend decoupling had an equally significant impact. The frontend squad
could ship independently of the API squads for the first time. A redesign of the client
portal dashboard went from concept to production in four days, without touching a line of
backend code or coordinating with another team's deploy schedule.

The infrastructure the client runs now costs less, scales further, and requires less
operational attention than what it replaced. More importantly, it removed the deployment
anxiety that had become a quiet but persistent drag on what the team could ship and how fast.

---

_Running a monolithic application and looking for a migration path that doesn't require
freezing development?
[Schedule an architecture review →](mailto:contact@pulsesoft.io)_
