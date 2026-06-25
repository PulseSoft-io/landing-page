# Zero-downtime deployments on Amazon ECS: Blue/Green delivery pipeline with 90-second rollback

**Industry:** Consumer fintech, digital payments and money transfer
**Engineering org:** ~60 engineers across 5 product squads
**Previous deployment method:** In-place ECS rolling update with scheduled maintenance windows
**Target:** Blue/Green pipeline via CodePipeline, CodeBuild, CloudFormation, and CodeDeploy on ECS Fargate
**Compliance context:** Payment processor SLA requiring 99.95% availability
**Engagement duration:** 7 weeks
**Services:** DevSecOps, CI/CD automation, platform engineering

---

## The challenge

The client operated a consumer payments application with over 400,000 active users and
contractual uptime commitments to two payment processor partners. Their engineering team
had containerised the application on ECS Fargate two years prior, a good foundation.
What had not been modernised was how code actually got to production.

Deployments were in-place rolling updates, scheduled for 2am on alternating Wednesdays.
The reason for 2am was straightforward: the rolling update mechanism drained in-flight
requests from old tasks as new tasks started, and during the overlap period the application
ran at reduced capacity. On a consumer payments platform, reduced capacity means failed
transactions, which means customer support escalations and partner SLA exposure. 2am had
the lowest transaction volume. It was the least bad option available.

Someone from the on-call rotation stayed up for every deployment, starting final checks at
1:30am and watching metrics until the new task set was fully healthy, usually around 3am
if everything went well. When things did not go well, they went badly. The rollback path
under the rolling update model was re-deploying the previous task definition, which meant
waiting for the new tasks to drain, the old task set to start, and health checks to pass.
In practice, a rollback took between 25 and 45 minutes. During those 25 to 45 minutes,
the degraded or failed deployment was still serving traffic.

In the 18 months before the engagement, this had mattered three times. One deployment
introduced a payment processing regression that was not caught in staging. It ran in
production for 31 minutes before the rollback was complete. The incident affected 2,400
transactions, generated 800 customer support contacts in 48 hours, and triggered a formal
review from one of the payment processor partners. The other two incidents were less severe
but followed the same pattern: something wrong in production, slow rollback, exposure window
measured in tens of minutes rather than seconds.

The 2am deployment window had also begun to affect the engineering team in ways that were
harder to measure but equally real. Engineers on the on-call rotation reported the bi-weekly
2am shift as the aspect of the job they found most demoralising. Deployment frequency had
been held artificially low, bi-weekly instead of the team's preferred weekly cadence —
because each deployment was expensive in terms of human attention and risk exposure. Changes
accumulated between deployment windows, making each deployment larger and riskier than
it needed to be.

---

## Our approach

PulseSoft designed and implemented a Blue/Green deployment pipeline on ECS Fargate using
AWS CodePipeline, CodeBuild, CloudFormation, and CodeDeploy. The architecture maintains
two full versions of the application, the current live version and the incoming version —
simultaneously, with a traffic shift rather than a replacement as the mechanism for promoting
a new deployment to production. The shift takes under 60 seconds. Rolling back is the same
operation in reverse and takes the same amount of time.

The deployment window moved from 2am to business hours within three weeks of go-live.

### Source and pipeline trigger

Developers commit and push to AWS CodeCommit. CodePipeline detects the push and triggers
the pipeline within seconds. The source stage pulls the committed code and passes it as
an artifact to the build stages. Every pipeline execution is attributed to a specific
commit, tagged with the committer, and logged with a full execution history in CodePipeline.
Deployment provenance, who committed what, when the pipeline ran, what each stage
produced, is available from a single console view for every production release.

### Build stage: Docker build and ECR push

The first CodeBuild stage runs the container build. It executes docker build against
the application source, tags the image with both the git commit SHA and a semantic
version derived from the repository tag, and pushes the image to Amazon Elastic
Container Registry. ECR's image scanning runs automatically on push, flagging known
CVEs in the base image and application dependencies before the image proceeds further
in the pipeline. A critical-severity CVE finding fails the pipeline and blocks
deployment without engineer intervention, security gates that previously existed
only as a pre-deployment checklist item became automated gates in the delivery path.

### Validate stage: configuration and infrastructure checks

A second CodeBuild stage validates the deployment configuration before any
infrastructure changes are made. This includes task definition syntax validation,
CloudFormation template linting and change set preview, and a set of integration
tests run against the newly built container image in an isolated environment. Failures
at this stage are significantly cheaper than failures in production, the pipeline
stops, the engineer is notified, and no infrastructure has changed.

### CloudFormation stack: Blue/Green infrastructure as code

The CloudFormation stack manages the infrastructure resources that make Blue/Green
deployments possible: the ECS service configuration, the two ALB target groups (Blue
and Green), the ALB listener rules, and the CodeDeploy deployment group. All of these
resources are defined in version-controlled CloudFormation templates, meaning that
changes to the deployment infrastructure itself, adjusting the traffic shift rate,
modifying the post-deployment wait period, adding a new health check, follow the same
review and audit process as application code changes.

CloudFormation applies any infrastructure changes before CodeDeploy begins the
deployment, ensuring the target environment is correctly configured before the new
application version is introduced to it.

### ALB dual-listener configuration: production and test traffic

The Application Load Balancer is configured with two listener sets. The production
listener (ports 80 and 443) routes to the Blue Target Group, which serves all live
customer traffic. A parallel test listener (ports 8080 and 8443) routes to the Green
Target Group, which receives only internal test traffic during the pre-shift validation
period.

This dual-listener configuration is what enables production-equivalent validation
before a single real user transaction touches the new version. Engineers and automated
smoke tests can hit the test port to exercise the new version against the production
database, production configuration, and production infrastructure, and observe its
behaviour in Grafana, before CodeDeploy is instructed to shift traffic. Issues that
were previously caught only after real customers encountered them can now be caught
in this validation window, against the exact environment the code will run in after
shift.

### ECS Fargate: two versions running simultaneously

During a Blue/Green deployment, both versions of the application run simultaneously
on ECS Fargate, v1 (Blue) serving production traffic, v2 (Green) running behind the
test listener. Fargate's serverless compute model means there is no node-level
capacity concern with running two full task sets: each task gets its own allocated
vCPU and memory, and Fargate scales the underlying compute automatically. The
additional cost of running two versions simultaneously is incurred for the duration
of the deployment window, typically 30 to 60 minutes, and is a small fraction
of the cost of a single incident caused by a bad in-place deployment.

### CodeDeploy: traffic shift and automatic rollback

AWS CodeDeploy manages the traffic shift from Blue to Green. The deployment
configuration is set to a canary pattern: 10% of production traffic shifts to
Green initially, with a 10-minute observation window before the remaining 90%
follows. During the observation window, CloudWatch alarms monitor error rate
and latency on both target groups. If any alarm fires, CodeDeploy triggers
an automatic rollback, shifting all traffic back to Blue, without engineer
intervention.

Manual rollback is equally simple: a single CodeDeploy console action or CLI
command shifts traffic back to Blue in under 90 seconds. The Blue environment
remains running and healthy throughout the deployment window, meaning rollback
is not a re-deployment, it is a traffic pointer change.

After successful shift and a configurable post-deployment wait period (set to
45 minutes, giving the team time to monitor the new version under full
production load), CodeDeploy terminates the Blue task set and the Green
environment becomes the new Blue for the next deployment cycle.

### Architecture

![Blue/Green ECS deployment pipeline: Developer pushes to CodeCommit, CodePipeline triggers CodeBuild for Docker build and ECR push, second CodeBuild validates, CloudFormation deploys Blue/Green infrastructure, CodeDeploy shifts traffic from Blue to Green target groups via ALB dual listeners, ECS Fargate runs both versions simultaneously in private subnets](/diagrams/blue-green-deploy-ecs.jpg)

_The full pipeline: a developer git push triggers CodePipeline, which orchestrates
Docker build and ECR push (CodeBuild), infrastructure validation (second CodeBuild),
Blue/Green resource provisioning (CloudFormation), and traffic shift from Blue to
Green (CodeDeploy). The ALB routes production traffic to Blue-TG (ports 80/443)
and test traffic to Green-TG (ports 8080/8443). Both v1 and v2 run on ECS Fargate
in private subnets until the deployment is validated and the shift completes._

---

## Results

The 2am deployment window was retired in the third week after go-live. The team
shipped to production at 2:14pm on a Tuesday and has not scheduled a late-night
deployment since.

Deployment-related downtime dropped to zero. The traffic shift mechanism produces
no capacity reduction and no transaction interruption, the new version absorbs
traffic as it arrives on the Green target group while the Blue target group
continues handling in-flight requests. Payment processor SLA exposure from
deployments was eliminated.

Rollback time fell from an average of 32 minutes to 87 seconds in the worst
case and 40 seconds in practice. The first genuine rollback under the new system
occurred 19 days after go-live: a Green deployment showed elevated latency in
the 10% canary window, CloudWatch alarms fired, and CodeDeploy automatically
shifted traffic back to Blue before the team had finished reading the alert.
No customer-visible impact. No support contacts. The incident that had previously
taken 45 minutes to resolve and generated 800 support tickets took 40 seconds
and generated zero.

Deployment frequency increased from bi-weekly to an average of 4.1 deployments
per week in the first quarter, tracking closely with the team's stated preferred
cadence. Smaller, more frequent deployments reduced the average change set per
deployment by 73%, which the SRE team correlated directly with a reduction in
deployment-related incident rate: zero deployment incidents in the 5 months
following go-live, compared to 3 in the 18 months before it.

ECR image scanning caught 3 high-severity CVEs in base image updates that would
previously have reached production undetected, including one in a cryptographic
library directly relevant to the payments processing path.

---

## What our client said

> "Every deployment was a 2am event. Someone set an alarm, stayed up until the
> rollout was healthy, and if something went wrong we were looking at 30 minutes
> of degraded service while we re-deployed the old version. Three weeks after
> go-live, we deployed at 2pm on a Tuesday. The canary caught a latency issue,
> rolled back in 40 seconds, and we went back to fix it. Nobody lost sleep.
> No customers noticed. That was the moment the team realised something had
> fundamentally changed."
>
> , VP of Engineering, SaaS Agency

---

## What this made possible

The most immediate change was operational: engineers stopped scheduling their
lives around deployment windows. The on-call rotation that had included a
standing bi-weekly commitment to a 2am alert became a standard rotation with
no deployment-specific obligations. The team reported this as a meaningful
quality-of-life improvement within weeks.

The second change was in how the team thought about deployment risk. When the
consequence of a bad deployment is a 40-second automatic rollback rather than
a 35-minute manual recovery, the calculus around deployment frequency changes
entirely. Changes that had been held back to accumulate into a larger bi-weekly
release began shipping as soon as they were ready. The average change set size
dropped, each individual deployment became lower-risk, and the relationship
between "code is ready" and "code is in production" compressed from days to hours.

The pre-traffic-shift testing capability via the test listener introduced a
qualitatively new kind of validation that the team had not previously had access
to: testing in production infrastructure, against production data, before real
users see the change. Several regression catches in the months after go-live
came from engineers exercising the new version on the test port and noticing
behaviour that looked wrong before the traffic shift was approved. Staging
environments will never perfectly replicate production; the Green environment
behind the test listener is production.

The payment processor partners whose SLA commitments had created the original
pressure to schedule 2am deployments were notified of the architecture change
as part of the quarterly review. One partner asked for a technical briefing on
the Blue/Green mechanism for use as a reference implementation in their own
vendor documentation.

---

_Scheduling deployments at 2am to avoid downtime and still dreading them anyway?
[Schedule an architecture review →](mailto:contact@pulsesoft.io)_
