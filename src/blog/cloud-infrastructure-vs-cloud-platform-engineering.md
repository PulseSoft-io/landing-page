---
title: Cloud Infrastructure vs. Cloud Platform Engineering
excerpt: Deploying AWS resources isn't the same as building a platform. Here's what separates infrastructure work from platform engineering and why it matters.
author: Michael Emmanuel
date: May 4, 2026
readTime: 10 min read
coverImage: https://picsum.photos/seed/post-4/1200/700
---

# Cloud Infrastructure vs. Cloud Platform Engineering: Why the Difference Defines Your Team's Ceiling

## Introduction

Most cloud teams are building infrastructure. They think they're building a platform. The distinction sounds academic until you have twelve application teams all asking the same DevOps engineer how to set up a new service, all waiting on the same Terraform module, all blocked by the same approval process. That's not a platform. That's a bottleneck with better tooling.

Cloud platform engineering is the discipline of building the infrastructure layer in a way that application teams can consume it without waiting on you. It's the difference between being a builder and being a product team — where the product is the cloud environment itself. This post breaks down what that distinction looks like in practice, which AWS services and patterns actually enable self-service without creating chaos, and where teams consistently misread the line between the two.

If your infrastructure work has ever felt like it was perpetually unblocking other people rather than compounding into something durable, this is the framing you've been missing.

---

## The Gap Between Deploying Resources and Building a Platform

Here's the pattern I see most often: a cloud engineer or small DevOps team does genuinely excellent work. They write good Terraform, they enforce tagging, they build secure VPCs with proper subnet tiering. The infrastructure is correct. But every time an application team needs something new — a new RDS instance, a new ECS service, a new S3 bucket with the right policies — they have to come back to the platform team and ask.

The platform team becomes the single-threaded path for every cloud resource request in the organization. They're skilled, they're busy, and they're the bottleneck.

What's missing isn't technical quality — it's **interface design**. A platform isn't a collection of well-written Terraform modules. A platform is a collection of well-written Terraform modules that application teams can invoke themselves, with guardrails that prevent them from making dangerous decisions, without needing to understand the underlying implementation.

The analogy that resonates: AWS itself is a platform. You don't call an AWS engineer every time you want to launch an EC2 instance. You use an API with documented contracts, sensible defaults, and hard limits that prevent you from doing things that would affect other customers. An internal cloud platform is the same concept, scoped to your organization's specific constraints.

The failure mode that makes this concrete: a growth-stage SaaS company where I inherited the infrastructure role had a Terraform monorepo with 60,000 lines of HCL. Everything was in it — networking, IAM, every application's resources. Every change went through one engineer. Deploying a new microservice required a PR to the monorepo, a review cycle, and a plan/apply that touched the entire state. Lead time for a new service: two to three weeks. Not because the engineer was slow. Because there was no platform — there was just one person holding the entire graph in their head.

---

## AWS Deep Dive: The Services That Make Self-Service Possible

### AWS Service Catalog: Vending Infrastructure at Scale

AWS Service Catalog is the most underused service in the platform engineering toolkit. The concept is simple: you define CloudFormation templates (or Terraform configurations via the third-party product option) as "products," bundle them into "portfolios," and grant application teams the ability to launch those products themselves — with constraints that prevent them from deviating from approved configurations.

A Service Catalog product for an RDS instance might expose exactly four parameters: environment (dev/staging/prod), instance class, allocated storage, and the application name for tagging. Under the hood, the template enforces encryption at rest, enforces Multi-AZ for production environments, attaches the right subnet group, and applies the correct security group — none of which the application team can bypass.

The constraint mechanism is what makes this a platform primitive rather than just a shared template. CloudFormation constraints let you lock specific parameters (e.g., always use `gp3` storage, always enable deletion protection in prod) while leaving others configurable. You can also enforce IAM constraints that limit which IAM roles the launched resource can assume, which is critical when you're vending resources across a multi-account org.

One non-obvious behavior: Service Catalog products launch using a specific CloudFormation stack, which means the platform team's IAM role is the one that actually creates the resources — not the application team's role. This is a feature, not a bug. It means application teams can provision infrastructure they couldn't provision directly, and the platform team retains the actual AWS API permissions. But it also means your Service Catalog launch role needs to be scoped carefully. An overly permissive launch role is a privilege escalation path.

### Terraform Modules with Published Contracts

Service Catalog is the right answer when you want hard guardrails and a UI-accessible self-service catalog. For engineering teams that live in IaC and are comfortable with Terraform, the right primitive is a published, versioned module registry.

A platform module isn't just a reusable Terraform block. It has a defined interface, a changelog, a version contract, and opinionated defaults that encode your organization's security and compliance requirements. Here's what a well-designed ECS service module interface looks like:

```hcl
module "api_service" {
  source  = "git::https://github.com/your-org/terraform-modules.git//ecs-service?ref=v2.3.0"

  service_name    = "payments-api"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/payments-api:latest"
  container_port  = 8080
  cpu             = 512
  memory          = 1024
  desired_count   = 2

  # These come from the VPC module, not hand-coded
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_app_subnet_ids
  alb_target_group_arn = module.alb.target_group_arn
}
```

What's not in the interface: the security group configuration, the IAM execution role, the CloudWatch log group, the ECS task definition structure, the health check configuration, the capacity provider strategy. All of that is inside the module, opinionated, and not exposed as a parameter because exposing it creates the wrong surface area. The application team doesn't need to choose between EC2 and Fargate launch types. The platform team has already decided.

The Terraform Registry (public or private, via Terraform Cloud or a self-hosted registry) enables semantic versioning and dependency resolution. Application teams pin to a minor version (`~> 2.3`) and get patch updates automatically. Major versions require explicit opt-in. This is how you evolve platform modules without breaking every consumer simultaneously.

### Control Tower, SCPs, and the Governance Layer

Self-service without governance is just chaos with better ergonomics. The governance layer is what makes platform engineering different from just giving everyone admin access.

AWS Control Tower provides a landing zone — a pre-configured, opinionated multi-account structure with guardrails — that gives you the organizational scaffolding for a self-service model. Guardrails are implemented as SCPs (preventive) or AWS Config rules (detective), and they enforce platform-level constraints that can't be overridden by application teams regardless of their IAM permissions.

A concrete example: if you're in a regulated industry and need to ensure that no data ever leaves a specific AWS region, a preventive SCP that denies `*` with a `StringNotEquals` condition on `aws:RequestedRegion` is the right control — not an IAM policy, not a Config rule, not a trust-the-team policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonApprovedRegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "support:*", "sts:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2"]
        }
      }
    }
  ]
}
```

The non-obvious gotcha with Control Tower: the managed guardrails it ships with are implemented as AWS-managed SCPs and AWS Config rules, and they can conflict with custom SCPs you add. If you're adding SCPs manually in an account that's enrolled in Control Tower, test carefully. An SCP that denies a permission that Control Tower's automation needs can break the landing zone update process — and the failure mode is silent until you try to enroll a new account or update a guardrail.

---

## Tradeoffs & Decision Framework

The honest question isn't whether to build a platform — it's when the investment is worth it. Platform engineering has real overhead: module maintenance, documentation, versioning, support, and the cultural shift of treating infrastructure as a product. That overhead doesn't pay back at every scale.

**When to prioritize infrastructure work over platform building:**

- Fewer than 5 application teams consuming cloud resources
- Single-product company where the infrastructure team can stay in close communication with every stakeholder
- Greenfield buildout where the patterns aren't settled enough to abstract
- Platform abstractions built too early will encode the wrong assumptions and need to be rebuilt

**When the platform investment has clear ROI:**

- Multiple application teams blocked on the same infrastructure team for similar resource types
- Infrastructure changes taking weeks due to review bottlenecks on a shared codebase
- Compliance or security requirements that need to be enforced consistently across teams without relying on everyone following the same runbook
- Engineering hiring is creating new teams faster than the infrastructure team can onboard them

**The failure mode at each extreme:**
Too much infrastructure, not enough platform: the infrastructure team becomes a permanent bottleneck. Every new service is a project. Every application team has a ticket queue. Platform engineers spend all their time doing work that could be self-served.

Too much platform, not enough infrastructure: teams build platform abstractions before they understand the problem space. The "self-service" interface exposes too many parameters (so it's not actually simpler than writing the Terraform directly) or too few (so teams can't do what they need and route around the platform anyway). Route-around behavior is the clearest signal that your platform interface is wrong.

---

## Lessons From the Field

**1. Platform engineering doesn't start with tooling — it starts with identifying the repeated asks.**
At an e-commerce client with eight product teams, I spent the first two weeks doing nothing but cataloging every infrastructure request that came through Slack and Jira. Sixty percent of them were variants of three things: new ECS services, new RDS databases, and new S3 buckets with specific access patterns. Those three became the first three Service Catalog products. Everything else stayed in the backlog.

**2. A Terraform module that isn't versioned is a time bomb.**
Inherited a "shared module" setup at a healthtech company where the modules lived in a subdirectory of the same monorepo as every consumer. When the platform team updated a module, it immediately affected every consumer on their next `terraform plan`. One breaking change to the VPC module caused twelve teams to get failed plans on their next deploy. Versioning is not optional; it's the contract.

**3. Application teams will route around your platform if the interface is slower than writing it themselves.**
Built a Service Catalog product for ECS services at a media company. The launch time for the CloudFormation stack was eleven minutes. Application engineers, used to `terraform apply` in under two minutes, started writing their own ECS task definitions directly. The platform was technically correct and practically ignored. Always measure the end-to-end time of your platform interface against the alternative, and optimize ruthlessly.

**4. SCPs need to be tested against your own automation before you apply them at the OU level.**
Applied an SCP restricting non-approved regions to a production OU that included the account running our Control Tower customizations pipeline. The pipeline used a CodePipeline in us-west-2 — which the SCP blocked. The next Control Tower customization run failed silently. We found it three weeks later when we tried to enroll a new account. Test SCPs in a sandbox account first. Always.

**5. "Platform" without documentation is just mystery infrastructure.**
The best Terraform module in the world has zero adoption if no engineer can figure out how to use it in under ten minutes. Every platform primitive needs a README with a working example, a description of what the module provisions and what it doesn't, and a clear explanation of which parameters are safe to change and which are locked for compliance reasons. Documentation is part of the platform, not optional.

---

## Final Thoughts

The conversation in the industry has shifted from "how do we manage cloud infrastructure" to "how do we build cloud platforms that scale with our engineering organization." That shift is real, and it reflects a maturity in how companies think about the relationship between platform teams and the developers they serve.

But the shift is also creating a new failure mode: teams that adopt the language of platform engineering — internal developer platforms, golden paths, paved roads — without doing the harder work of actually designing the right interface for their specific organization. A platform that nobody uses is worse than no platform. It creates the illusion of self-service while the real work still flows through the same bottleneck.

The teams that get this right start small. Three products. One portfolio. Real adoption metrics. Then they expand. Platform engineering done incrementally, with attention to the interface and the feedback loop, compounds into something that genuinely changes how fast an engineering organization can move.

This is the kind of infrastructure-to-platform evolution we help organizations navigate at PulseSoft. If your infrastructure team is feeling like a bottleneck and you're not sure whether the answer is more engineers or a different architecture, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **Infrastructure is what you build. A platform is what you build so others can build.** The difference is interface design — who can consume the infrastructure, how, and with what guardrails.
- **AWS Service Catalog enables hard guardrails on self-service provisioning** by separating the permissions to _launch_ a resource from the permissions to _configure_ it freely. The launch role holds the real AWS permissions; the user only controls what the product exposes.
- **Terraform module registries with semantic versioning are the platform primitive for engineering teams** comfortable in IaC. Major versions require opt-in; minor versions auto-update. Unversioned shared modules are a breaking-change time bomb.
- **SCPs are the enforcement layer that makes self-service safe at scale.** Preventive SCPs enforce constraints that IAM policies alone can't — like region restriction or root user denial — regardless of what permissions an application team holds.
- **Build platform abstractions after you understand the repeated requests, not before.** Platform primitives built too early encode the wrong assumptions. Two weeks cataloging incoming infrastructure requests will tell you exactly what to build first.
- **Route-around behavior is the clearest signal your platform interface is wrong.** If teams are writing their own Terraform instead of using your Service Catalog products, the interface is either too slow, too limited, or too opaque. Measure adoption, not just availability.
- **The platform investment has clear ROI when multiple teams are blocked on the same team for similar resources.** Below that threshold, good infrastructure work is usually the right answer. Above it, the bottleneck cost exceeds the platform maintenance overhead.
