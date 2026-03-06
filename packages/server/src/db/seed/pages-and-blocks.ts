import type { AppDatabase } from '../index.js';
import { pages, blocks, pageBlocks } from '../schema/index.js';

export function seedPagesAndBlocks(
  db: AppDatabase,
  contentTypeMap: Record<string, number>,
  blockTypeMap: Record<string, number>,
  adminId: number,
) {
  const now = new Date().toISOString();

  // --- Reusable / shared blocks ---
  const campusLocation = db.insert(blocks).values({
    typeId: blockTypeMap.location,
    title: 'Main Campus',
    fields: {
      name: 'Spacely College — Main Campus',
      address: '1200 University Boulevard',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
      phone: '(217) 555-1000',
      hours: 'Mon-Fri 8 AM – 5 PM',
      map_url: 'https://maps.example.com/spacely-campus',
    },
    isReusable: true,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  }).returning().get();

  const admissionsContacts = db.insert(blocks).values({
    typeId: blockTypeMap.contact_list,
    title: 'Admissions Office',
    fields: {
      heading: 'Admissions Office',
      contacts: [
        { name: 'Dr. Sarah Mitchell', role: 'Director of Admissions', phone: '(217) 555-1010', email: 'smitchell@spacely.edu' },
        { name: 'James Rivera', role: 'Admissions Counselor', phone: '(217) 555-1011', email: 'jrivera@spacely.edu' },
        { name: 'Emily Chen', role: 'Financial Aid Advisor', phone: '(217) 555-1020', email: 'echen@spacely.edu' },
      ],
    },
    isReusable: true,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  }).returning().get();

  const quickLinks = db.insert(blocks).values({
    typeId: blockTypeMap.link_list,
    title: 'Quick Links',
    fields: {
      heading: 'Quick Links',
      links: [
        { title: 'Academic Calendar', url: '/academic-calendar', description: 'Important dates and deadlines' },
        { title: 'Campus Map', url: '/campus-map', description: 'Interactive campus map' },
        { title: 'Student Portal', url: 'https://portal.spacely.edu', description: 'Access your student account' },
      ],
    },
    isReusable: true,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  }).returning().get();

  // --- Pages ---
  const insertedPages = db.insert(pages).values([
    { typeId: contentTypeMap.home_page, title: 'Home', slug: 'home', status: 'published' as const, fields: { tagline: 'Shaping futures through innovation and excellence.', hero_image: 'uploads/campus-aerial.jpg' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.secondary_page, title: 'About Us', slug: 'about-us', status: 'published' as const, fields: { subtitle: 'Our Mission & History' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.landing_page, title: 'Admissions', slug: 'admissions', status: 'published' as const, fields: { subtitle: 'Begin Your Journey', hero_cta_text: 'Apply Now', hero_cta_url: '/apply-now' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.secondary_page, title: 'Academic Programs', slug: 'academic-programs', status: 'published' as const, fields: { subtitle: 'Explore Our Degrees' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.secondary_page, title: 'Student Life', slug: 'student-life', status: 'published' as const, fields: { subtitle: 'Campus Experience' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.secondary_page, title: 'Contact', slug: 'contact', status: 'published' as const, fields: { subtitle: 'Get in Touch' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.landing_page, title: 'Apply Now', slug: 'apply-now', status: 'published' as const, fields: { subtitle: 'Start Your Application', hero_cta_text: 'Begin Application', hero_cta_url: '#application-form' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
    { typeId: contentTypeMap.secondary_page, title: 'CITE Program', slug: 'cite-program', status: 'published' as const, fields: { subtitle: 'Center for Innovation, Technology & Entrepreneurship' }, createdAt: now, updatedAt: now, publishedAt: now, createdBy: adminId },
  ]).returning().all();

  const pageMap: Record<string, number> = {};
  for (const p of insertedPages) {
    pageMap[p.slug] = p.id;
  }

  // --- Inline blocks + page-block assignments ---
  const inlineBlocks = createInlineBlocks(db, blockTypeMap, adminId, now);
  assignBlocksToPages(db, pageMap, inlineBlocks, campusLocation.id, admissionsContacts.id, quickLinks.id);

  console.log(`  Seeded ${insertedPages.length} page(s), 3 shared block(s), inline blocks assigned`);
  return { pageMap, campusLocationId: campusLocation.id, admissionsContactsId: admissionsContacts.id };
}

function createInlineBlocks(
  db: AppDatabase,
  bt: Record<string, number>,
  adminId: number,
  now: string,
) {
  const vals: (typeof blocks.$inferInsert)[] = [
    { typeId: bt.rich_text, title: 'Home Welcome', fields: { body: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Welcome to Spacely College' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Founded in 1965, Spacely College has been a cornerstone of higher education in the Springfield community for over sixty years. We offer more than 50 degree and certificate programs designed to prepare you for the careers of tomorrow.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.content_listing, title: 'Featured Programs', fields: { heading: 'Featured Programs', content_type: 'secondary_page', sort: 'newest', limit: 4, display: 'card_grid' }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.cta_button, title: 'Home CTA', fields: { text: 'Schedule a Campus Visit', url: '/visit', style: 'primary' }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'About Body', fields: { body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spacely College is a comprehensive community college accredited by the Higher Learning Commission. Our mission is to provide accessible, high-quality education that empowers students to achieve their academic, career, and personal goals.' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'With a student-to-faculty ratio of 18:1 and average class sizes of 24, our students receive the individualized attention they need to succeed.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'Admissions Intro', fields: { body: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Your Path Starts Here' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Whether you are a first-time college student, transferring from another institution, or returning to complete your degree, Spacely College has an admissions pathway for you.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.accordion, title: 'Admissions FAQ', fields: { heading: 'Frequently Asked Questions', items: [{ title: 'What are the admission requirements?', body: 'Applicants must have a high school diploma or GED equivalent. Placement testing may be required for certain programs.' }, { title: 'When is the application deadline?', body: 'We operate on a rolling admissions basis. Priority deadlines are August 1 for fall and December 1 for spring.' }, { title: 'How much is tuition?', body: 'In-district tuition is $145 per credit hour. Out-of-district rates and fees are available on our Tuition & Fees page.' }], default_open: true }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'Programs Body', fields: { body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spacely College offers associate degrees, certificates, and professional development programs across five academic divisions. Explore our offerings to find the right fit for your goals.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.accordion, title: 'Program Areas', fields: { heading: 'Program Areas', items: [{ title: 'Arts & Sciences', body: 'Liberal arts transfer programs, general education courses, and pre-professional pathways.' }, { title: 'Business & Technology', body: 'Accounting, management, cybersecurity, web development, and IT support programs.' }, { title: 'Health Sciences', body: 'Nursing (RN), dental hygiene, medical coding, and emergency medical services.' }, { title: 'Skilled Trades', body: 'Welding, HVAC, electrical technology, and advanced manufacturing.' }], default_open: false }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'Student Life Body', fields: { body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Life at Spacely College extends far beyond the classroom. With over 30 student clubs and organizations, intramural sports, cultural events, and community service opportunities, there is always something happening on campus.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.image, title: 'Student Life Photo', fields: { image: 'uploads/campus-student-life.jpg', caption: 'Students enjoy the annual Fall Festival on the campus quad.', alt: 'Students at fall festival' }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'Contact Body', fields: { body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'We would love to hear from you. Reach out to any of our offices below or stop by campus during business hours.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'Apply Intro', fields: { body: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Ready to Apply?' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Completing your application takes about 15 minutes. You will need your Social Security number, high school information, and intended program of study.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.cta_button, title: 'Apply CTA', fields: { text: 'Start Your Application', url: 'https://apply.spacely.edu', style: 'primary' }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.rich_text, title: 'CITE Intro', fields: { body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The Center for Innovation, Technology & Entrepreneurship (CITE) is Spacely College\'s hub for workforce development and technology training. CITE partners with regional employers to deliver customized training, industry certifications, and continuing education programs.' }] }] } }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
    { typeId: bt.link_list, title: 'CITE Resources', fields: { heading: 'CITE Resources', links: [{ title: 'Workforce Training Catalog', url: '/cite-program/catalog', description: 'Browse current course offerings' }, { title: 'Employer Partnerships', url: '/cite-program/partners', description: 'Learn about our industry partners' }, { title: 'Contact CITE', url: '/contact', description: 'Reach the CITE team' }] }, isReusable: false, createdAt: now, updatedAt: now, createdBy: adminId },
  ];

  return db.insert(blocks).values(vals).returning().all();
}

function assignBlocksToPages(
  db: AppDatabase,
  pm: Record<string, number>,
  ib: { id: number; title: string | null }[],
  campusId: number,
  admContactsId: number,
  quickLinksId: number,
) {
  const byTitle = (t: string) => ib.find((b) => b.title === t)!.id;

  const assignments = [
    // Home
    { pageId: pm.home, blockId: byTitle('Home Welcome'), region: 'content', position: 0, isShared: false },
    { pageId: pm.home, blockId: byTitle('Featured Programs'), region: 'features', position: 0, isShared: false },
    { pageId: pm.home, blockId: byTitle('Home CTA'), region: 'bottom', position: 0, isShared: false },
    // About Us
    { pageId: pm['about-us'], blockId: byTitle('About Body'), region: 'content', position: 0, isShared: false },
    { pageId: pm['about-us'], blockId: campusId, region: 'sidebar', position: 0, isShared: true },
    // Admissions
    { pageId: pm.admissions, blockId: byTitle('Admissions Intro'), region: 'content', position: 0, isShared: false },
    { pageId: pm.admissions, blockId: byTitle('Admissions FAQ'), region: 'content', position: 1, isShared: false },
    { pageId: pm.admissions, blockId: admContactsId, region: 'sidebar', position: 0, isShared: true },
    // Academic Programs
    { pageId: pm['academic-programs'], blockId: byTitle('Programs Body'), region: 'content', position: 0, isShared: false },
    { pageId: pm['academic-programs'], blockId: byTitle('Program Areas'), region: 'content', position: 1, isShared: false },
    { pageId: pm['academic-programs'], blockId: quickLinksId, region: 'sidebar', position: 0, isShared: true },
    // Student Life
    { pageId: pm['student-life'], blockId: byTitle('Student Life Body'), region: 'content', position: 0, isShared: false },
    { pageId: pm['student-life'], blockId: byTitle('Student Life Photo'), region: 'content', position: 1, isShared: false },
    { pageId: pm['student-life'], blockId: quickLinksId, region: 'sidebar', position: 0, isShared: true },
    // Contact
    { pageId: pm.contact, blockId: byTitle('Contact Body'), region: 'content', position: 0, isShared: false },
    { pageId: pm.contact, blockId: admContactsId, region: 'content', position: 1, isShared: true },
    { pageId: pm.contact, blockId: campusId, region: 'sidebar', position: 0, isShared: true },
    // Apply Now
    { pageId: pm['apply-now'], blockId: byTitle('Apply Intro'), region: 'content', position: 0, isShared: false },
    { pageId: pm['apply-now'], blockId: byTitle('Apply CTA'), region: 'content', position: 1, isShared: false },
    { pageId: pm['apply-now'], blockId: admContactsId, region: 'sidebar', position: 0, isShared: true },
    // CITE Program
    { pageId: pm['cite-program'], blockId: byTitle('CITE Intro'), region: 'content', position: 0, isShared: false },
    { pageId: pm['cite-program'], blockId: byTitle('CITE Resources'), region: 'content', position: 1, isShared: false },
    { pageId: pm['cite-program'], blockId: campusId, region: 'sidebar', position: 0, isShared: true },
  ];

  db.insert(pageBlocks).values(assignments).returning().all();
}
