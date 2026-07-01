---
title: Benefits of Simplified AWS Infrastructure
excerpt: Complex cloud architectures break in complex ways. Here's how simplifying AWS infrastructure actually improves uptime, cuts costs, and reduces on-call burden.
author: Michael Emmanuel
date: June 1, 2026
readTime: 11 min read
coverImage: https://picsum.photos/seed/post-1/1200/700
---

# The Most Reliable AWS Architectures I've Seen Are Also the Simplest

## Introduction

The highest-uptime production environment I've ever worked on ran six ECS services, one RDS instance, one ElastiCache cluster, and an ALB. No service mesh. No event bus. No distributed tracing pipeline. No custom metrics aggregation layer. The team had four engineers. Their incident rate over eighteen months was two P2s and zero P1s.

The most complex environment I've ever inherited had forty-three microservices, a self-managed Kafka cluster, a service mesh running on EKS, four different observability tools, and a custom-built deployment orchestration layer written by an engineer who had since left the company. They had a P1 incident roughly every three weeks.

Cloud architecture complexity is one of the most persistent sources of operational pain in the industry — and one of the most underacknowledged. This post is about what complexity actually costs in AWS environments, how it accumulates invisibly, and where the simplification decisions deliver the most immediate return in uptime and operational overhead.

---

## How Complexity Accumulates and Why It's Hard to See

Architectural complexity almost never arrives as a single decision. It accumulates through a series of individually reasonable choices that compound into a system nobody fully understands.

The pattern starts with a genuinely good instinct — "we should decouple these services so they can scale independently" — and produces a decision that's technically sound in isolation: add an SQS queue between two services. Then the same instinct, applied again: add SNS to fan out to multiple consumers. Then an event-driven workflow manager to coordinate multi-step processes. Then a dead-letter queue for each queue. Then CloudWatch alarms on each DLQ. Then a Lambda to process DLQ messages automatically. Then a monitoring dashboard for the Lambda error rate.

You now have eight distinct components where you had two services talking directly to each other. Each component has its own failure modes, its own configuration, its own cost line, and its own requirement for someone on the team to understand it under pressure. The original decoupling instinct was right. The compounding of that instinct across a dozen decisions without ever stepping back to count the total components is where complexity becomes a liability.

The invisible cost is what I call **the minimum operational intelligence requirement**: the amount of system knowledge an on-call engineer must carry to diagnose and resolve an incident without external help. In a simple system, that number is low. A new engineer can hold the entire data flow in their head after a day of onboarding. In a complex system, it grows without bound. No single engineer knows everything. Incidents require multiple people. Diagnosis time extends. MTTR climbs.

The concrete failure mode that makes this tangible: a media company I worked with had a content ingestion pipeline with eleven distinct Lambda functions chained together via SQS queues. When a malformed payload hit the pipeline, it propagated through four of those functions before producing an error, each passing the payload to the next queue because the validation logic was in function five. The error surfaced in CloudWatch as a Lambda error in function five with no context about the origin. Tracing it back required understanding the entire pipeline topology — which nobody had documented — and correlating logs across eleven CloudWatch Log Groups with no shared trace ID.

A simpler pipeline — a single Lambda that validated input on receipt and rejected malformed payloads at the boundary — would have surfaced the error immediately, in one place, with one set of logs to examine. The complex version wasn't more reliable. It was less reliable and harder to debug when it failed.

---

## AWS Deep Dive: Where Simplification Delivers the Highest Return

### ECS Fargate vs. EKS: The Kubernetes Tax

The most consequential simplification decision for container workloads on AWS is whether to run ECS Fargate or EKS. The tooling and community around Kubernetes are compelling, and many engineers have strong Kubernetes experience. But the operational overhead gap between the two is significant and frequently underestimated.

EKS requires managing the control plane version (AWS manages the API server, but you're responsible for upgrading it — currently AWS supports three minor versions, and clusters on an unsupported version stop receiving security patches), managing node groups or Fargate profiles, managing add-ons (CoreDNS, kube-proxy, VPC CNI, all of which have independent version lifecycles and upgrade requirements), and managing the Kubernetes API surface that your applications interact with. That's before you configure RBAC, network policies, pod security standards, and whatever ingress controller you've chosen.

ECS Fargate has no control plane to manage. No node groups. No add-on upgrades. No Kubernetes API. You define task definitions, services, and the ALB integration. AWS manages the rest. The trade is capability for simplicity: ECS cannot do everything Kubernetes can. But for teams running fewer than twenty services with no requirement for custom scheduling, stateful workloads, or operator patterns, ECS Fargate delivers roughly equivalent capability at substantially lower operational overhead.

The non-obvious EKS gotcha that converts teams: managed node group upgrades. When you upgrade an EKS cluster, the control plane upgrades first. Your add-ons need to be updated to compatible versions. Then your managed node groups need to be updated. The update cordons and drains each node, then terminates it and replaces it with a new node running the updated AMI. If your pods have PodDisruptionBudgets that are too restrictive, nodes can stall during drain. If your application doesn't handle SIGTERM gracefully with a long enough termination grace period, requests in flight get dropped. An EKS minor version upgrade for a production cluster — done correctly — is a multi-hour operation that requires careful sequencing and validation at each step.

For a team of three whose primary job is not platform engineering, that's a quarterly tax on engineering time that delivers no user-facing value.

### Managed Services vs. Self-Managed: The Kafka Example

Self-managed Kafka on EC2 is a common source of complexity debt in AWS environments. Teams choose it for cost reasons — MSK (Amazon Managed Streaming for Apache Kafka) is more expensive than running equivalent EC2 instances — and inherit a set of operational responsibilities that the cost comparison doesn't include.

Self-managed Kafka requires: broker configuration management, JVM tuning, ZooKeeper (for older cluster versions) or KRaft controller management, storage provisioning and expansion, replication factor monitoring, consumer group lag alerting, broker rolling restarts for configuration changes, cluster expansion procedures, and certificate rotation for TLS-encrypted clusters. Each of these is a task that needs to exist in a runbook, get executed by someone with Kafka expertise, and get tested under failure conditions.

MSK shifts all of that to AWS. Broker provisioning, software patching, storage autoscaling (with MSK Serverless or by configuring broker storage with auto-expand), multi-AZ replication, and CloudWatch integration are managed. You retain control over topic configuration, retention policies, and consumer group management — the things that are actually workload-specific.

The break-even analysis changes when you count the operational cost honestly:

```
Self-managed Kafka (3-broker cluster, r6g.xlarge):
- EC2 cost: ~$650/month
- EBS storage (1TB per broker): ~$300/month
- Engineering time (conservative, 4 hrs/month maintenance): 4hrs × $150/hr loaded = $600/month
- Total: ~$1,550/month

MSK (3-broker cluster, kafka.m5.large):
- Broker cost: ~$730/month
- Storage (1TB per broker): ~$300/month
- Engineering time (monitoring only): ~$150/month
- Total: ~$1,180/month
```

Verify current pricing at the AWS pricing pages for your region — these figures are illustrative, not definitive. But the point holds: at realistic engineering cost, managed services frequently undercut self-managed on total cost of ownership, not just operational burden. The up-front infrastructure cost comparison misses the most expensive variable.

### Reducing Lambda Chain Complexity with Step Functions

For multi-step workflows, the instinct to chain Lambda functions via SQS is understandable. Each step is decoupled, each queue provides a buffer, and the pattern is easy to implement. The problem is debuggability, which degrades non-linearly with chain length.

AWS Step Functions is the right answer for multi-step workflows that currently live in Lambda chains. A Step Functions state machine makes the workflow topology explicit, observable in the AWS console, and debuggable at the execution level — you can see exactly which state failed, what the input and output were at each transition, and where a given execution is in the flow.

```json
{
  "Comment": "Content ingestion pipeline",
  "StartAt": "ValidatePayload",
  "States": {
    "ValidatePayload": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:validate-payload",
      "Next": "TransformContent",
      "Catch": [
        {
          "ErrorEquals": ["ValidationError"],
          "Next": "HandleValidationError"
        }
      ]
    },
    "TransformContent": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:transform-content",
      "Next": "PublishToS3"
    },
    "PublishToS3": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:publish-content",
      "End": true
    },
    "HandleValidationError": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:handle-error",
      "End": true
    }
  }
}
```

The Step Functions execution history gives you the full audit trail — input, output, and error for every state — without correlating logs across multiple CloudWatch Log Groups. The workflow is readable as a diagram in the console. New engineers can understand it without a tour from the original author.

The non-obvious Step Functions limit: Standard Workflows have a maximum duration of one year and charge per state transition (verify current pricing). Express Workflows run for a maximum of five minutes but have lower per-transition costs and are better suited for high-volume, short-duration workflows. Choosing the wrong type for a workload can produce unexpectedly high costs at scale or unexpected timeout errors for long-running processes.

---

## Tradeoffs & Decision Framework

Simplicity is not always right. The question is whether the complexity you're adding pays its operational cost.

**Complexity worth adding:**

- Multi-AZ and cross-region redundancy for services with defined availability SLAs. The operational overhead of managing failover is less expensive than the downtime you're preventing.
- Event-driven decoupling between services with genuinely different scaling profiles. If your ingestion layer receives 10,000 events per second and your processing layer can only handle 500/second sustainably, an SQS buffer is load-bearing, not decorative.
- A service mesh when you need fine-grained traffic control, mutual TLS between services, or circuit breaking at the network layer — and your team has the expertise to operate it.

**Complexity not worth adding:**

- Microservices decomposition for a team of five building a product still finding product-market fit. The seams you cut today will be wrong in six months, and each seam is a distributed system problem you now own.
- Self-managed stateful infrastructure (Kafka, Redis, Elasticsearch) when a managed equivalent exists and the cost delta is within an order of magnitude of the engineering time to operate it.
- Custom orchestration tooling when Step Functions, EventBridge, or SQS with Lambda solves the same problem with less code surface area to maintain.

**The test I apply before adding any new architectural component:**
Can I explain in one sentence what breaks if this component fails and how we detect it? If the answer requires a paragraph, the component is adding complexity faster than it's adding value. If the answer is "I'm not sure," the component is definitely adding complexity faster than it's adding value.

---

## Lessons From the Field

**1. The most common source of unnecessary complexity I've encountered is cargo-culting architectures from companies at 100x the relevant scale.**
Worked with a startup whose engineering team had come from a large tech company and replicated the event-driven microservices architecture they were familiar with. Twelve services on EKS, Kafka for event streaming, a custom service registry. Monthly AWS bill: $18,000. Monthly revenue: $40,000. Consolidated to four services on ECS Fargate with SQS for the two genuinely async workflows. Monthly AWS bill: $3,200. Incident rate dropped by 70%.

**2. Every self-managed database I've inherited has at least one maintenance procedure that has never been tested.**
At a growth-stage SaaS company running self-managed Elasticsearch on EC2, I discovered the cluster expansion procedure — documented in a Confluence page — had last been executed fourteen months prior and referenced an AMI that no longer existed. The person who wrote it had left the company. Migrated to OpenSearch Service (Amazon's managed Elasticsearch fork). The migration took a week. The operational burden reduction was immediate and permanent.

**3. Deleting infrastructure is an underrated engineering contribution.**
In a past engagement, my highest-value change in the first month was removing a custom metrics aggregation Lambda that was collecting CloudWatch metrics, transforming them, and writing them back to a different CloudWatch namespace. The original purpose was lost to institutional memory. Nobody on the team could explain what it was for. It was processing 4 million invocations per month at non-trivial cost. Removal took an afternoon. No alerts fired. No functionality changed. The complexity had been entirely decorative.

**4. Distributed systems problems scale with the number of network hops.**
Diagnosed a latency regression for an e-commerce client whose checkout flow made seven synchronous API calls across five internal services before returning a response. Adding 20ms of latency to any one service added 20ms to every checkout. The solution wasn't optimizing the slow service — it was collapsing three of the five services into one, reducing the network hops and the blast radius of any single slow dependency. Median checkout latency dropped by 40%.

---

## Final Thoughts

The industry pendulum on cloud architecture complexity has swung hard in both directions. The "microservices everything" era produced systems with dozens of services, rich distributed system problems, and operational teams running at capacity managing infrastructure that was sophisticated enough to demand constant attention. The backlash — "just use a monolith" — is equally overcorrected.

The actual principle isn't "simple over complex" as a rule. It's "earn your complexity." Every component you add to an architecture increases the minimum operational intelligence your team needs to carry. Every managed service you replace with a self-managed equivalent adds maintenance procedures to your runbook. Every service boundary you introduce creates a network call that can fail. These costs are real, and they compound.

The teams that operate the most reliably are not the teams with the simplest possible architectures. They're the teams that have been deliberate about which complexity they've accepted and why, and ruthless about removing complexity that doesn't pay back in capability or reliability.

That kind of architectural discipline — knowing when to add, when to remove, and how to make the tradeoff explicit — is what we bring to every engagement at PulseSoft. If your cloud architecture has grown more complex than your team can confidently operate, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **Cloud architecture complexity accumulates through individually reasonable decisions that compound into systems nobody fully understands.** The right question after each addition is not "does this work?" but "does this pay its operational cost?"
- **ECS Fargate vs. EKS is often a simplicity decision, not a capability decision.** For teams running fewer than twenty services with standard workload patterns, ECS Fargate delivers comparable capability at substantially lower operational overhead. EKS upgrade cycles alone are a recurring multi-hour operational tax that delivers no user-facing value.
- **The total cost of self-managed infrastructure includes engineering time, not just instance cost.** At realistic loaded engineering rates, MSK frequently undercuts self-managed Kafka on total cost of ownership. Run the full comparison before choosing self-managed for cost reasons.
- **Step Functions replaces Lambda chain complexity with observable, auditable workflow state** — without correlating logs across multiple CloudWatch Log Groups. Standard vs. Express Workflow selection matters: Standard supports up to one year duration, Express has a five-minute maximum with lower per-transition cost.
- **The test for whether complexity is worth adding:** can you explain in one sentence what breaks if the new component fails and how you detect it? If the answer requires a paragraph, the component is adding complexity faster than it's adding value.
- **Deleting infrastructure is a legitimate and undervalued engineering contribution.** Unused Lambda functions, orphaned queues, and decorative complexity cost money and inflate the operational surface area that your on-call team has to understand.
- **Latency in distributed systems scales with network hops.** Adding 20ms of p99 latency to one service in a synchronous seven-call chain adds 20ms to every request through that chain. Collapsing unnecessary service boundaries is often faster than optimizing the services themselves.
