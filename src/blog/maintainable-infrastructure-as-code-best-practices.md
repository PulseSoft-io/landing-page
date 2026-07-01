---
title: Good Cloud Engineers Write Infrastructure for the Engineer Who Inherits It
excerpt: The best cloud engineers write infrastructure that's understandable six months later. Here's what maintainable IaC actually looks like in practice.
author: Michael Emmanuel
date: May 18, 2026
readTime: 11 min read
coverImage: https://picsum.photos/seed/post-3/1200/700
---

# Good Cloud Engineers Write Infrastructure for the Engineer Who Inherits It

## Introduction

I've inherited enough Terraform to know what it looks like when someone optimized for "it works today" without thinking about "someone else has to touch this in eight months." It looks like a 2,000-line `main.tf` with no comments, resource names like `aws_security_group.sg3`, variables named `var.flag` that are booleans controlling behavior that nobody documented, and a `locals.tf` full of expressions that require a flowchart to parse.

Maintainable infrastructure as code isn't about aesthetics. It's about the operational cost of confusion. Every time an engineer has to spend two hours understanding a Terraform module before they can safely change it, that's two hours of incident risk, two hours of cognitive load, and two hours that didn't go toward building anything. Multiply that by ten engineers touching the same codebase over two years and you have a significant, invisible tax on engineering velocity.

This post is about the practices that actually make infrastructure readable, navigatable, and safe to modify — six months, two years, and one team-member-departure later.

---

## The Real Cost of Unreadable Infrastructure

Infrastructure code has a different readability risk profile than application code. When application code is hard to read, you might introduce a bug. When infrastructure code is hard to read, you might introduce a bug that takes down a production database, costs $40,000 in data transfer fees, or opens a security group to `0.0.0.0/0` because nobody was sure which port the rule was actually restricting.

The stakes are higher, the blast radius is larger, and the feedback loop is slower. In application code, a test suite catches most mistakes before they reach production. In infrastructure code, the only test environment is often a plan output that an engineer has to manually interpret — and misinterpretation is easier when the code is opaque.

The most common failure mode I see is what I call **inherited opacity**: the original author understood every decision they made, but none of that understanding survived into the code itself. They knew why `count = var.enable_replication ? 2 : 1` controlled the number of read replicas instead of a more explicit `var.replica_count`. They knew why the security group referenced a hardcoded CIDR block instead of a data source. They knew why the IAM policy was split across three separate JSON files concatenated with `jsonencode`. None of that knowledge is in the code.

Six months later, a new engineer opens the file, runs `terraform plan`, sees 47 resources in the diff, and has no way to tell which changes are expected and which are the result of a misconfigured variable. So they either spend a day reconstructing the original intent — or, worse, they assume the plan looks right and apply it.

The second failure mode is **false simplicity**: infrastructure that looks clean at first glance but encodes critical logic in ways that are easy to miss. A Terraform module that accepts a `var.environment` variable and silently changes dozens of internal behaviors based on its value is not simple. It's complex behavior hidden behind a simple interface. An engineer who doesn't know the module deeply will change the environment variable for a test and have no way to predict what else changed.

Neither of these is a skill deficit. They're a communication failure — the infrastructure author didn't optimize for the reader.

---

## AWS Deep Dive: What Maintainable Infrastructure Actually Looks Like

### Naming Conventions That Carry Intent

The single highest-leverage maintainability practice in AWS infrastructure is consistent, descriptive resource naming. It costs nothing to implement at the start and is genuinely painful to retrofit.

A security group named `sg-0a2f8c3d1e9b74621` tells you nothing. The AWS-generated name tells you slightly more, but still nothing about intent. A security group named `payments-api-prod-alb-inbound-443` tells you exactly what it is, which environment it belongs to, which component owns it, what traffic direction it handles, and what port it controls.

This matters in three specific contexts. First, during incident response, when you're reading CloudTrail events at 3am and need to understand which security group an API call modified. Second, during cost analysis, when you're trying to attribute a resource to a team or product. Third, during IAM policy authoring, when you want to scope a policy to "all resources belonging to the payments team in production."

The tagging strategy is where this extends beyond naming. Every resource should carry at minimum:

```hcl
locals {
  common_tags = {
    Environment = var.environment          # prod, staging, dev
    Service     = var.service_name         # payments-api, user-service
    Team        = var.owning_team          # platform, payments, identity
    ManagedBy   = "terraform"
    Repository  = var.repo_name            # github.com/org/infra-repo
    CostCenter  = var.cost_center          # for billing attribution
  }
}
```

The `Repository` tag is the one teams most often skip, and it's the one that matters most during an incident. When you're looking at an unknown resource in the AWS console and trying to understand where it came from and who owns the code that manages it, a link to the repository is the fastest path to the person who can answer your question.

One non-obvious AWS behavior: some resource types don't propagate tags set at creation time to their child resources. RDS clusters, for example, don't automatically tag their instances or snapshots with the cluster's tags. If your cost attribution or compliance alerting relies on resource tags, verify tag propagation behavior for each resource type you use. AWS Tag Editor can help you audit tag coverage across a region.

### Terraform Structure That Scales Without Confusion

The monolithic `main.tf` approach works for a proof of concept. It breaks down when the file is long enough that two engineers can simultaneously be reading different sections without either realizing the other is editing it — or when a `terraform plan` takes four minutes because it's evaluating the entire state graph.

A maintainable Terraform structure separates concerns into files that match how engineers mentally navigate the codebase:

```
├── main.tf          # Resource definitions only — no locals, no variables
├── variables.tf     # Input variable declarations with descriptions
├── outputs.tf       # Output declarations with descriptions
├── locals.tf        # Computed values and transformations
├── data.tf          # Data source lookups
├── versions.tf      # Provider and Terraform version constraints
└── README.md        # What this module does, what it creates, how to use it
```

This isn't a religious prescription — it's a convention that makes a file's purpose inferrable without reading it. When an engineer needs to understand what inputs a module accepts, they open `variables.tf`. When they need to understand what the module exposes for consumption by other modules, they open `outputs.tf`. The cognitive overhead of finding information drops dramatically when structure encodes intent.

The `variables.tf` file is where the biggest maintainability wins and losses happen. A variable declaration that reads:

```hcl
variable "enable_enhanced_monitoring" {
  description = "Enable RDS Enhanced Monitoring. Requires an IAM role with the AmazonRDSEnhancedMonitoringRole policy. Set to true for production environments. Monitoring interval is set to 60 seconds."
  type        = bool
  default     = false
}
```

...is a variable that an engineer can use correctly without reading the resource that consumes it. A variable that reads:

```hcl
variable "em" {
  type = bool
  default = false
}
```

...is a variable that will cause a support question, a wrong configuration, or a miscommunicated change in a code review.

### Comments as Load-Bearing Infrastructure

Application engineers are often taught that well-written code doesn't need comments — the code itself should be expressive enough. That rule doesn't transfer cleanly to infrastructure code, because infrastructure code often encodes business decisions, regulatory requirements, and AWS-specific workarounds that have no natural home in the syntax.

```hcl
resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # All four settings are required for complete public access blocking.
  # Setting only block_public_policy=true still allows ACL-based public access.
  # See: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
}
```

That comment looks like overhead. In practice, it's a guardrail. Without it, an engineer who thinks `block_public_policy = true` is sufficient will make a partial change that looks correct in the plan and leaves the bucket accessible via ACL-based policies. The comment carries the reason the four settings co-exist. It's not explaining what the code does — it's explaining why all four settings are present and what breaks if any one of them is removed.

The same principle applies to lifecycle rules, `prevent_destroy` flags, and any resource configuration that deviates from the obvious default:

```hcl
resource "aws_db_instance" "primary" {
  # ...

  # deletion_protection is set to true even in non-prod environments.
  # A previous incident resulted in a staging database being deleted by a
  # terraform destroy run that was intended to target a dev environment.
  # Require explicit disable before any destroy operation.
  deletion_protection = true
}
```

That comment is documentation of an incident. It carries institutional memory. Without it, the next engineer to touch the file will see `deletion_protection = true` in staging, decide it's unnecessary overhead, and remove it — recreating the exact condition that caused the original incident.

---

## Tradeoffs & Decision Framework

Maintainability practices have real costs. Not every team is at the right stage to invest in all of them simultaneously, and over-engineering documentation can be as harmful as under-engineering it.

**Early-stage teams (1–3 infrastructure engineers, single product):**
Prioritize naming conventions and tagging above everything else. These are cheap to implement, impossible to retrofit at scale, and pay back on day one. Full file structure, module READMEs, and deep inline documentation are overhead that a small team can handle informally. Don't let perfect be the enemy of good tagging.

**Growth-stage teams (4–10 engineers, multiple products or environments):**
This is the inflection point where informal knowledge transfer breaks down. An engineer can no longer hold the full infrastructure context in their head, and new hires are being dropped into a codebase they've never seen. Module documentation, variable descriptions, and structural conventions stop being overhead and start being onboarding infrastructure. Invest here.

**Mature teams or regulated environments:**
Infrastructure code should have the same review standards as application code — including descriptions of what the change is intended to do, not just the diff. In a SOC 2 or FedRAMP environment, an auditor may ask you to demonstrate that changes to production infrastructure were reviewed and understood by a second person. A PR with no description, a changed variable, and an `LGTM` comment is not an audit-ready change. The description, the context, and the intent must be in writing.

The honest tradeoff: documentation takes time to write. In a sprint environment, that time competes directly with feature work. The business case for investing in it is always about the future cost of not having it — which is harder to quantify than the immediate cost of the sprint point. The teams that consistently underinvest in documentation are usually the ones who haven't yet experienced the incident where the absence of documentation made a bad situation significantly worse.

---

## Lessons From the Field

**1. The most dangerous Terraform I've ever read was also the cleanest-looking.**
A fintech client had a beautifully organized codebase. Short files, consistent naming, no obviously dead code. But every module was parameterized to handle four different environments through a deeply nested set of local conditionals, and the variable names were all abbreviated. `var.ha_mode`, `var.dr_cfg`, `var.enc_kms`. Changing a single variable in the wrong environment triggered a plan with 23 resource modifications and nobody could confidently predict which were safe. Clean is not the same as readable.

**2. A `prevent_destroy` lifecycle rule without a comment explaining why it's there will get removed.**
Inherited an S3 bucket with `prevent_destroy = true` and no comment. The engineer before me had added it after a bucket was accidentally deleted in a staging environment. I removed it six months later because it was blocking a legitimate cleanup. Three weeks after that, someone ran a `terraform destroy` in the wrong workspace. The `prevent_destroy` wasn't the problem. The missing institutional memory was.

**3. New engineers will estimate the blast radius of a change based on how readable the surrounding code is.**
Worked with a platform team at a SaaS company where the onboarding task for new infrastructure engineers was to make a specific, scoped change to a Terraform module. Engineers with clearly documented, well-structured modules to work in made the change in an afternoon. Engineers dropped into the legacy monolith spent two days asking questions and still weren't fully confident in their PR. The variable descriptions and inline comments were literally determining how long changes took to make safely.

**4. `terraform state list` is not documentation.**
A common response to "how do I understand what this module creates?" is "just run a plan." That tells you what resources exist in the state. It doesn't tell you why they're structured the way they are, what the naming convention means, which resources depend on which, or what breaks if you change a specific parameter. A module README that answers those questions is worth more than any amount of well-formatted code.

**5. The engineer who writes infrastructure code is rarely the engineer who has to fix it at 2am.**
This is the mental shift that separates senior engineers from good-but-junior ones. Writing infrastructure with the assumption that you'll always be available to explain it is writing infrastructure that creates organizational risk. When you're on vacation and someone needs to modify the RDS security group rules because of an emergency access requirement, the comments in your Terraform are what stand between them and a misconfiguration.

---

## Final Thoughts

The tooling for maintainable infrastructure as code is getting better. Terraform's built-in documentation generation, module registries with version pinning, and tools like `tflint`, `tfdocs`, and Checkov are making it easier to enforce structure and surface problems before they reach a plan. Platforms like Terraform Cloud and Atlantis are bringing pull request workflows and audit trails to infrastructure changes that previously happened in someone's terminal.

But the tooling is not the constraint. The constraint is the mental model: who are you writing infrastructure for? If the answer is "for the next `terraform apply`," you'll write code that deploys correctly today. If the answer is "for the engineer who inherits this system in eighteen months during an incident," you'll write code that doesn't turn a bad day into a worse one.

The shift is cultural before it's technical. It requires deciding, as a team, that maintainable infrastructure as code is a first-class deliverable — not a cleanup task for the next sprint. That shift is one of the most durable investments an engineering organization can make in its own resilience.

It's also a core part of how we approach infrastructure work at PulseSoft. If you're inheriting a codebase that's become a liability, or building new infrastructure and want it done in a way that scales with your team, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **Infrastructure code has a higher readability risk profile than application code.** A misread Terraform plan can take down a production database. The cognitive cost of unreadable IaC is measured in incident risk and recovery time, not just engineering velocity.
- **Naming conventions are the highest-leverage maintainability investment and the hardest to retrofit.** A security group named `payments-api-prod-alb-inbound-443` is self-documenting during an incident. One named `sg3` is a liability. Set naming conventions before the first resource is created.
- **Variable descriptions are load-bearing documentation.** A variable with no description requires the reader to find every place it's consumed to understand its effect. A well-described variable with valid values, defaults, and behavioral notes is the difference between a confident change and a cautious guess.
- **Comments in Terraform should explain why a configuration exists, not what it does.** Four `true` values on an `aws_s3_bucket_public_access_block` need a comment explaining that all four are required together — not a comment restating that they block public access.
- **`prevent_destroy` lifecycle rules without comments explaining their origin will be removed by the next engineer who finds them inconvenient.** The comment is what makes the guardrail durable. Without it, the guardrail is just friction.
- **File structure that separates resources, variables, outputs, locals, and data sources by convention is an onboarding tool, not a style preference.** When an engineer knows which file to open for a specific type of information, cognitive overhead drops and safe change velocity increases.
- **Write infrastructure assuming you won't be available to explain it.** The engineer modifying your Terraform during an incident at 2am isn't going to Slack you. Your comments, your variable descriptions, and your module README are the only context they'll have.
