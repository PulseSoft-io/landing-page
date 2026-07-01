---
title: The First Question I Ask Before Designing Any Cloud Infrastructure
excerpt: Before you pick a single AWS service, ask this one question. Here's the business-first framework senior cloud architects use to avoid expensive rebuilds.
author: Michael Emmanuel
date: June 15, 2026
readTime: 10 min read
coverImage: https://picsum.photos/seed/post-1/1200/700
---

# The First Question I Ask Before Designing Any Cloud Infrastructure

## Introduction

Before I open the AWS console, before I sketch a VPC diagram, before anyone mentions Fargate vs. EC2 — I ask one question: **What is this system actually supposed to do for the business?**

That question has saved clients more money, prevented more 3am pages, and avoided more costly architectural rebuilds than any technical checklist I've ever followed. It sounds obvious. It almost never happens in practice.

Most cloud infrastructure engagements I've walked into start the same way: someone has already chosen services. There's a Terraform module half-written, a Confluence page with an architecture diagram, and a Slack channel called `#platform-migration`. What there isn't — almost ever — is a documented answer to why any of it was designed the way it was. The business logic got skipped. The infrastructure got built. And six months later, we're having a very expensive conversation about why the system can't scale or why the bill tripled.

This post is about the discipline of cloud infrastructure design requirements gathering — what to ask, who to ask it to, and how the answers should actually drive your AWS service choices.

---

## Why Engineers Skip Requirements and Go Straight to Architecture

It's not laziness. It's pattern matching. Senior engineers have solved similar problems before — they recognize the shape of a thing and reach for the tool that worked last time. Someone says "we need to process events in near-real-time" and your brain goes immediately to SQS → Lambda. Someone says "we need to run containers" and you're already thinking ECS vs. EKS before they've finished the sentence.

The problem is that cloud infrastructure decisions compound. The choice you make on day one — about whether to use a single AWS account or a multi-account org, about whether to go serverless or container-based, about whether your primary durability mechanism is RDS Multi-AZ or Aurora Global — those decisions shape everything that comes after them. Refactoring a VPC design after you've stood up 40 subnets across 3 AZs and have production traffic running through it is not a project. It's a crisis.

The most common failure mode I see is **performance-first design for a cost-sensitive workload**. A team inherits a flat, single-account AWS environment with everything in one VPC and decides to rebuild it "the right way." They land on a multi-account Landing Zone with Transit Gateway, AWS Control Tower, centralized logging to a Security account, and a full hub-and-spoke network topology. It's architecturally sound. It's also three months of work and a $40k annual infrastructure increase for a startup that processes 200 orders a day.

The architecture wasn't wrong. The requirements never got asked.

---

## AWS Deep Dive: How Business Requirements Map to Specific Service Choices

Requirements gathering isn't a soft skill exercise. The answers to specific business questions directly determine which AWS services you should — and shouldn't — use. Let me walk through how this works in practice.

### Traffic Pattern and Latency Requirements → Compute and Load Balancing Choices

The first thing I need to understand is the shape of the traffic: Is it spiky or constant? Is latency in the tens of milliseconds acceptable, or are we talking sub-5ms? Is this HTTP/HTTPS or does the workload use custom TCP/UDP protocols?

These aren't abstract questions. They determine your entire compute layer:

- **Spiky, latency-tolerant workloads** (async processing, batch jobs, report generation): Lambda with SQS is almost always the right answer. You pay for execution time only, scale to zero, and SQS provides the buffer for demand spikes. Setting `maxReceiveCount` on your Dead Letter Queue from day one matters more than people realize — I've seen Lambda functions silently drop poison-pill messages for weeks because nobody configured the DLQ.
- **Steady, latency-sensitive HTTP workloads** (APIs, web apps): ECS Fargate or EC2 Auto Scaling Groups behind an ALB. ALB gives you path-based routing, sticky sessions, and native integration with WAF and Cognito. If you need to preserve client IP at layer 4 (common for compliance workloads that need to log originating IPs), ALB won't cut it — you want NLB, which operates at layer 4 and passes the source IP through.
- **Sub-millisecond UDP or custom TCP protocols** (gaming, financial tick data, VoIP): NLB is the only answer. ALB adds HTTP processing overhead that will blow your latency budget.

A gotcha that costs people real money: ALBs charge per LCU (Load Balancer Capacity Unit) per hour, which factors in new connections, active connections, processed bytes, and rule evaluations. If your application has a lot of rule complexity — dozens of listener rules with header-based routing — you will pay more than you expect, even at moderate traffic volumes. Verify current pricing at [aws.amazon.com/elasticloadbalancing/pricing](https://aws.amazon.com/elasticloadbalancing/pricing) before committing.

### Data Durability and Recovery Requirements → Database and Storage Architecture

This is where I see the most mismatch between what the business actually needs and what gets built.

Ask the business: **What's your Recovery Point Objective (RPO) and Recovery Time Objective (RTO)?** Most product managers don't know these terms. Rephrase it: "If we lost all the data created in the last hour, could we recover it from another source? How long can the system be completely down before it costs us money or damages customer trust?"

The answers drive dramatically different architectures:

| Business Answer              | Architecture Implication                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| RPO: 24 hours, RTO: 4 hours  | RDS with automated backups, single-AZ acceptable                                                         |
| RPO: 1 hour, RTO: 30 minutes | RDS Multi-AZ with read replicas, point-in-time recovery enabled                                          |
| RPO: near-zero, RTO: seconds | Aurora Global Database with a secondary region, or DynamoDB Global Tables                                |
| RPO: zero, RTO: zero         | You're now talking about active-active, and you need to have a harder conversation about what that costs |

Aurora Global Database gives you a secondary region with replication lag typically under a second — but the failover is not automatic by default. You must promote the secondary cluster manually or use the Aurora Global Database planned failover API. Teams assume it's like Multi-AZ where failover is automatic. It is not. Build and test that runbook before you're in an incident.

One configuration decision I always bake in from the start: **RDS deletion protection and final snapshot**. It costs nothing to enable. I've seen production databases dropped by Terraform `destroy` runs that weren't properly scoped. Enable deletion protection on any database that holds data you can't afford to lose:

```bash
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --deletion-protection \
  --apply-immediately
```

### Compliance and Security Posture → Account Structure and Network Design

If the business is operating in a regulated industry — healthcare, fintech, government — that answer alone rewrites your entire architecture plan.

HIPAA and PCI workloads need environment isolation that you cannot achieve in a flat single-account structure. You need separate AWS accounts for production, staging, and development, at minimum. You need AWS Config rules enforcing your compliance baseline. You likely need GuardDuty, Security Hub, and CloudTrail logs centralized into a dedicated Security account that developers cannot modify.

This is why the compliance question must come before you touch an account. Retrofitting a multi-account AWS Organizations structure onto a workload that was built in a single account is a multi-month project. Service Control Policies (SCPs) need to be applied carefully to avoid breaking existing IAM permissions. Resource-based policies may reference account IDs that need updating. S3 bucket policies, KMS key policies, and cross-account IAM roles all need audit and remediation.

The non-obvious AWS behavior here: when you apply an SCP to an OU that contains your root account's member accounts, that SCP cannot be overridden by any IAM policy in those accounts — including admin IAM users. An SCP that denies `ec2:RunInstances` in certain regions will block even a `arn:aws:iam::123456789012:root` principal. Get your SCPs wrong and you can lock yourself out of entire accounts.

---

## Tradeoffs and Decision Framework

Once requirements are clear, the real architectural tension becomes visible. Here's the honest version of the tradeoffs I use to drive decisions.

**Operational simplicity vs. architectural purity.** A three-tier VPC with public, private, and data subnets across three AZs is the right answer for most production workloads — but it's not the right answer for a five-person startup that needs to ship fast and has one part-time DevOps engineer. Sometimes the right call is a single-AZ deployment with automated backups, with a plan to expand once product-market fit is confirmed. Choosing the "correct" architecture for a team that can't operate it is not good architecture.

**Serverless simplicity vs. container predictability.** Lambda is operationally simple until it isn't. Cold start latency, 15-minute execution limits, ephemeral storage capped at 512MB (expandable to 10GB but with tradeoffs), and the observability gap in distributed Lambda-based architectures are real constraints. For workloads that need sub-second cold starts, consistent execution environments, or long-running jobs, Fargate is often more predictable despite the higher baseline cost. The right choice depends entirely on traffic shape, latency requirements, and team familiarity — not on what's "modern."

**Multi-region resilience vs. cost and complexity.** Active-active multi-region is one of the most misunderstood patterns in cloud architecture. It is appropriate for a small number of workloads: those with genuine global user bases requiring sub-50ms latency everywhere, or those with RTO/RPO requirements that simply cannot be met by a single region. For most workloads, a well-designed single-region architecture with automated failover to a warm standby is sufficient and dramatically simpler to operate. Before you add a second region, make sure you can operate one region well.

---

## Lessons from the Field

**1. Compliance answers should come before naming a single service.** On a fintech engagement, we spent two weeks prototyping a Kinesis + Lambda event pipeline before someone finally looped in their legal team. The workload touched PCI card data. We scrapped the design and rebuilt around an isolated VPC with no internet gateway, PrivateLink for AWS service access, and field-level encryption before it hit the stream. The two weeks weren't wasted — but they didn't need to happen.

**2. The question nobody asks: who owns this at 2am?** On an engagement where I inherited a heavily Lambda-based microservices architecture, the original builders had long since left. The on-call engineer couldn't trace a single failed transaction through six Lambda functions and three SQS queues without spending 30 minutes in CloudWatch Logs Insights writing queries. We added X-Ray tracing retroactively, but the operational model should have been designed for the team's debugging skills, not the architect's.

**3. Cost constraints eliminate entire service categories.** A client told us their AWS budget was $3,000/month. That single constraint removed Aurora, Fargate, and NAT Gateway from serious consideration for their primary architecture. RDS PostgreSQL on a db.t3.medium with a single NAT instance (yes, an instance, not a gateway) and EC2 on Spot got them to production within budget. Understanding the constraint before designing saved two weeks of rework.

**4. "We'll start simple and scale later" almost never works for networking.** VPC CIDR ranges are permanent. A /24 that you picked because you assumed you'd never need more than 250 IPs will constrain you the moment you want to peer with a customer VPC that overlaps it, or the moment you need to add more subnets per AZ for EKS node groups. Start with at least a /16 per VPC and plan your subnet sizing before you allocate anything.

**5. The right architecture for the current team is better than the optimal architecture for an imaginary future team.** I've seen Kubernetes clusters deployed by teams of four engineers who spent more time managing the control plane than building product. ECS with Fargate and a simple deployment pipeline would have shipped more features. Architecture that outpaces operational capability creates risk, not resilience.

---

## Final Thoughts

The business requirements conversation is not a project management formality. It's the most technically consequential thing you do before touching the AWS console — because every answer constrains or enables a specific set of architectural decisions. Get it wrong upfront and you're either rebuilding the system in six months or operating one that's chronically misaligned with what the business actually needs.

The teams that consistently avoid the expensive rebuilds aren't necessarily more technically skilled. They're more disciplined about asking uncomfortable questions early: Who's on-call? What's the real budget? What happens if this goes down on a Friday night? Those answers are unglamorous. They're also the difference between an architecture that holds under pressure and one that becomes a case study in what not to do.

This discipline — starting with business requirements before opening the console — is the foundation of how we work at PulseSoft. If you're planning a cloud migration, a greenfield build, or an architecture review and want someone who's done this before, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **Business requirements aren't pre-work — they're architecture inputs.** RPO/RTO, compliance posture, traffic shape, and team operational capability each directly eliminate or mandate specific AWS services before you write a line of Terraform.
- **Compliance questions must come before service selection.** A HIPAA or PCI workload discovered mid-build means scrapping architecture, not patching it. Ask before you prototype.
- **ALB vs. NLB isn't a preference — it's determined by protocol and latency requirements.** ALB for HTTP/HTTPS with complex routing; NLB for TCP/UDP, sub-millisecond latency, or source IP preservation. Know which situation you're in before you provision.
- **Aurora Global Database failover is not automatic by default.** Teams assume active-passive failover is handled for them. It isn't. Test your promotion runbook in a non-production environment before you need it in an incident.
- **VPC CIDR ranges are permanent.** Start with a /16, plan your subnet structure before allocation, and document your addressing scheme. Retroactively fixing CIDR conflicts in a peered environment is painful and expensive.
- **The right architecture is the one your team can operate, not the one that looks best on a whiteboard.** Complexity that exceeds operational capability creates fragility, not resilience.
- **Enable RDS deletion protection on every database that matters.** It is free, it prevents accidents, and every DBA who has ever been in an incident caused by an accidental `terraform destroy` will tell you the same thing.
