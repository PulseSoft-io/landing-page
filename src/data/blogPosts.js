const lorem = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed viverra, nunc at gravida vulputate, lectus velit elementum risus, vitae feugiat mauris augue non purus. Integer euismod sapien sed erat consequat, et feugiat justo posuere. Praesent pretium nisi sit amet risus malesuada, vitae suscipit augue gravida. Suspendisse potenti.

Curabitur id luctus lorem. Sed eu risus quis odio vulputate hendrerit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec volutpat feugiat lectus, sed ultricies velit tincidunt sed. Nulla facilisi. Donec gravida, erat vitae suscipit suscipit, lacus nisl consequat massa, vel bibendum erat massa sit amet nisi.

Aliquam erat volutpat. Duis gravida ipsum in est egestas, sed pulvinar ipsum tincidunt. Maecenas posuere lacus vel tellus luctus, nec fermentum elit feugiat. Quisque gravida neque vitae sapien pretium, vitae vulputate erat eleifend.

Donec id eros vitae turpis aliquam convallis. Cras tempor, tortor vel porttitor pulvinar, urna neque efficitur odio, quis volutpat justo augue vitae libero. Sed consequat suscipit velit, vitae ultrices ipsum dictum non.

Vestibulum congue nisl vitae tellus facilisis, vitae dignissim mauris consequat. Sed bibendum nisi vitae lorem luctus, sed ultrices est laoreet. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.
`;

const blogPosts = [
  {
    id: 'post-1', // change to action title for better SEO I.E. "terraform-aws-best-practices"
    title: 'Lorem Ipsum: The Art of Placeholder Text',
    excerpt:
      "Lorem ipsum has been the industry's standard placeholder text for decades. Explore why it remains indispensable in design, engineering, and publishing workflows.",
    content: lorem,
    author: 'Jane Doe',
    date: 'June 20, 2026',
    readTime: '5 min read',
    coverImage: 'https://picsum.photos/seed/post-1/1200/700',
  },
  {
    id: 'post-2',
    title: 'Designing Better Digital Experiences',
    excerpt:
      'Great user experiences emerge from thoughtful iteration, clear communication, and relentless attention to detail throughout the product lifecycle.',
    content: lorem,
    author: 'Jane Doe',
    date: 'June 17, 2026',
    readTime: '6 min read',
    coverImage: 'https://picsum.photos/seed/post-2/1200/700',
  },
  {
    id: 'post-3',
    title: 'Scaling Modern Cloud Infrastructure',
    excerpt:
      'From automation to observability, discover the building blocks behind resilient cloud-native platforms and high-performing engineering teams.',
    content: lorem,
    author: 'John Smith',
    date: 'June 14, 2026',
    readTime: '7 min read',
    coverImage: 'https://picsum.photos/seed/post-3/1200/700',
  },
  {
    id: 'post-4',
    title: 'Building Products That Last',
    excerpt:
      'Long-term product success depends on maintainability, performance, and delivering consistent value rather than chasing short-lived trends.',
    content: lorem,
    author: 'Emily Wilson',
    date: 'June 10, 2026',
    readTime: '4 min read',
    coverImage: 'https://picsum.photos/seed/post-4/1200/700',
  },
  {
    id: 'post-5',
    title: 'Engineering for Reliability',
    excerpt:
      "Reliability isn't accidental. Learn how disciplined engineering practices reduce downtime and increase confidence in every deployment.",
    content: lorem,
    author: 'Michael Johnson',
    date: 'June 4, 2026',
    readTime: '8 min read',
    coverImage: 'https://picsum.photos/seed/post-5/1200/700',
  },
  // Testing multiple pages
  // {
  //   id: 'post-6', // change to action title for better SEO I.E. "terraform-aws-best-practices"
  //   title: 'Lorem Ipsum: The Art of Placeholder Text',
  //   excerpt:
  //     "Lorem ipsum has been the industry's standard placeholder text for decades. Explore why it remains indispensable in design, engineering, and publishing workflows.",
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 20, 2026',
  //   readTime: '5 min read',
  //   coverImage: 'https://picsum.photos/seed/post-1/1200/700',
  // },
  // {
  //   id: 'post-7',
  //   title: 'Designing Better Digital Experiences',
  //   excerpt:
  //     'Great user experiences emerge from thoughtful iteration, clear communication, and relentless attention to detail throughout the product lifecycle.',
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 17, 2026',
  //   readTime: '6 min read',
  //   coverImage: 'https://picsum.photos/seed/post-2/1200/700',
  // },
  // {
  //   id: 'post-8',
  //   title: 'Scaling Modern Cloud Infrastructure',
  //   excerpt:
  //     'From automation to observability, discover the building blocks behind resilient cloud-native platforms and high-performing engineering teams.',
  //   content: lorem,
  //   author: 'John Smith',
  //   date: 'June 14, 2026',
  //   readTime: '7 min read',
  //   coverImage: 'https://picsum.photos/seed/post-3/1200/700',
  // },
  // {
  //   id: 'post-9',
  //   title: 'Building Products That Last',
  //   excerpt:
  //     'Long-term product success depends on maintainability, performance, and delivering consistent value rather than chasing short-lived trends.',
  //   content: lorem,
  //   author: 'Emily Wilson',
  //   date: 'June 10, 2026',
  //   readTime: '4 min read',
  //   coverImage: 'https://picsum.photos/seed/post-4/1200/700',
  // },
  // {
  //   id: 'post-10',
  //   title: 'Engineering for Reliability',
  //   excerpt:
  //     "Reliability isn't accidental. Learn how disciplined engineering practices reduce downtime and increase confidence in every deployment.",
  //   content: lorem,
  //   author: 'Michael Johnson',
  //   date: 'June 4, 2026',
  //   readTime: '8 min read',
  //   coverImage: 'https://picsum.photos/seed/post-5/1200/700',
  // },
  // {
  //   id: 'post-11', // change to action title for better SEO I.E. "terraform-aws-best-practices"
  //   title: 'Lorem Ipsum: The Art of Placeholder Text',
  //   excerpt:
  //     "Lorem ipsum has been the industry's standard placeholder text for decades. Explore why it remains indispensable in design, engineering, and publishing workflows.",
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 20, 2026',
  //   readTime: '5 min read',
  //   coverImage: 'https://picsum.photos/seed/post-1/1200/700',
  // },
  // {
  //   id: 'post-12',
  //   title: 'Designing Better Digital Experiences',
  //   excerpt:
  //     'Great user experiences emerge from thoughtful iteration, clear communication, and relentless attention to detail throughout the product lifecycle.',
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 17, 2026',
  //   readTime: '6 min read',
  //   coverImage: 'https://picsum.photos/seed/post-2/1200/700',
  // },
  // {
  //   id: 'post-13',
  //   title: 'Scaling Modern Cloud Infrastructure',
  //   excerpt:
  //     'From automation to observability, discover the building blocks behind resilient cloud-native platforms and high-performing engineering teams.',
  //   content: lorem,
  //   author: 'John Smith',
  //   date: 'June 14, 2026',
  //   readTime: '7 min read',
  //   coverImage: 'https://picsum.photos/seed/post-3/1200/700',
  // },
  // {
  //   id: 'post-14',
  //   title: 'Building Products That Last',
  //   excerpt:
  //     'Long-term product success depends on maintainability, performance, and delivering consistent value rather than chasing short-lived trends.',
  //   content: lorem,
  //   author: 'Emily Wilson',
  //   date: 'June 10, 2026',
  //   readTime: '4 min read',
  //   coverImage: 'https://picsum.photos/seed/post-4/1200/700',
  // },
  // {
  //   id: 'post-15',
  //   title: 'Engineering for Reliability',
  //   excerpt:
  //     "Reliability isn't accidental. Learn how disciplined engineering practices reduce downtime and increase confidence in every deployment.",
  //   content: lorem,
  //   author: 'Michael Johnson',
  //   date: 'June 4, 2026',
  //   readTime: '8 min read',
  //   coverImage: 'https://picsum.photos/seed/post-5/1200/700',
  // },
  // {
  //   id: 'post-16', // change to action title for better SEO I.E. "terraform-aws-best-practices"
  //   title: 'Lorem Ipsum: The Art of Placeholder Text',
  //   excerpt:
  //     "Lorem ipsum has been the industry's standard placeholder text for decades. Explore why it remains indispensable in design, engineering, and publishing workflows.",
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 20, 2026',
  //   readTime: '5 min read',
  //   coverImage: 'https://picsum.photos/seed/post-1/1200/700',
  // },
  // {
  //   id: 'post-17',
  //   title: 'Designing Better Digital Experiences',
  //   excerpt:
  //     'Great user experiences emerge from thoughtful iteration, clear communication, and relentless attention to detail throughout the product lifecycle.',
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 17, 2026',
  //   readTime: '6 min read',
  //   coverImage: 'https://picsum.photos/seed/post-2/1200/700',
  // },
  // {
  //   id: 'post-18',
  //   title: 'Scaling Modern Cloud Infrastructure',
  //   excerpt:
  //     'From automation to observability, discover the building blocks behind resilient cloud-native platforms and high-performing engineering teams.',
  //   content: lorem,
  //   author: 'John Smith',
  //   date: 'June 14, 2026',
  //   readTime: '7 min read',
  //   coverImage: 'https://picsum.photos/seed/post-3/1200/700',
  // },
  // {
  //   id: 'post-19',
  //   title: 'Building Products That Last',
  //   excerpt:
  //     'Long-term product success depends on maintainability, performance, and delivering consistent value rather than chasing short-lived trends.',
  //   content: lorem,
  //   author: 'Emily Wilson',
  //   date: 'June 10, 2026',
  //   readTime: '4 min read',
  //   coverImage: 'https://picsum.photos/seed/post-4/1200/700',
  // },
  // {
  //   id: 'post-20',
  //   title: 'Engineering for Reliability',
  //   excerpt:
  //     "Reliability isn't accidental. Learn how disciplined engineering practices reduce downtime and increase confidence in every deployment.",
  //   content: lorem,
  //   author: 'Michael Johnson',
  //   date: 'June 4, 2026',
  //   readTime: '8 min read',
  //   coverImage: 'https://picsum.photos/seed/post-5/1200/700',
  // },
  // {
  //   id: 'post-21', // change to action title for better SEO I.E. "terraform-aws-best-practices"
  //   title: 'Lorem Ipsum: The Art of Placeholder Text',
  //   excerpt:
  //     "Lorem ipsum has been the industry's standard placeholder text for decades. Explore why it remains indispensable in design, engineering, and publishing workflows.",
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 20, 2026',
  //   readTime: '5 min read',
  //   coverImage: 'https://picsum.photos/seed/post-1/1200/700',
  // },
  // {
  //   id: 'post-22',
  //   title: 'Designing Better Digital Experiences',
  //   excerpt:
  //     'Great user experiences emerge from thoughtful iteration, clear communication, and relentless attention to detail throughout the product lifecycle.',
  //   content: lorem,
  //   author: 'Jane Doe',
  //   date: 'June 17, 2026',
  //   readTime: '6 min read',
  //   coverImage: 'https://picsum.photos/seed/post-2/1200/700',
  // },
  // {
  //   id: 'post-23',
  //   title: 'Scaling Modern Cloud Infrastructure',
  //   excerpt:
  //     'From automation to observability, discover the building blocks behind resilient cloud-native platforms and high-performing engineering teams.',
  //   content: lorem,
  //   author: 'John Smith',
  //   date: 'June 14, 2026',
  //   readTime: '7 min read',
  //   coverImage: 'https://picsum.photos/seed/post-3/1200/700',
  // },
  // {
  //   id: 'post-24',
  //   title: 'Building Products That Last',
  //   excerpt:
  //     'Long-term product success depends on maintainability, performance, and delivering consistent value rather than chasing short-lived trends.',
  //   content: lorem,
  //   author: 'Emily Wilson',
  //   date: 'June 10, 2026',
  //   readTime: '4 min read',
  //   coverImage: 'https://picsum.photos/seed/post-4/1200/700',
  // },
  // {
  //   id: 'post-25',
  //   title: 'Engineering for Reliability',
  //   excerpt:
  //     "Reliability isn't accidental. Learn how disciplined engineering practices reduce downtime and increase confidence in every deployment.",
  //   content: lorem,
  //   author: 'Michael Johnson',
  //   date: 'June 4, 2026',
  //   readTime: '8 min read',
  //   coverImage: 'https://picsum.photos/seed/post-5/1200/700',
  // },
];

export default blogPosts;
