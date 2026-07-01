import {
  FaAws,
  FaBolt,
  FaBrain,
  FaChartLine,
  FaCode,
  FaCloud,
  FaCubes,
  FaDocker,
  FaGithub,
  FaHubspot,
  FaLock,
  FaMicrosoft,
  FaRegFileAlt,
  FaRobot,
  FaRocket,
  FaSalesforce,
  FaServer,
  FaSlack,
  FaSnowflake,
  FaStripe,
} from 'react-icons/fa';

import { HiMiniCpuChip } from 'react-icons/hi2';

import {
  SiDatadog,
  SiHashicorp,
  SiKubernetes,
  SiPrometheus,
  SiTerraform,
} from 'react-icons/si';

export const stats = [
  { label: 'Infrastructure Migrations', value: '120+' },
  { label: 'Avg. Cloud Cost Reduction', value: '35%' },
  { label: 'Production Uptime SLA', value: '99.99%' },
  // { label: 'Engineering Teams Served', value: '50+' },
];

export const features = [
  {
    icon: SiTerraform,
    title: 'Infrastructure as Code by Default',
    description:
      'Every environment we build is version-controlled and repeatable, no manual configuration drift.',
  },
  {
    icon: FaChartLine,
    title: 'Observability Built In',
    description:
      'Monitoring, logging, and alerting configured from day one, not added after an incident.',
  },
  {
    icon: FaLock,
    title: 'DevSecOps from the Start',
    description:
      'Security scanning, least-privilege IAM, and compliance checks built into every CI/CD pipeline.',
  },
];

export const services = [
  {
    icon: FaCloud,
    name: 'Cloud Architecture & Migration',
    summary:
      'AWS-native infrastructure design, legacy migrations, and Well-Architected reviews.',
  },
  {
    icon: SiTerraform,
    name: 'Infrastructure as Code',
    summary:
      'Terraform modules and GitOps workflows that make infrastructure changes safe, auditable, and repeatable.',
  },
  {
    icon: HiMiniCpuChip,
    name: 'AI Systems Engineering',
    summary:
      'RAG pipelines and LLM integrations built on production-grade infrastructure, not notebooks.',
  },
];

export const showcases = [
  {
    icon: FaCloud,
    title: 'AWS Landing Zone',
    description:
      'A fully automated account vending pipeline: 14 hand-managed accounts became 67 governed ones, provisioned in 22 minutes each, with SOC 2 evidence built in.',
    metric: 'Governance',
    slug: 'aws-landing-zone',
  },
  {
    icon: FaServer,
    title: 'Server Migration',
    description:
      'A live CloudEndure replication and nine-minute cutover took a six-year monolith off bare metal permanently and unlocked 94 production deploys the following quarter.',
    metric: 'Serverless',
    slug: 'server-migration',
  },
  {
    icon: FaCode,
    title: 'Terraform CI/CD',
    description:
      'A five-stage CodePipeline replaced local terraform apply with an approval-gated, KMS-encrypted workflow and closed the change management gap that was blocking SOC 2.',
    metric: 'IaC',
    slug: 'terraform-cicd',
  },
  {
    icon: FaRocket,
    title: 'Blue/Green ECS',
    description:
      'A CodePipeline Blue/Green delivery system on ECS Fargate retired the 2am deployment window, compressed rollback from 32 minutes to 87 seconds, and moved the team from bi-weekly releases to shipping 4.1 times per week.',
    metric: 'CI/CD',
    slug: 'blue-green-ecs',
  },
  {
    icon: FaCubes,
    title: 'EKS Platform',
    description:
      'A six-node EKS cluster across two availability zones with per-workload IRSA permissions took mean incident response from 22 minutes of manual triage to automatic rescheduling, three node failures in production, zero pages, zero customer impact.',
    metric: 'Kubernetes',
    slug: 'eks-platform',
  },
  {
    icon: FaChartLine,
    title: 'EKS Observability',
    description:
      'Replacing 140 misfiring CloudWatch alarms with 31 tuned Prometheus rules dropped alert volume from 60 per day to 4 and shifted detection from customer support tickets to automated 90-second pages, MTTR fell from 35 minutes to under 8.',
    metric: 'Observability',
    slug: 'eks-observability',
  },
];

export const workflowSteps = [
  {
    step: '01',
    title: 'Discovery & Architecture Assessment',
    detail:
      'We audit your current infrastructure, identify technical debt, and benchmark against the AWS Well-Architected Framework.',
  },
  {
    step: '02',
    title: 'Infrastructure as Code Implementation',
    detail:
      'We build your environment in Terraform, stand up CI/CD pipelines, and validate against real workloads before cutover.',
  },
  {
    step: '03',
    title: 'Operate & Optimize',
    detail:
      'We monitor reliability, tune Kubernetes workloads, and continuously optimize for cost and performance.',
  },
];

export const integrations = [
  { name: 'AWS', icon: FaAws },
  { name: 'Terraform', icon: SiTerraform },
  { name: 'Kubernetes', icon: SiKubernetes },
  { name: 'Docker', icon: FaDocker },
  { name: 'Github Actions', icon: FaGithub },
  { name: 'Datadog', icon: SiDatadog },
  { name: 'Prometheus', icon: SiPrometheus },
  { name: 'Hashicorp Vault', icon: SiHashicorp },
];

export const testimonials = [
  {
    quote: '"Found $4,200 a month in AWS waste we didn\'t know existed."',
    author: 'Edward C.',
    role: 'VP of engineering, Series B fintech',
  },
  {
    quote: '"We went from dreading deploys to shipping multiple times a day."',
    author: 'Ronak C.',
    role: 'Lead Developer, Productivity and Team Coordination Software Company',
  },
  {
    quote:
      '"New environments in 20 minutes. We passed our SOC 2 without scrambling."',
    author: 'Sana I.',
    role: 'R&D, Video Technology Software Company',
  },
];

export const pricing = [
  {
    tier: 'Sprint',
    // monthly: '$99',
    // annual: '$79',
    description:
      'Fixed-scope project (e.g., architecture assessment, single migration)',
    // features: ['1 AI workflow', 'Basic analytics', 'Email support'],
  },
  {
    tier: 'Managed Platform',
    // monthly: '$299',
    // annual: '$239',
    description:
      'Ongoing retainer. For teams that need continuous infrastructure operations and support.',
    // features: ['Unlimited workflows', 'Advanced analytics', 'Priority support'],
    // popular: true,
  },
  {
    tier: 'Enterprise',
    // monthly: 'Custom',
    // annual: 'Custom',
    description:
      'For organizations with complex, multi-account, or regulated environments.',
    // features: [
    //   'Private deployment',
    //   'SSO + compliance',
    //   'Dedicated AI architect',
    // ],
  },
];

export const faqs = [
  {
    q: 'How long does a typical infrastructure engagement take?',
    a: 'Most assessments complete in 1–2 weeks; full migrations typically run 6–12 weeks depending on scope.',
  },
  {
    q: 'Do you support hybrid, multi-cloud, or on-prem environments?',
    a: 'Yes. Growth and Enterprise customers can run on private cloud, VPC, or hybrid environments.',
  },
  {
    q: 'Can you work within our existing AWS account and CI/CD toolchain?',
    a: 'Absolutely. We provide connectors for common CRMs, warehouses, support tools, and custom APIs.',
  },
];

export const team = [
  {
    name: 'Michael Emmanuel',
    role: 'Founder & Principal Engineer, PulseSoft',
    detail:
      'Hands-on across the full stack: AWS, Terraform, Kubernetes, CI/CD pipelines, and AI systems integration from initial architecture to production in start up, healthcare, fintech and enterprise industries.',
  },
  // { name: 'Morteza P', role: 'CTO & ML Architect' },
  // { name: 'Soheil MV', role: 'Head of Product' },
];
