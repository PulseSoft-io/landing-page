# Production Kubernetes on Amazon EKS: high-availability cluster design with zero-downtime node failure recovery

**Industry:** Digital health - patient engagement and virtual care platform
**Engineering org:** ~70 engineers across 5 product squads
**Previous infrastructure:** 10 microservices running on EC2 with Docker Compose
**Target architecture:** Amazon EKS across two availability zones with ALB, Auto Scaling, and IRSA
**Compliance context:** HIPAA — PHI workload isolation and least-privilege access
**Engagement duration:** 10 weeks
**Services:** Platform engineering, Kubernetes, cloud architecture, DevSecOps

---

## The challenge

The client had built a legitimately modern microservices architecture. Ten services, patient
portal, scheduling, provider dashboard, notifications, two EMR integration services, billing,
auth, analytics, and an internal admin surface, each had its own codebase, its own deployment
cadence, and its own team. The problem was not the application design. The problem was
everything underneath it.

All ten services ran as Docker containers on EC2 instances managed by hand. Deployments meant
SSHing into an instance, pulling the new image, and restarting the container, one service
at a time, one engineer at a time, with no rollback mechanism beyond "SSH back in and restart
the old image." Services that shared an EC2 instance shared fate: if the instance failed,
every container on it went down simultaneously. During a traffic spike, scaling meant filing
a Jira ticket for the platform team to launch new instances and manually redistribute
containers across them.

The on-call rotation was punishing. Any EC2 instance failure triggered a page. The engineer
on call would SSH in, assess which containers had gone down, and restart them in the correct
order, accounting for service dependencies. Mean time to recovery was tracked at 22 minutes.
It happened, on average, twice a month.

The IAM posture made this worse. Because IAM permissions in the previous architecture were
attached at the instance level, every container running on a given instance shared the same
IAM role. The billing service and the patient portal ran on the same instance and held
identical permissions, far broader than either required. For a HIPAA-covered workload
handling protected health information, this was not an acceptable risk surface.

What finally prompted the engagement was a capacity planning review ahead of a significant
customer expansion. The team was expecting to double active users within 12 months. The
current infrastructure could not absorb that growth without proportionate manual effort and
proportionate risk.

---

## Our approach

PulseSoft designed and built a production-grade Amazon EKS cluster spanning two availability
zones, with proper network segmentation, cluster-level autoscaling, and per-workload IAM
permissions via IAM Roles for Service Accounts. The design treated high availability and
least-privilege access as first-order requirements, not afterthoughts.

### VPC and network architecture

The foundation of the cluster is a purpose-built VPC with a /16 CIDR block
(10.0.0.0/16), large enough to accommodate growth across additional availability zones,
node groups, and services without requiring re-addressing.

The network is segmented into two tiers across two availability zones. Public subnets
(10.0.4.0/24 in AZ-A, 10.0.5.0/24 in AZ-B) host only the Application Load Balancer.
Nothing else carries a public IP. Private subnets (10.0.1.0/24 in AZ-A, 10.0.2.0/24
in AZ-B) host all EKS worker nodes. Inbound traffic reaches the ALB from the internet
via the Internet Gateway and is forwarded to pods in the private subnets, but no
worker node is directly reachable from the internet. This is the network isolation
posture that HIPAA workloads require, and it was absent in the previous EC2 architecture.

### Amazon EKS, managed control plane

Amazon EKS manages the Kubernetes control plane: the API server, etcd, controller
manager, and scheduler run on AWS-managed infrastructure, across multiple availability
zones by default. The client's platform team had previously considered self-managed
Kubernetes but ruled it out correctly, running etcd reliably is a non-trivial operational
burden that contributes nothing to the business. EKS removes that burden entirely, freeing
the platform team to focus on cluster configuration and workload operations rather than
control plane maintenance.

### Worker nodes: six nodes across two availability zones

The worker node group consists of six nodes evenly distributed across the two private
subnets, three in AZ-A (Private Subnet 1) and three in AZ-B (Private Subnet 2). This
distribution is the mechanism behind the cluster's high availability guarantee.

When a node fails, whether from an underlying hardware issue, an OS failure, or an
AWS EC2 instance retirement, Kubernetes detects the NotReady condition within seconds
and begins rescheduling the affected pods to healthy nodes in the same or the alternate
availability zone. Traffic continues flowing. No engineer is paged. The failure is
absorbed by the cluster automatically. This is not a theoretical property of the
design; it is the operational outcome the architecture was built to produce.

The two-AZ distribution also handles availability zone-level events: if AZ-A experiences
a service disruption, the three nodes and all rescheduled pods in AZ-B continue serving
traffic without interruption. The Application Load Balancer, which spans both public
subnets, routes around unhealthy targets automatically.

### Auto Scaling Group

All six worker nodes are managed by an EC2 Auto Scaling Group that spans both private
subnets. The Cluster Autoscaler, deployed as a pod within the cluster, monitors for
pending pods that cannot be scheduled due to insufficient node capacity. When demand
exceeds available node resources, the Cluster Autoscaler triggers the Auto Scaling
Group to launch additional nodes, which join the cluster and become schedulable within
a few minutes.

Conversely, when node utilization drops, after a traffic spike subsides, or after
a batch workload completes, the Cluster Autoscaler identifies underutilized nodes,
safely drains their pods to other nodes, and terminates them. The client no longer
files Jira tickets to scale infrastructure. The cluster scales itself.

### Application Load Balancer and ingress

The Application Load Balancer is deployed across the two public subnets in AZ-A and
AZ-B. The AWS Load Balancer Controller, running as a Kubernetes deployment within the
cluster, manages ALB listener rules and target group registration dynamically in
response to Kubernetes Ingress resource definitions. When a new service is deployed
and an Ingress resource is created, the controller provisions the corresponding ALB
routing rule automatically. There is no manual load balancer configuration.

HTTPS termination happens at the ALB. ACM certificates are managed automatically.
Traffic between the ALB and worker nodes travels over the private network within the VPC.

### IAM Roles for Service Accounts

The previous instance-level IAM model, where every container on an instance shared
the same role, was replaced with IAM Roles for Service Accounts (IRSA). Each of the
ten microservices is associated with a dedicated Kubernetes service account, and each
service account is annotated to assume a specific IAM role via OIDC federation with
the EKS cluster's identity provider.

The result is per-pod IAM permissions. The billing service holds exactly the IAM
permissions it needs, access to specific S3 buckets and DynamoDB tables relevant
to billing. The patient portal holds its permissions. Neither role includes anything
the other service requires. The permissions boundary that HIPAA's minimum necessary
standard requires is now enforced at the pod level, not approximated at the instance
level. Auditors reviewing IAM permissions for PHI access see ten distinct roles with
scoped permissions rather than two or three broad instance roles covering multiple
services.

### Architecture

![Amazon EKS cluster spanning two availability zones with ALB in public subnets, worker nodes in private subnets, Auto Scaling Group, and AWS IAM integration](/diagrams/eks-diagram.png)

_Users reach the application via the internet gateway and an Application Load Balancer
spanning public subnets in AZ-A (10.0.4.0/24) and AZ-B (10.0.5.0/24). Worker nodes
run in private subnets (10.0.1.0/24 and 10.0.2.0/24) across both AZs, managed by
an Auto Scaling Group. Amazon EKS controls pod scheduling across all six nodes.
AWS IAM provides per-workload permissions via IRSA._

---

## Results

The cluster has been in production for seven months. In that period, three EC2 worker
node failures have occurred, one in AZ-A and two in AZ-B. In all three cases, the
cluster rescheduled affected pods to healthy nodes without intervention. No engineer
was paged. The incidents appeared in CloudWatch logs and were reviewed the following
morning. Mean time to recovery for node failures, previously tracked at 22 minutes,
is now effectively zero for the failure modes the cluster handles automatically.

The on-call page rate for infrastructure incidents dropped 74% in the first quarter
post-launch compared to the same quarter the previous year. The remaining pages are
application-level issues, which is the correct scope for on-call engineering attention.

Deployments, previously SSH-based with no rollback capability, are now Kubernetes
rolling deployments with configurable surge and unavailable Pod thresholds. A failed
deployment rolls back automatically. The time from image push to production traffic
routing dropped from an average of 15 minutes per service to 3 minutes, and the
process requires no human involvement beyond the initial pipeline trigger.

IRSA eliminated the shared IAM role surface entirely. The HIPAA technical safeguard
review that had flagged instance-level IAM as a finding in the previous audit was
closed. Each service's IAM permissions are now documented, scoped, and reviewable
independently.

The cluster scaled through a 3.4x traffic spike during a product launch in the
engagement's second month without a single manual scaling intervention. The Cluster
Autoscaler added four nodes over 11 minutes as demand increased and removed them
over 40 minutes as traffic subsided.

---

## What our client said

> "We had a production incident every time an EC2 instance failed, someone got paged,
> SSHed in, figured out which containers had gone down, restarted them in the right
> order. We tracked MTTR at 22 minutes and it happened twice a month. Since the EKS
> migration, we've had three node failures. Nobody was paged. We found out the next
> morning in CloudWatch. That alone justified the entire engagement."
>
> - Director of Engineering, SaaS

---

## What this made possible

The most immediate change was to the on-call experience. Engineers who had been
spending meaningful on-call hours responding to infrastructure failures that were
entirely outside application code, instance failures, memory exhaustion on shared
hosts, deployment failures with no rollback, now spend that time on issues they
can actually fix. Kubernetes handles the infrastructure failure modes. Engineers
handle the application ones.

The second-order effect was on deployment confidence. When deployments are rolling,
health-checked, and automatically rolled back on failure, teams ship more frequently
and with less anxiety. In the six months following the go-live, average deployment
frequency across the ten services increased from 2.1 deploys per week to 6.8.
No incident was caused by a failed deployment in that period.

The third effect was organisational. With IAM permissions enforced at the workload
level via IRSA, the security and compliance review process for new services became
a documented, repeatable step, write the IAM policy, attach it to the service
account, have it reviewed in the PR. It is no longer a conversation about which
instance role to reuse and what blast radius that creates. Each service owns its
permissions, and those permissions are reviewable alongside its code.

The client's infrastructure can now absorb the user growth they were planning for
without proportionate manual effort. New services are deployed to the cluster, not
to manually provisioned instances. Scaling is a cluster configuration, not a
Jira ticket. The platform team that spent significant time on reactive instance
management now spends that time on cluster improvements and developer tooling.

---

_Running containers on EC2 without orchestration and looking for a Kubernetes migration
path that prioritises reliability over replatforming risk?
[Schedule an architecture review →](mailto:contact@pulsesoft.io)_
