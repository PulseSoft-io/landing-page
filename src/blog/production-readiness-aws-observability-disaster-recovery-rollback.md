---
title: "It Works" Is Not Production Ready
excerpt: It works does not mean production ready. Here's what senior AWS engineers actually check before calling infrastructure production.
author: Michael Emmanuel
date: May 25, 2026
readTime: 10 min read
coverImage: https://picsum.photos/seed/post-1/1200/700
---

# "It Works" Is Not Production Ready: What AWS Engineers Check Before Go-Live

## Introduction

I've been on the receiving end of a 3am page for a service that had been "working in production" for four months. The service was up. The health checks were green. The deployment pipeline had been running cleanly for weeks. What wasn't working was our ability to understand _why_ latency had tripled, _how_ to roll back safely without losing the queue messages in flight, and _what_ the runbook said to do — because there was no runbook.

Production readiness is the gap between "it deploys without errors" and "it behaves predictably under load, failure, and change." That gap contains four things most cloud engineers don't build until they've been burned by not having them: observability, disaster recovery, rollback strategy, and operational documentation. Each one looks like overhead until the moment it isn't. This post covers what production readiness actually looks like in AWS, where teams consistently cut corners, and what the specific failure modes are when each piece is missing.

---

## The Gap Between Functional and Production-Ready

A service that passes integration tests and deploys cleanly to a production environment is not a production-ready service. It's a service that has passed the minimum bar for existence. The additional bar — production readiness — is about how the service behaves when something goes wrong that wasn't anticipated during development.

The gap matters because failure in production is not binary. It's not "the service is up" or "the service is down." It's "the service is responding but p99 latency is 4 seconds and we don't know why," or "the deployment rolled out and three hours later we noticed error rates on one specific endpoint went from 0.1% to 12%," or "the primary database failed over and the application reconnected but the connection pool is exhausted and we need to restart the service but we're not sure if we'll lose in-flight transactions."

Each of those scenarios requires a different response. And in each case, the time it takes to diagnose and recover is determined almost entirely by the infrastructure that exists around the service — the metrics, the logs, the alarms, the runbooks, the backup configuration — not by the service code itself.

The most common failure pattern I see is what I'd call the **launch cliff**: a team does heroic work getting a service deployed, clears the sprint board, calls it done, and moves to the next feature. The operational infrastructure — CloudWatch alarms, structured logging, backup policies, deployment runbooks — was always going to be "the next ticket." It stays a ticket until there's an incident, at which point it gets built reactively under pressure rather than proactively with time to think.

Building production readiness reactively is always more expensive than building it proactively, in exactly the same way that fixing a bug in production costs more than fixing it in code review. The difference is that a production incident has a blast radius measured in customer impact and on-call engineer hours, not just engineering time.

---

## AWS Deep Dive: The Four Pillars of Production Readiness

### Observability: Knowing What Your System Is Actually Doing

Observability in AWS is not the same as monitoring. Monitoring tells you when a metric crosses a threshold. Observability tells you _why_ the metric crossed it. The difference is the difference between an alarm that fires and a system you can reason about under pressure.

The minimum viable observability stack for an ECS service on AWS:

**Structured logging to CloudWatch Logs.** Not unstructured strings — JSON with consistent fields including `service_name`, `environment`, `trace_id`, `request_id`, `user_id` (when applicable), `duration_ms`, and `status_code`. Structured logs are queryable with CloudWatch Logs Insights. Unstructured logs are grep targets, and grep doesn't scale when you have 50GB of logs from a multi-container service.

```json
{
  "timestamp": "2025-01-14T03:42:17.432Z",
  "level": "ERROR",
  "service": "payments-api",
  "environment": "prod",
  "trace_id": "1-5f84c4a2-0a2f3c1b4d5e6f7a8b9c0d1e",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Payment processor timeout",
  "duration_ms": 5043,
  "status_code": 504,
  "upstream": "stripe-api"
}
```

**CloudWatch metrics with meaningful dimensions.** The default ECS metrics (CPU utilization, memory utilization) are necessary but not sufficient. Instrument your application to emit custom metrics for business-relevant signals: payment success rate, queue depth, cache hit ratio, external API error rate. Use metric dimensions to slice by environment, service version, and AZ.

**CloudWatch alarms on the right signals.** CPU at 90% is a lagging indicator. It tells you the system is already in trouble. Better alarms are on p99 latency crossing SLA thresholds, error rate exceeding a baseline percentage, queue depth growing beyond a threshold that implies consumer starvation, and connection pool saturation. These are leading indicators.

One non-obvious AWS behavior: CloudWatch alarms on metrics with insufficient data default to `INSUFFICIENT_DATA` state, not `OK`. If your alarm evaluation period is 5 minutes and your service stops emitting the metric entirely — because it crashed — the alarm will enter `INSUFFICIENT_DATA`, not `ALARM`. For critical health signals, add a separate alarm specifically for metric data gaps using the `TreatMissingData` configuration set to `breaching`.

```hcl
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.service_name}-${var.environment}-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ErrorRate"
  namespace           = "Custom/${var.service_name}"
  period              = 60
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "API error rate exceeded 5% for 2 consecutive minutes"
  treat_missing_data  = "breaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
```

### Disaster Recovery: The Questions You Need to Answer Before You Need Them

Disaster recovery in AWS is not a configuration you apply — it's a set of questions you answer before an incident forces you to answer them under pressure. The two most important: what is your Recovery Time Objective (RTO) and your Recovery Point Objective (RPO)?

RTO is how long the system can be down before the business impact becomes unacceptable. RPO is how much data loss is tolerable — measured in time. An e-commerce platform might have an RTO of 15 minutes and an RPO of 5 minutes. A batch reporting system might have an RTO of 4 hours and an RPO of 24 hours. These numbers determine the entire DR architecture. Without them, you're building backup infrastructure without knowing what you need it to do.

For RDS, the DR configuration follows directly from RPO:

- **Automated backups** have a default retention of 7 days (configurable to 35). Point-in-time recovery is possible to within 5 minutes of the retention window. Restoring to a point in time creates a _new_ DB instance — it does not restore in place. Add that to your RTO estimate.
- **Multi-AZ** provides automatic failover within a region with ~60-120 second failover time (verify current AWS documentation). This is an HA mechanism, not a DR mechanism. It protects against AZ failure, not regional failure.
- **Read replicas promoted to standalone instances** are the manual DR path for cross-region recovery. The lag at promotion time is your data loss. Know what your replication lag is under normal load.
- **AWS Backup** for cross-account and cross-region backup copies, with vault lock for tamper-resistant retention in regulated environments.

The test that most teams skip: actually restoring from backup. A backup you've never restored is a backup you don't have. Schedule quarterly restore drills, document the restore procedure, and measure actual RTO against the target. The number is always longer than the estimate until you've measured it.

### Rollback Strategy: The Deployment That Goes Wrong

Deployment rollback is not the same as deployment undo. An undo assumes the state before the deployment is still clean and recoverable. A rollback is a forward operation — you're deploying a known-good version while the bad version is live and potentially affecting customers.

For ECS services, the rollback model is a new deployment of the previous task definition revision:

```bash
# Get the previous task definition revision
PREVIOUS_REVISION=$(aws ecs describe-task-definition \
  --task-definition payments-api \
  --query 'taskDefinition.revision' \
  --output text)
ROLLBACK_REVISION=$((PREVIOUS_REVISION - 1))

# Update the service to the previous revision
aws ecs update-service \
  --cluster prod-cluster \
  --service payments-api \
  --task-definition payments-api:${ROLLBACK_REVISION} \
  --force-new-deployment
```

This works for stateless services. The complication is state: database migrations that ran with the new deployment may be incompatible with the previous version of the application code. If your deployment included a schema migration that added a non-nullable column, rolling back the application code without reversing the migration means the old code is running against a schema it doesn't understand.

The solution is backward-compatible migrations as a deployment prerequisite: every schema change must be compatible with both the current version and the previous version of the application. New columns get a default value or are nullable. Old columns get deprecated rather than immediately dropped. This requires a multi-phase migration strategy but is the only way to preserve safe rollback capability across schema-changing deployments.

One deployment pattern that makes rollback implicit: blue-green deployments with weighted routing via ALB target groups. You deploy green alongside blue, shift 10% of traffic to green, validate, shift to 100%. Rolling back is changing the weight back to 100% blue — a two-second ALB configuration change, not a new deployment cycle.

---

## Tradeoffs & Decision Framework

Not every service needs the same production readiness investment. The right level depends on the service's blast radius, its SLA commitments, and the operational maturity of the team maintaining it.

**Internal tooling and low-traffic services:**
Structured logging and a basic error rate alarm are probably sufficient. Full DR planning, blue-green deployments, and quarterly restore drills are overhead that isn't proportional to the risk. Basic backup with a weekly manual restore check is appropriate.

**Customer-facing services with defined SLAs:**
This is where the full observability stack, multi-AZ deployment, and defined rollback procedures are non-negotiable. The cost of a 2-hour outage — customer trust, SLA credits, engineering distraction — almost always exceeds the cost of the production readiness investment.

**Services handling sensitive or regulated data:**
DR planning must include cross-region and cross-account backup copies. AWS Backup vault lock for WORM-compliant retention. CloudTrail and Config for audit trails. The RTO and RPO targets here are driven by regulatory requirements, not business preference, and must be contractually documented.

**The runbook question every team skips:**
For any service in the second or third category, answer this before launch: if the engineer who built this service is unreachable and something goes wrong at 2am, can a different engineer on the team diagnose and respond without prior knowledge of the service? If the answer is no, the runbook doesn't exist yet and the service is not production-ready. The runbook is not optional documentation. It is the last line of defense between a recoverable incident and a prolonged outage.

---

## Lessons From the Field

**1. A CloudWatch alarm that goes to an SNS topic nobody monitors is not an alarm — it's an audit artifact.**
Inherited a production environment with 43 CloudWatch alarms, all routing to an SNS topic connected to an old email distribution list that nobody had checked in six months. Three of the alarms had been in `ALARM` state for weeks. The system was "working" in the sense that the service was up. It was not working in the sense that anyone knew what was happening inside it.

**2. The first restore from backup is always the one that reveals the backup was incomplete.**
At a healthtech client, we discovered during a planned DR drill that the automated RDS snapshots were being taken but the parameter group and option group configurations were not included in the restore procedure. The restored instance came up with default parameter group settings — different max connections, different slow query log threshold, different innodb buffer pool size. The database "worked" but performed completely differently than production. Document and test the full restore procedure, not just the snapshot restore step.

**3. Blue-green deployments feel like overhead until the first bad deploy saves you from yourself.**
Pushed a configuration change to a production ECS service that silently broke a dependency on a third-party API. The change passed all unit tests. The integration test environment didn't have the third-party credential configured. With blue-green, shifting back to 100% of the old target group took seven seconds. Without it, we would have been looking at a 4-minute ECS deployment cycle — with potentially dozens of failed requests in the interim.

**4. An RTO target that has never been measured is not an RTO target — it's a guess.**
Ran a DR drill for a fintech client who had documented an RTO of 30 minutes for their primary trading system. Actual restore time from RDS point-in-time recovery: 47 minutes, not counting application warm-up and dependent service reconnection. The target was aspirational, not measured. They had been reporting a 30-minute RTO to their risk committee for two years based on nothing. Measure the actual number. Then engineer toward it.

**5. Runbooks written by the person who built the system are often written for the person who built the system.**
Reviewed a runbook for a payment processing service where step 3 read "check the usual dashboards." No link. No dashboard name. No description of what "usual" meant or what to look for. The runbook was written by someone for whom all of that context was implicit. Runbooks need to be written for an engineer who has never seen the service — and ideally reviewed by one before they're considered complete.

---

## Final Thoughts

The production readiness gap is closing in the industry, but slowly. Platform engineering is making structured logging and basic observability easier to adopt by default. AWS is improving tooling for deployment safety — ECS circuit breakers, CodeDeploy blue-green integration, Application Auto Scaling with predictive scaling — that makes some of this infrastructure easier to configure correctly.

But the tooling doesn't solve the judgment problem. Knowing which alarms matter for your service, which metrics are leading indicators vs. lagging ones, what your actual RTO is vs. what you've estimated, and whether your on-call engineer could operate your service without you — these require deliberate thought about what it means for a service to be production-ready, not just deployable.

The teams that close the gap do it the same way every time: they treat production readiness as a first-class milestone with specific, checkable criteria, not a category of "nice to haves" that accumulates in the backlog. They review it before launch, not after the first incident.

That's the standard we hold every engagement to at PulseSoft. If you're building or inheriting cloud infrastructure and want to know what production-ready actually looks like for your specific system, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **"It works" and "production-ready" are different standards.** A service that deploys without errors has passed the minimum bar for existence. Production readiness is about how the service behaves under load, failure, and change — and whether the team can respond effectively when it doesn't.
- **CloudWatch alarms on `TreatMissingData: breaching` catch the failure mode where a service stops emitting metrics entirely** — because it crashed. Default behavior is `INSUFFICIENT_DATA`, not `ALARM`. For critical health signals, missing data should be treated as an alarm condition.
- **A backup you've never restored is a backup you don't have.** Schedule quarterly restore drills, measure actual restore time against your RTO target, and document the full procedure — including parameter groups, configuration, and dependent service reconnection — not just the snapshot restore step.
- **Database rollback requires backward-compatible migrations as a prerequisite.** Any schema change incompatible with the previous version of the application code eliminates safe rollback capability. New columns must be nullable or have defaults; old columns must be deprecated, not immediately dropped.
- **Blue-green deployments make rollback a routing change, not a deployment cycle.** Shifting from green back to blue via ALB weighted target groups takes seconds. A re-deploy of the previous ECS task definition revision takes minutes — during which bad traffic is still live.
- **RTO targets that have never been measured are guesses.** Measure actual restore time from backup for every critical service. The number is almost always longer than the estimate, and the gap reveals which steps in the recovery procedure need engineering attention.
- **Runbooks written by the person who built the system are written for the person who built the system.** Review runbooks with an engineer who has no prior knowledge of the service. If they can follow the procedure to a correct resolution without asking questions, the runbook is production-ready. If not, it isn't.
