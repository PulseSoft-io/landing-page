---
title: Why Networking Decisions Are the Most Expensive to Change Later
excerpt: CIDR ranges are permanent. Transit Gateway attachments compound. Here's why AWS networking decisions made early are the hardest to undo and how to get them right.
author: Michael Emmanuel
date: July 7, 2026
readTime: 11 min read
coverImage: https://picsum.photos/seed/post-1/1200/700
---

# AWS VPC CIDR Planning: Why Networking Decisions Are the Most Expensive to Change Later

## Introduction

The two most permanent decisions you make in an AWS environment are your account structure and your IP address space. You can refactor IAM. You can re-architect your compute layer. You can swap databases with enough pain and planning. But you cannot change a VPC CIDR range after it's been assigned, and you cannot resolve overlapping address space across a peered or connected network without tearing something down and rebuilding it.

AWS VPC CIDR planning is the foundational decision that every other networking choice builds on — and most teams make it carelessly, in the first five minutes of setting up a new account, without understanding what it forecloses.

This post covers the networking decisions that compound over time: CIDR allocation strategy, subnet sizing, the Transit Gateway vs. VPC peering choice, and hybrid connectivity through Direct Connect and Site-to-Site VPN. These aren't theoretical concerns. They're the decisions that determine whether adding a new environment in 18 months takes three hours or three weeks.

---

## Why Network Architecture Decisions Have Permanent Consequences

Every infrastructure decision has a cost of change. Compute decisions — instance types, container orchestration, serverless vs. containerized — are expensive to change but possible. Data decisions — database engines, storage classes, retention policies — range from painful to very painful. Network decisions sit in a different category: some of them are effectively irreversible within the lifetime of an environment.

The irreversibility comes from a specific property of IP networking: once resources are deployed into a subnet, and once routing tables and security groups reference that subnet's CIDR, the CIDR becomes load-bearing. Changing it means changing every route table, every security group rule, every NACl, every firewall rule on-premises, every hardcoded IP reference in application configuration. In practice, this means migrating workloads to a new VPC rather than modifying the existing one — which is a much larger project than it sounds.

The compounding effect is what makes this particularly costly. A /24 VPC that felt fine for a two-person startup starts becoming a problem when you need three AZs (which means at least three subnets) with separate public, private, and data tiers (which means nine subnets minimum), plus space for load balancer ENIs, NAT Gateway ENIs, VPC endpoint ENIs, and the Lambda function execution environment if you're using VPC-attached Lambda. A /24 gives you 256 addresses minus the five AWS reserves per subnet. At three subnets, you're already fighting for space before your first EC2 instance.

The most expensive failure mode I've seen: a company that built its entire production environment in a `10.0.0.0/24` VPC, grew the business, acquired a customer that required a direct network connection to their infrastructure — and discovered the customer's internal IP space was `10.0.0.0/8`. No peering possible. No overlap resolution without migrating everything. They spent four months and significant engineering resources migrating the entire production environment to a new VPC with a non-overlapping CIDR, doing it service by service with traffic shifting through load balancers, because they'd picked a /24 out of convenience three years earlier.

The second failure mode — less dramatic but equally pervasive — is ad hoc CIDR allocation without documentation. Each new VPC gets whatever seems convenient. After two years and a dozen VPCs across development, staging, production, and shared services accounts, nobody can tell you what's allocated where without checking every VPC in the console. Then Transit Gateway comes into the picture and you discover three VPCs have overlapping CIDRs, which means they can't be connected without a migration.

---

## AWS Deep Dive: The Networking Decisions That Actually Compound

### CIDR Allocation Strategy: Design the Entire Address Space Before You Use Any of It

The right approach to CIDR planning is to design the full address space for your organization before allocating anything to individual VPCs. This sounds like overengineering until the first time you need to peer a new account and discover the CIDR is already taken.

A practical allocation model for a multi-account AWS organization:

- Assign a large, non-overlapping parent block to your entire AWS footprint — typically a `/8` or `/10` from RFC 1918 space (`10.0.0.0/8` is the most common). If you're using `10.x.x.x` on-premises already, use `172.16.0.0/12` for AWS to avoid future overlap.
- Subdivide by account: each AWS account gets a `/16` from the parent block. A `/16` gives you 65,536 addresses — more than enough for any single account's VPCs, with room to grow.
- Subdivide by VPC within each account: each VPC gets a `/20` to `/22` from the account's `/16`. A `/20` gives you 4,096 addresses across as many subnets as you need.
- Subnet sizing within each VPC: size subnets based on the maximum number of ENIs the subnet will ever need to support, plus AWS's five reserved addresses per subnet, plus buffer. For public subnets used only for load balancers, a `/27` (32 addresses) is often sufficient. For private subnets running application workloads, `/24` or larger depending on expected scale.

Document this in code. A Terraform module that manages CIDR allocation centrally — outputting the correct ranges per account and VPC — prevents the ad hoc accumulation problem:

```hcl
locals {
  account_cidrs = {
    production      = "10.0.0.0/16"
    staging         = "10.1.0.0/16"
    development     = "10.2.0.0/16"
    shared_services = "10.3.0.0/16"
    security        = "10.4.0.0/16"
  }
}
```

That 15-line locals block is load-bearing organizational infrastructure. Treat it accordingly.

### Transit Gateway vs. VPC Peering: When Each Model Breaks

VPC peering and Transit Gateway (TGW) both connect VPCs, but they have fundamentally different scaling properties that make them appropriate in different situations.

VPC peering is a direct, non-transitive connection between two VPCs. "Non-transitive" is the critical word: if VPC A peers with VPC B, and VPC B peers with VPC C, traffic from A cannot reach C through B. Each pair of VPCs that needs connectivity requires its own peering connection. At two or three VPCs this is fine. At ten VPCs that all need to communicate with a shared services VPC, you have ten peering connections. At ten VPCs that all need full mesh connectivity with each other, you need 45 peering connections — and a route table management problem that grows as O(n²).

Transit Gateway solves the transitive routing problem by acting as a regional router. Attach all your VPCs to a single TGW and manage routing centrally through TGW route tables. One attachment per VPC regardless of how many other VPCs it needs to reach. Cross-account and cross-region (via TGW peering) connectivity is first-class.

The cost tradeoff is real and often underweighted. As of this writing, Transit Gateway charges per attachment per hour plus per GB of data processed — verify current pricing at [aws.amazon.com/transit-gateway/pricing](https://aws.amazon.com/transit-gateway/pricing). VPC peering has no hourly cost and no data processing charge for intra-AZ traffic (cross-AZ transfer rates apply for inter-AZ). For a small number of VPCs with high-bandwidth intra-VPC traffic, VPC peering can be meaningfully cheaper. For any architecture with more than five VPCs requiring mutual connectivity, TGW's operational simplicity outweighs its cost.

The non-obvious TGW behavior that catches teams at scale: Transit Gateway route tables and VPC route tables are separate and must both be configured correctly for traffic to flow. A TGW attachment with a route in the TGW route table but a missing route in the VPC's subnet route table will silently drop traffic. The debugging experience — checking TGW route tables, VPC route tables, NACLs, and security groups in sequence — is painful enough that I recommend testing connectivity between every pair of connected VPCs explicitly after any routing change.

```bash
# Verify TGW route table has the right entries
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-XXXXXXXXX \
  --filters "Name=type,Values=static,propagated"
```

### Hybrid Connectivity: Direct Connect vs. Site-to-Site VPN

For connecting AWS to on-premises networks, the choice between AWS Direct Connect and Site-to-Site VPN comes down to bandwidth, latency consistency, and cost — in that order.

Site-to-Site VPN runs over the public internet using IPsec. Setup takes minutes, costs are low (per-hour per VPN connection plus data transfer), and it works well for bandwidth requirements under a few hundred Mbps and for workloads tolerant of internet-level latency variability. Each VPN connection provides two tunnels for redundancy; both should be configured and monitored, because a single-tunnel VPN configuration gives you the false impression of resilience while a tunnel failure cuts your bandwidth in half.

Direct Connect provides a dedicated, private network connection to AWS with consistent sub-millisecond latency and bandwidth options from 50 Mbps to 100 Gbps. It's the right choice for high-bandwidth data transfer (large-scale migration, real-time replication), latency-sensitive hybrid workloads (financial transactions, voice/video), or compliance requirements that prohibit data traversal over the public internet.

The architecture decision that matters: Direct Connect alone has no built-in failover. A fiber cut at the DX location or a hardware failure at the DX partner takes down the connection. The correct production architecture pairs Direct Connect with a Site-to-Site VPN as a backup path — with routing configured so VPN only activates on DX failure. This requires BGP configuration on your on-premises router with the DX connection advertising more-specific routes than the VPN backup, so traffic prefers DX when available.

For Transit Gateway-connected environments, Direct Connect Gateway (DXGW) is the right attachment point — it allows a single Direct Connect connection to reach VPCs across multiple AWS regions, which is significantly more cost-effective than provisioning separate DX connections per region.

---

## Tradeoffs and Decision Framework

**CIDR size: how much space is enough?** The common mistake is sizing for today. Size for the maximum number of resources you might run in this VPC over its lifetime, then add 50%. A VPC CIDR that's too large costs you nothing except some entries in your allocation documentation. A VPC CIDR that's too small costs you a migration.

**Transit Gateway vs. VPC peering decision tree:**

- Fewer than 5 VPCs with limited interconnection needs → VPC peering. Simpler, cheaper, sufficient.
- 5+ VPCs, multi-account, or you anticipate growth → Transit Gateway from the start. The operational cost of migrating from peering to TGW later (re-routing traffic, updating route tables, updating security group rules) exceeds the TGW cost difference significantly.
- Cross-region connectivity needed → Transit Gateway peering. VPC peering is cross-region capable but each peering connection must be managed separately; TGW peering gives you centralized cross-region routing.

**Direct Connect vs. VPN:**

- Bandwidth needs under ~500 Mbps, latency-tolerant workloads, cost-sensitive → Site-to-Site VPN, possibly multiple connections for bandwidth aggregation.
- Consistent low latency, high bandwidth (1 Gbps+), compliance requirements, or the primary workload is replicating large datasets → Direct Connect, with VPN as backup.
- Both → DX as primary with BGP route preference, VPN as failover. This is the right answer for any production hybrid environment where the DX connection is serving critical traffic.

**When to redesign networking vs. when to work around it:** If your CIDR overlap problem affects only non-production environments and a migration would take more than the equivalent cost of the operational pain, work around it with NAT or application-layer proxying for now and schedule the migration. If it's blocking a customer connection, a compliance requirement, or a connectivity expansion that has a deadline, the migration is unavoidable and should be scoped and started immediately.

---

## Lessons from the Field

**1. The CIDR collision I've seen most often isn't VPC-to-VPC — it's VPC-to-customer.** A SaaS client won a large enterprise deal that required a dedicated VPC peering connection to the customer's network. The customer's internal IP space was `10.0.0.0/8`. Our client's production VPC was `10.10.0.0/16`. No peering possible. The deal almost fell through while we figured out a NAT-based workaround. Now I treat corporate `10.x.x.x` space as reserved for on-premises in every AWS design I do and default to `172.16.x.x` for AWS environments.

**2. Subnet sizing bites you specifically in VPC-attached Lambda.** Lambda functions that need VPC access (for RDS, ElastiCache, or internal ALBs) consume ENIs from the subnets they're attached to. At scale, a Lambda function with high concurrency can exhaust a small subnet's available IP space. I've seen production Lambda functions fail to cold-start because the subnet was out of IPs — not a visible error, just failed executions until someone noticed ENI counts in the VPC metrics. Size private subnets for Lambda more generously than you think you need.

**3. Transit Gateway route table propagation doesn't mean what most people think.** When you enable route propagation from a VPC attachment to a TGW route table, the TGW learns the VPC's CIDR automatically — but it doesn't automatically add the TGW as a route in the VPC's subnet route tables. Both sides need manual route configuration. I've spent 90 minutes debugging "traffic flows one way but not the other" before realizing the return path was missing in the spoke VPC's route table.

**4. Document your CIDR allocations in Terraform state or a CMDB, not a spreadsheet.** The spreadsheet will be wrong within six months. I use a dedicated Terraform workspace per organization whose sole purpose is tracking CIDR allocations and outputting them as data sources to other workspaces. When someone creates a new VPC, they pull the next available range from the allocation workspace rather than picking something that looks free.

---

## Final Thoughts

Networking is the one layer of AWS infrastructure where the cost of revision isn't just engineering time — it's often downtime, migration risk, and customer impact. A CIDR range chosen carelessly in the first week of a new environment can block a customer integration three years later. A Transit Gateway deployment deferred until VPC peering becomes unmanageable costs two or three times as much to implement retroactively as it would have cost to start with.

The teams that handle AWS VPC CIDR planning and network architecture well share a discipline: they spend time at the beginning that feels like overengineering. They document an address space allocation that covers more accounts than they currently have. They choose Transit Gateway before they technically need it. They connect on-premises with both Direct Connect and VPN backup before a fiber cut teaches them why.

Networking decisions made early are either an investment or a debt. The interest rate on the debt is high.

This is the kind of foundational networking architecture we design at PulseSoft — if you're building a new AWS environment or trying to untangle a network design that's painted you into a corner, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **VPC CIDR ranges cannot be changed after assignment** — size for your maximum foreseeable scale plus 50% buffer, and document allocations in code before you deploy the first subnet. A /16 per account with /20–/22 per VPC is a practical baseline for most organizations.
- **Overlapping CIDR space blocks VPC peering and Transit Gateway connectivity permanently** — and the collision you don't anticipate is usually with a future customer's network, not your own. Default to `172.16.x.x` for AWS if your on-premises environment uses `10.x.x.x`.
- **Transit Gateway is operationally superior to VPC peering at scale, but both route tables must be configured independently.** A TGW route without a matching VPC subnet route silently drops traffic — check both sides after every routing change.
- **Direct Connect alone is not a resilient hybrid connectivity solution.** Pair it with a Site-to-Site VPN backup configured via BGP route preference so that DX is always preferred but VPN activates automatically on failure.
- **VPC-attached Lambda functions consume subnet ENIs at concurrency scale.** Subnets sized for EC2 workloads can be exhausted by high-concurrency Lambda, causing cold-start failures that surface as execution errors, not IP exhaustion errors. Size Lambda subnets separately and monitor ENI utilization.
- **The transition from VPC peering to Transit Gateway is a routing migration, not a networking addition.** Doing it retroactively across 10+ VPCs with live traffic costs 3–5x what a greenfield TGW deployment would have cost. Make the Transit Gateway decision before you have five VPCs, not after.
- **CIDR allocation tracking belongs in version-controlled infrastructure code, not a spreadsheet.** A Terraform workspace or similar that outputs the next available CIDR range prevents the ad hoc allocation drift that makes multi-VPC networking unmanageable within two years.
