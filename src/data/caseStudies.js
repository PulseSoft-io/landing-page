export const caseStudies = {
  'aws-landing-zone': {
    title: 'AWS Landing Zone',
    subtitle: 'Multi-account AWS platform with centralized governance',
    overview:
      'Designed and deployed an AWS Landing Zone using AWS Organizations and Terraform to establish secure account boundaries and standardized infrastructure.',

    challenges: [
      'Manual account provisioning',
      'Inconsistent IAM policies',
      'Lack of centralized governance',
    ],

    solutions: [
      'AWS Organizations',
      'Terraform infrastructure-as-code',
      'Shared networking architecture',
      'Centralized logging and IAM',
    ],

    results: [
      'Reduced account provisioning time by 90%',
      'Improved security posture',
      'Standardized deployments',
    ],
  },

  'terraform-cicd': {
    title: 'Terraform CI/CD Platform',
    subtitle: 'Automated infrastructure deployments',

    overview:
      'Implemented a GitHub Actions pipeline to automatically validate, plan, and deploy Terraform infrastructure.',

    challenges: [
      'Manual deployments',
      'Configuration drift',
      'Lack of change visibility',
    ],

    solutions: [
      'GitHub Actions',
      'Terraform',
      'Pull request approval workflows',
    ],

    results: [
      '40% faster deployments',
      'Reduced infrastructure errors',
      'Repeatable deployments',
    ],
  },

  'server-migration': {
    title: 'Server Migration',
    subtitle: 'Migrating from monolith to serverless',

    overview:
      'Modernize from monolith to serverless: migrating a production application to AWS with zero data loss and a 9-minute cutover',

    challenges: [
      'Scaling applications',
      'Managing deployments',
      'Operational complexity',
    ],

    solutions: [
      'Amazon EKS',
      'Helm',
      'Ingress controllers',
      'Horizontal pod autoscaling',
    ],

    results: [
      '99.99% uptime',
      'Multi-region architecture',
      'Improved release velocity',
    ],
  },
};
