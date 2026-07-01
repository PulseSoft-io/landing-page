---
title: Your Internal Developer Platform Is a Product, Start Treating It Like One
excerpt: Your internal platform is a product. If engineers avoid it or work around it, that's user feedback. Here's how to build internal platforms that actually get adopted.
author: Michael Emmanuel
date: June 22, 2026
readTime: 10 min read
coverImage: https://picsum.photos/seed/post-1/1200/700
---

# Your Internal Developer Platform Is a Product, Start Treating It Like One

## Introduction

Here's a signal that your internal platform is failing: engineers are writing their own Terraform modules instead of using the ones your platform team built. They're spinning up ad-hoc ECS clusters instead of going through the self-service pipeline. They're DMing someone on Slack to get a database provisioned instead of using the tool that was supposed to automate that.

None of that is a discipline problem. It's a product problem.

The internal developer platform (IDP) — the collection of golden paths, Terraform modules, CI/CD pipelines, and self-service tooling that your platform team maintains — is a product. It has users. Those users have workflows, frustrations, and workarounds. When they route around your platform, they're leaving you a review. Most platform teams are so focused on the infrastructure side that they never stop to read it.

This post is about what changes when you treat infrastructure like product development: how it shapes what you build, how you measure success, and which AWS services you actually wire together to make a platform that engineers use instead of circumvent.

---

## Why "Build It and They Will Come" Fails for Internal Platforms

The failure pattern is consistent across almost every platform engagement I've walked into. A small, skilled infrastructure team spends months building something genuinely impressive — a Terraform module registry, a CI/CD pipeline with proper guardrails, an AWS Service Catalog of pre-approved resources. They write documentation. They send the launch email. Adoption is disappointing. The team gets frustrated. They add more features. Adoption stays flat.

What went wrong isn't the technology. It's the process that preceded the technology.

Product teams spend time before they write code understanding what their users actually need to accomplish. Platform teams almost never do this. They build the platform they wish existed — which is usually optimized for infrastructure correctness and security compliance, not for the developer who needs to deploy a staging environment at 4pm on a Friday before a weekend release freeze.

The result is a platform that is technically correct and operationally painful. The golden path exists, but it's slower than doing the thing manually. The Terraform modules enforce the right patterns, but their input variable schemas require knowledge that application engineers don't have. The deployment pipeline has every security scan and compliance gate you could want, but it takes 22 minutes to run and has no mechanism for developers to understand which gate failed and why.

Here's the concrete failure I've seen this cause: a fintech client had a platform team that had built a full internal developer platform on top of AWS. Beautiful architecture. Separate tooling account, cross-account IAM roles, a CI/CD pipeline backed by CodePipeline and CodeBuild, a Service Catalog portfolio with approved CloudFormation products. The problem: the average time from a developer submitting a new service request to having a working environment was 4 days. Not because the automation was slow — because the process had four manual approval steps baked in, none of which had SLAs. Developers had stopped using it. They were asking senior engineers to spin things up manually instead. The platform was architecturally sound and practically abandoned.

---

## AWS Deep Dive: Building a Platform Engineers Actually Use

When you approach the IDP as a product, the AWS service choices shift from "what's most architecturally correct" to "what reduces friction for the developer at the point of use." These aren't in conflict — but the ordering matters.

### AWS Service Catalog and the Problem with Catalog-First Design

AWS Service Catalog is the right tool for offering pre-approved, self-service infrastructure to developer teams. A well-configured portfolio lets developers deploy compliant RDS instances, ECS services, or S3 buckets with the right encryption, tagging, and VPC placement — without needing deep AWS knowledge or IAM access to the raw APIs.

But the most common mistake is designing the Catalog from the infrastructure side outward. The platform team decides what products to offer based on what they want developers to be able to provision. What they should be doing is starting from the developer's job-to-be-done: "I need a place to run this containerized API in staging" — and working backward to what Catalog product enables that outcome in the fewest steps.

Concretely: a CloudFormation-backed Service Catalog product for an ECS Fargate service should expose maybe five parameters to the developer — service name, container image URI, desired count, memory, and environment. The platform team handles VPC placement, security group rules, IAM task roles, CloudWatch log group creation, and ALB target group registration inside the template. The developer shouldn't need to know what a target group is. If your Catalog product has 30 parameters, you've built it for yourself, not your users.

One non-obvious behavior: Service Catalog uses the permissions of the launch role, not the end user, to provision resources. This means you can give developers the ability to deploy an RDS instance through Service Catalog without giving them `rds:CreateDBInstance` directly. This is intentional and powerful — it's the mechanism that lets you enforce guardrails at the platform level rather than through IAM policy complexity on every developer account.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "servicecatalog.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

That trust policy on your launch role is the foundation of your entire self-service model. Guard it accordingly.

### CodePipeline, CodeBuild, and Feedback Loops That Don't Exist

The most underrated problem in internal CI/CD platform design isn't the pipeline architecture — it's what happens when a build fails.

A platform-as-product mindset asks: "When this pipeline fails, does the developer understand what went wrong in under two minutes?" Most pipelines I've inherited answer that with a hard no. The developer gets a red badge in their deployment dashboard, clicks through to CodePipeline, clicks through to the failed stage, clicks through to CodeBuild, finds a log stream with 3,000 lines of output, and somewhere in there is the actual error — frequently buried after 2,400 lines of Docker layer caching output.

Fix this at the CodeBuild level with structured output grouping and explicit failure reporting:

```yaml
phases:
  build:
    commands:
      - echo "--- Running unit tests ---"
      - ./scripts/run-tests.sh || (echo "PLATFORM_FAILURE_REASON=unit_tests_failed" && exit 1)
      - echo "--- Running security scan ---"
      - ./scripts/trivy-scan.sh || (echo "PLATFORM_FAILURE_REASON=security_scan_failed" && exit 1)
```

Then push that `PLATFORM_FAILURE_REASON` to a CloudWatch metric filter and route it to a developer-facing Slack notification or a status page. The developer should know the pipeline failed and exactly why before they've had time to switch context.

The non-obvious CodeBuild limit that trips teams at scale: CodeBuild concurrent build limits are regional and account-level, and the default is lower than most teams expect (verify current limits at the AWS Service Quotas console — these change). If your platform team is running builds for 30 application teams through a single tooling account, you will hit this limit during peak hours. The fix is either a service quota increase request or distributing build capacity across accounts — but neither option is fast, and you won't know you need it until developers are seeing builds queue for 15 minutes during morning deploy windows.

### AWS Proton for the Teams Ready to Go Deeper

If your organization has reached the point where you have multiple application teams, each with slightly different runtime requirements, and your platform team is drowning in one-off Terraform customization requests — AWS Proton deserves a serious look.

Proton formalizes the separation between platform team responsibilities (environment templates, which define VPCs, ECS clusters, RDS instances, and shared infrastructure) and developer responsibilities (service templates, which define how a specific application gets deployed into that environment). The platform team publishes versioned templates. Developers deploy against them. When the platform team updates a template — say, to patch a security vulnerability or change the instance type — Proton tracks which deployed environments are out of version and can trigger automated or manual updates.

The honest tradeoff: Proton has a learning curve, and it introduces another layer of abstraction on top of already-abstract infrastructure tooling. It's the right investment when your platform team is spending more than 20% of their time on repetitive customization requests. It's not worth the setup cost for a team of 10 engineers deploying three services.

---

## Tradeoffs and Decision Framework

Treating infrastructure like product development introduces genuine tradeoffs that are worth being explicit about.

**Developer velocity vs. platform correctness.** Every guardrail you add to your platform increases cognitive load and pipeline runtime for developers. This is a real cost. A Checkov scan that catches misconfigurations is valuable — but if it adds 8 minutes to every deploy and produces 40% false positives on your approved patterns, developers will start ignoring it or routing around the pipeline. Tune your guardrails to catch actual risk in your environment, not every possible misconfiguration in the CIS benchmark.

**Centralized platform team vs. federated ownership.** A single platform team that owns all shared infrastructure can enforce consistency and reduce duplication — but it becomes a bottleneck. A federated model where application teams own their own infrastructure gets faster iteration but drifts toward inconsistency and duplicated effort. The right answer depends on org size, compliance requirements, and how mature your golden paths are. Most organizations with fewer than 50 engineers should lean federated with opinionated shared modules, not a full centralized platform team.

**Abstraction level.** How much should your platform hide? Hiding VPC details and IAM complexity from application engineers is good — it reduces errors and cognitive load. Hiding deployment failure reasons, resource costs, or quota consumption is bad — it creates a platform that developers can't reason about when things go wrong. Build abstractions that simplify provisioning, not abstractions that obscure observability.

**When to invest in a formal IDP vs. when to stay with lighter tooling.** If your developers are spending more than a day per quarter fighting infrastructure tooling instead of shipping features, you have a platform problem worth solving. If everyone knows how to work the current system and it's not causing incidents, adding a formal IDP adds complexity without adding value. Measure the actual cost before you rebuild.

---

## Lessons from the Field

**1. Usage metrics are your product analytics — start collecting them on day one.** On a platform engagement for a mid-size SaaS company, we added CloudWatch metrics and a simple Grafana dashboard to track Catalog product deployments, pipeline success/failure rates by stage, and time-to-deploy by service type. Within two weeks, we could see that one specific Catalog product had a 60% failure rate and was never completing successfully without manual intervention. Nobody had noticed because nobody was watching. Product teams track conversion funnels. Platform teams need the same discipline.

**2. The documentation gap is where platforms die.** I've inherited three internal platforms in the last two years where the documentation was a README that said "see the Confluence page" and a Confluence page that hadn't been updated since the platform launched. Developers stopped reading it and started asking Slack questions. Developers who couldn't get answers in Slack stopped using the platform. Treat documentation as a first-class deliverable with the same release process as code — if the module ships without updated docs, it doesn't ship.

**3. Doing user interviews before a platform rebuild saved us three months.** Before rebuilding a client's deployment pipeline, we spent two weeks talking to the six engineering teams who would use it. We expected to hear "make it faster." We heard "we can't tell when it's broken" and "we don't know what environment our service actually deployed to." Those were product problems, not infrastructure problems. The solutions were a Slack notification with a deployment summary and a simple deployment history page — not a faster pipeline.

**4. Versioning your platform modules is non-negotiable once you have more than two consumers.** An unversioned module that a platform team updates to fix a bug will break every downstream consumer at their next `terraform init`. Version your modules, publish to a private registry (Terraform Cloud, AWS CodeArtifact, or even a versioned S3 path with a consistent naming convention), and deprecate old versions with migration guides before removing them. Treat breaking changes like a library author would, not like an ops team pushing a hotfix.

---

## Final Thoughts

The shift from "we build infrastructure" to "we build a platform that engineers use to build infrastructure" is not a minor mindset adjustment. It changes how you prioritize work, how you measure success, and who you talk to before you write code. It means your platform team needs someone who can sit with an application developer and watch them try to deploy a service from scratch — and feel the frustration in real time when it takes longer than it should.

The teams that build internal developer platforms that actually get adopted have one thing in common: they treat low adoption as a product failure, not a user education problem. When engineers route around your platform, they're not wrong. The platform failed them.

This kind of platform thinking — combining AWS service depth with genuine attention to developer experience — is core to how we work at PulseSoft. If your internal platform is being avoided instead of used, or if you're building one from scratch and want to get it right, [let's talk](https://pulsesoft.io).

---

## Key Takeaways

- **Low platform adoption is a product signal, not a discipline problem.** When engineers route around your internal developer platform, they're telling you the platform doesn't serve their workflow. Treat it as user feedback, not non-compliance.
- **AWS Service Catalog's launch role mechanism is the right model for self-service guardrails.** Developers get the ability to provision approved resources; the platform team controls what those resources actually look like. The developer never needs `rds:CreateDBInstance` in their IAM policy.
- **Failure feedback loops are a product feature.** A pipeline that fails without clearly telling the developer why is broken, regardless of how sound the underlying infrastructure is. Push structured failure reasons through CodeBuild to wherever developers are paying attention.
- **Proton is worth evaluating when your platform team is spending more than 20% of their time on customization requests.** Its template versioning model formalizes the separation between platform responsibilities and application team responsibilities — but it has a real setup cost. Don't adopt it prematurely.
- **Abstractions should simplify provisioning, not obscure observability.** Hiding VPC complexity is good; hiding deployment failure reasons or cost attribution is bad. Build your platform so that when something breaks, developers can reason about it.
- **Version your Terraform modules and treat breaking changes like a library author would.** An unversioned module updated mid-consumer is a production incident waiting to happen. Publish to a private registry, deprecate before removing, and write migration guides.
- **Measure usage before you build, and instrument everything after you ship.** Usage metrics are your product analytics. If you don't know which platform capabilities engineers actually use vs. route around, you're building blind.
