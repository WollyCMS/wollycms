import { eq, and } from 'drizzle-orm';
import type { AppDatabase } from '../index.js';
import { menus, menuItems } from '../schema/index.js';

export async function seedMenus(
  db: AppDatabase,
  pageMap: Record<string, number>,
) {
  // ---- Main Navigation ----
  const [mainMenu] = await db.insert(menus).values({
    name: 'Main Navigation',
    slug: 'main',
  }).returning();

  const mainItems = buildMainMenu(mainMenu.id, pageMap);
  await db.insert(menuItems).values(mainItems).returning();

  // ---- Top Bar ----
  const [topMenu] = await db.insert(menus).values({
    name: 'Top Bar',
    slug: 'top',
  }).returning();

  await db.insert(menuItems).values([
    { menuId: topMenu.id, title: 'Apply Now', url: '/apply-now', pageId: pageMap['apply-now'], target: '_self', position: 0, depth: 0, isExpanded: false },
    { menuId: topMenu.id, title: 'Visit Campus', url: '/visit', target: '_self', position: 1, depth: 0, isExpanded: false },
    { menuId: topMenu.id, title: 'Request Info', url: '/request-info', target: '_self', position: 2, depth: 0, isExpanded: false },
  ]).returning();

  // ---- Footer ----
  const [footerMenu] = await db.insert(menus).values({
    name: 'Footer',
    slug: 'footer',
  }).returning();

  await db.insert(menuItems).values([
    { menuId: footerMenu.id, title: 'Privacy Policy', url: '/privacy-policy', target: '_self', position: 0, depth: 0, isExpanded: false },
    { menuId: footerMenu.id, title: 'Terms of Use', url: '/terms-of-use', target: '_self', position: 1, depth: 0, isExpanded: false },
    { menuId: footerMenu.id, title: 'Accessibility', url: '/accessibility', target: '_self', position: 2, depth: 0, isExpanded: false },
    { menuId: footerMenu.id, title: 'Contact', url: '/contact', pageId: pageMap.contact, target: '_self', position: 3, depth: 0, isExpanded: false },
  ]).returning();

  console.log('  Seeded 3 menu(s) with items');
  return { mainMenu, topMenu, footerMenu };
}

function buildMainMenu(menuId: number, pm: Record<string, number>) {
  return [
    { menuId, title: 'Admissions', url: '/admissions', pageId: pm.admissions, target: '_self' as const, position: 0, depth: 0, isExpanded: true },
    { menuId, title: 'Academics', url: '/academic-programs', pageId: pm['academic-programs'], target: '_self' as const, position: 1, depth: 0, isExpanded: true },
    { menuId, title: 'Student Life', url: '/student-life', pageId: pm['student-life'], target: '_self' as const, position: 2, depth: 0, isExpanded: false },
    { menuId, title: 'About Us', url: '/about-us', pageId: pm['about-us'], target: '_self' as const, position: 3, depth: 0, isExpanded: false },
  ];
}

/**
 * Inserts nested child menu items for the main navigation (depth 1 and 2).
 * Must be called after seedMenus so parent IDs exist.
 */
export async function seedMainMenuChildren(
  db: AppDatabase,
  mainMenuId: number,
  pageMap: Record<string, number>,
) {
  const topItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.menuId, mainMenuId), eq(menuItems.depth, 0)));

  const admissionsId = topItems.find((i) => i.title === 'Admissions')!.id;
  const academicsId = topItems.find((i) => i.title === 'Academics')!.id;

  // Admissions children (depth 1)
  const admChildren = await db.insert(menuItems).values([
    { menuId: mainMenuId, parentId: admissionsId, title: 'Apply Now', url: '/apply-now', pageId: pageMap['apply-now'], target: '_self' as const, position: 0, depth: 1, isExpanded: false },
    { menuId: mainMenuId, parentId: admissionsId, title: 'Tuition & Fees', url: '/tuition-fees', target: '_self' as const, position: 1, depth: 1, isExpanded: false },
    { menuId: mainMenuId, parentId: admissionsId, title: 'Financial Aid', url: '/financial-aid', target: '_self' as const, position: 2, depth: 1, isExpanded: true },
  ]).returning();

  const finAidId = admChildren.find((i) => i.title === 'Financial Aid')!.id;

  // Financial Aid children (depth 2)
  await db.insert(menuItems).values([
    { menuId: mainMenuId, parentId: finAidId, title: 'Scholarships', url: '/financial-aid/scholarships', target: '_self' as const, position: 0, depth: 2, isExpanded: false },
    { menuId: mainMenuId, parentId: finAidId, title: 'FAFSA', url: '/financial-aid/fafsa', target: '_self' as const, position: 1, depth: 2, isExpanded: false },
  ]).returning();

  // Academics children (depth 1)
  await db.insert(menuItems).values([
    { menuId: mainMenuId, parentId: academicsId, title: 'Programs', url: '/academic-programs', pageId: pageMap['academic-programs'], target: '_self' as const, position: 0, depth: 1, isExpanded: false },
    { menuId: mainMenuId, parentId: academicsId, title: 'CITE Program', url: '/cite-program', pageId: pageMap['cite-program'], target: '_self' as const, position: 1, depth: 1, isExpanded: false },
  ]).returning();

  console.log('  Seeded main menu child items (3 levels)');
}
