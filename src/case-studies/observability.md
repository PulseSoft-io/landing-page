# Kubernetes-native observability: full-stack monitoring on Amazon EKS with Prometheus, Grafana, and Alertmanager

**Industry:** B2B SaaS — e-commerce operations and logistics platform
**Engineering org:** ~80 engineers, SRE team of 3
**Previous monitoring:** AWS CloudWatch (node-level only)
**Target:** Prometheus, Grafana, and Alertmanager deployed on EKS with optional CloudWatch remote write
**Engagement duration:** 6 weeks
**Services:** Platform engineering, observability, DevSecOps

---

## The challenge

The client ran a logistics and fulfilment SaaS platform processing time-sensitive orders
for over 200 retail customers. Their EKS cluster hosted 14 microservices, order ingestion,
inventory sync, routing, carrier integrations, notification dispatch, and several others,
each with its own performance characteristics and failure modes. Across all of them, the
engineering team had exactly one source of monitoring data: AWS CloudWatch, configured
at the EC2 node level.

CloudWatch told them whether a node's CPU was high. It told them almost nothing else.

It could not tell them which pods were consuming that CPU. It could not tell them whether
a specific microservice's error rate had risen above acceptable thresholds. It could not
tell them that a container had been OOM-killed and restarted four times in the last hour.
It could not correlate a spike in request latency on the carrier integration service with
a node saturation event happening simultaneously on the same worker node. For a platform
where a 10-minute processing delay could cause a missed delivery window and a customer
penalty clause, this level of blindness was a significant operational liability.

The alerting situation compounded the problem. The team had configured 140 CloudWatch
alarms over two years, most inherited from previous engineers, many tuned to thresholds
that no longer reflected the application's actual baseline. On a typical weekday, the
alarm notification channel received between 40 and 80 messages. Engineers had learned to
scan the channel rather than read it. The signal-to-noise ratio was so poor that three
production incidents in the previous six months had been reported first by customers,
not by the team's own alerting.

The SRE team's incident response process had adapted to the available tools in ways that
were unsustainable. When an incident was reported, the on-call engineer would open
CloudWatch, pull up node metrics, open a separate terminal to run kubectl describe and
kubectl logs, cross-reference timestamps manually, and gradually build a picture of
what had happened and where. The average time from incident detection to root cause
identification was 35 minutes. In a logistics context, 35 minutes is meaningful lost
throughput.

When the team began planning for a 40% user growth target and a new enterprise customer
tier with contractual SLA requirements, it became clear that their monitoring posture
was not compatible with either goal.

---

## Our approach

PulseSoft designed and deployed a Kubernetes-native observability stack built on
Prometheus, Grafana, and Alertmanager, running inside the EKS cluster itself, scraping
metrics from every layer of the infrastructure, and routing alerts through a tiered
notification system that distinguished urgent from informational before it reached
an engineer's attention. An optional remote write path to AWS CloudWatch was implemented
to preserve long-term metric retention and maintain compatibility with existing AWS-native
tooling the team used for capacity planning.

### Prometheus Node Exporter, host-level metrics at cluster scale

Prometheus Node Exporter is deployed as a Kubernetes DaemonSet, which ensures exactly
one exporter instance runs on every worker node in the cluster, automatically, including
nodes added by the Cluster Autoscaler. The Node Exporter exposes approximately 1,000
host-level metrics per node: CPU utilisation broken down by mode, memory consumption
and pressure, disk I/O per device, network bytes in and out per interface, file descriptor
counts, and load average.

This immediately filled the largest gap in the existing monitoring coverage. The team
had node-level CPU aggregates from CloudWatch; they now had per-CPU-mode breakdowns,
memory saturation curves, and disk pressure indicators that could be correlated with
application-level behaviour in the same dashboard. The first time an engineer saw a
Grafana panel showing a node's memory working set alongside the pod-level memory
consumption of every container running on it, the operational value was immediately
clear.

### Kubernetes API and control plane scraping

The Kubernetes API server and control plane expose their own metrics endpoints, and
Prometheus scrapes them directly. This provides cluster-state observability that exists
nowhere in CloudWatch: the number of running, pending, and failed pods across every
namespace; deployment replica counts versus desired; job completion rates; persistent
volume claim binding status; and API server request rates and latency.

kube-state-metrics, deployed as a separate exporter, translates Kubernetes object
states into Prometheus-compatible metrics. OOM-kill events, pod crash loops, container
restarts, all surface as time-series data that can trigger alerts and appear in
dashboards. A container that had been silently restarting four times a night because
of a memory leak, previously invisible to CloudWatch, became a 10-minute Alertmanager
notification within days of go-live.

### Application pod instrumentation

The 14 microservices were instrumented to expose /metrics endpoints using their
respective language SDKs (Go and Python Prometheus clients). Prometheus scrapes these
endpoints via ServiceMonitor custom resources managed by the Prometheus Operator,
which discovers instrumented services automatically as they are deployed. No manual
Prometheus configuration change is required when a new service is added.

The metrics exposed follow the RED method, Rate (requests per second), Errors (error
rate as a proportion of total requests), and Duration (latency percentiles: p50, p95,
p99). For the carrier integration service specifically, additional business metrics
were added: shipment dispatch success rate and carrier API response times. These now
appear on a dedicated Grafana panel that the operations team monitors independently
of the engineering team's cluster dashboards.

### Prometheus Server, centralised time-series storage

The Prometheus Server aggregates all scraped metrics into a local time-series database.
Recording rules pre-compute expensive PromQL expressions that underpin dashboard panels
and alert conditions, reducing query load and ensuring that dashboard load times remain
consistently fast as the metric volume grows. Retention is configured for 15 days of
local storage, after which the optional CloudWatch remote write path extends retention
to 15 months at the AWS level for historical capacity analysis.

### Alertmanager, tiered routing and deduplication

The 140 CloudWatch alarms were audited, rationalised, and replaced with 31 Prometheus
alerting rules. Every rule was written against real application behaviour observed during
a two-week baselining period before the stack went live. Thresholds reflect actual
workload patterns rather than estimates.

Alertmanager routes alerts through three channels based on severity:

**PagerDuty (critical):** node unreachable, pod crash-looping for more than 10 minutes,
API error rate above 5% for more than 5 minutes, carrier integration failure rate above
2%. These page the on-call engineer immediately, 24 hours a day.

**Slack (warning):** node memory approaching 85% of limit, pod restart count elevated
but not crash-looping, deployment rollout taking longer than expected, persistent volume
nearing capacity. These post to a dedicated #infra-warnings channel during business hours
and aggregate into a digest overnight.

**Email (informational):** weekly cluster capacity reports, monthly SLI summaries, and
any alert that was silenced during a maintenance window with a documented justification.

Alertmanager's grouping configuration bundles related alerts into single notifications —
if three pods on the same node restart within the same five-minute window, the on-call
engineer receives one grouped alert rather than three individual pages. Silences are
version-controlled alongside the Prometheus configuration in the same CodeCommit
repository as the cluster's Terraform definitions.

### Grafana, dashboards built for incident response

Five Grafana dashboard categories were built and published to the team:

**Cluster overview:** node count, CPU and memory utilisation by node, pod distribution
across availability zones, and Cluster Autoscaler activity. This is the first screen
the on-call engineer opens during any infrastructure incident.

**Per-service SLI dashboards:** one per microservice, showing error rate, request
throughput, and p95/p99 latency over configurable time windows. These can be opened
directly from Alertmanager notification links, the alert for a carrier integration
error rate spike links to the carrier integration SLI dashboard pre-scoped to the
relevant time window.

**Incident response dashboard:** a single correlated view combining node saturation,
pod health, and application error rate in one screen. This dashboard was explicitly
designed to answer the question an on-call engineer asks first during an incident:
is this a node problem, a pod problem, or an application problem?

**Capacity planning dashboard:** 30-day trends of CPU, memory, and storage consumption
across the cluster, with linear projections to saturation. The SRE team reviews this
weekly to inform node group sizing decisions.

**Business metrics dashboard:** orders per minute, dispatch success rate, and carrier
API response time, operational metrics that the logistics operations team monitors
independently and that now feed into the client's SLA reporting to enterprise customers.

### AWS CloudWatch remote write (optional path)

Prometheus remote_write forwards a selected subset of metrics to AWS CloudWatch.
This was implemented to satisfy two requirements: the finance team used CloudWatch
cost dashboards and wanted infrastructure metrics available alongside cost data, and
the contractual SLA reporting for enterprise customers required metric retention
longer than 15 days. CloudWatch receives approximately 200 of the most operationally
significant metrics, node utilisation, pod health, and per-service error rates —
while the remaining 10,000+ metrics are retained only in Prometheus's local store.

### Architecture

![Kubernetes-native observability stack: Prometheus Node Exporter on worker nodes and application pods scraping to Prometheus Server, Alertmanager routing to Slack, PagerDuty, and email, Grafana querying for user dashboards, and optional remote write to AWS CloudWatch](/diagrams/monitoring-diagram.png)

_The full observability stack: Prometheus Node Exporter runs on every worker node as
a DaemonSet alongside application pods. The Kubernetes API and control plane are
scraped directly. The Prometheus Server aggregates all metrics, sends alerts to
Alertmanager (which routes to Slack, PagerDuty, and email by severity), and serves
data to Grafana for dashboards. An optional remote_write path forwards selected
metrics to AWS CloudWatch for long-term retention._

---

## Results

The impact on incident response was immediate and measurable.

Mean time to detection dropped from customer-reported (averaging 47 minutes from
incident onset to ticket) to automated alert within 90 seconds for the alert
categories covered by the new alerting rules. In the first three months after
go-live, six incidents were detected and actioned by the on-call engineer before
any customer reported an issue, a category of outcome that had not occurred in
the previous 12 months.

Mean time to root cause identification fell from 35 minutes to 8 minutes. The
incident response dashboard's correlated view, showing node saturation, pod
health, and application error rate simultaneously, eliminated the manual
cross-referencing of disconnected CloudWatch panels and kubectl output that
had characterised the previous process.

Alert volume dropped from approximately 60 notifications per day to an average
of 4.2, of which 3.4 were assessed as correctly actionable, an actionability
rate of 81% compared to an estimated 12% under the previous CloudWatch alarm
configuration. The Slack #infra-warnings channel became a channel engineers
actually read.

Three previously invisible operational issues were discovered within the first
two weeks of the stack being live: a memory leak in the notification service
(causing nightly OOM kills that restarted the container without customer impact
but with latency spikes), a persistent volume on the inventory sync service
approaching capacity (four days from exhaustion), and a carrier API client
making excessive retry calls during a carrier degradation event (contributing
to node CPU spikes that CloudWatch had reported without context).

For the enterprise SLA tier launched in the following quarter, the business
metrics dashboard and CloudWatch remote write retention provided the evidence
base for monthly SLA reports without any additional instrumentation work.

---

## What our client said

> "Before this, we found out about production incidents when a customer emailed
> support. Our CloudWatch setup was firing 60 alarms a day and engineers had
> stopped reading it. Now Alertmanager pages us before the first support ticket
> lands, and the Grafana incident dashboard shows us exactly what's happening,
> node saturation, pod restarts, error rate, in one view. We're not guessing
> anymore. Our MTTR went from 35 minutes to under 10, and we caught a memory
> leak nobody knew existed in the first two weeks."
>
> - SRE, Series A Startup

---

## What this made possible

The most significant shift was cultural rather than technical. When engineers have
a dashboard that tells them definitively whether a problem is a node issue, a pod
issue, or an application issue, they stop spending incident time on triage and
start spending it on resolution. The SRE team's on-call experience changed from
reactive archaeology, piecing together what had happened from disconnected
data sources, to informed response from a single correlated view.

The tiered alerting structure had an equally significant effect. When the Slack
warning channel carries actionable, correctly-tuned signals rather than noise,
engineers re-engage with it. Issues that previously would have gone unnoticed
until they caused an incident, a pod steadily increasing its memory footprint,
a persistent volume trending toward full, are now surfaced in the warning
channel days before they become pages. Preventive action replaced reactive
firefighting as the dominant operational mode.

The enterprise SLA reporting capability, while not the primary objective of the
engagement, opened a revenue path the client had not been able to pursue. Several
prospective enterprise customers had asked for contractual uptime and error rate
commitments; the client had not been able to make them credibly without a way
to measure and evidence compliance. With the business metrics dashboard and
CloudWatch long-term retention, they can now. The first enterprise tier contract
was signed six weeks after the observability stack went live.

---

_Running EKS without visibility into what your cluster and applications are actually
doing?
[Schedule an architecture review →](mailto:contact@pulsesoft.io)_
