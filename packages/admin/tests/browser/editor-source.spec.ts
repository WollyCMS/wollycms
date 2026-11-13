import { expect, test, type Page } from '@playwright/test';

async function saved(page: Page) {
  return JSON.parse(await page.getByTestId('saved').innerText());
}

function images(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(images);
  if (!node || typeof node !== 'object') return [];
  return node.type === 'image' ? [node.attrs] : Object.values(node).flatMap(images);
}

async function openSource(page: Page) {
  await page.getByTitle('HTML Source', { exact: true }).click();
  return page.locator('textarea.rte-source');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ProseMirror')).toBeVisible();
});

test('fixture enforces the admin CSP that triggers this regression', async ({ page }) => {
  const result = await page.evaluate(() => {
    const parsed = new DOMParser().parseFromString('<img style="width:50%;float:right">', 'text/html');
    const image = parsed.querySelector('img')!;
    return { raw: image.getAttribute('style'), width: image.style.width, float: image.style.cssFloat };
  });
  expect(result).toEqual({ raw: 'width:50%;float:right', width: '', float: '' });
});

test('all sizes/alignments and table images survive repeated source round trips', async ({ page }) => {
  await page.goto('/?fixture=matrix');
  const before = images(await saved(page));
  for (let i = 0; i < 2; i++) {
    const source = await openSource(page);
    const html = await source.inputValue();
    expect(html).toContain('data-width="50%"');
    expect(html).toContain('data-float="center"');
    await page.getByTitle('Visual editor', { exact: true }).click();
    expect(images(await saved(page))).toEqual(before);
  }
  const doc = await saved(page);
  const paragraph = doc.content.find((node: any) => node.type === 'paragraph');
  const heading = doc.content.find((node: any) => node.type === 'heading');
  expect(paragraph.attrs.textAlign).toBe('center');
  expect(paragraph.content[0].marks[0].attrs.color).toMatch(/#123456|rgb\(18, 52, 86\)/);
  expect(heading.attrs).toMatchObject({ textAlign: 'right', id: 'hours', level: 2 });
});

for (const exit of ['visual', 'blur'] as const) {
  test(`accordion paragraph-to-line-break edit survives ${exit} and save/reload`, async ({ page }) => {
    const before = images(await saved(page));
    const source = await openSource(page);
    const html = await source.inputValue();
    const edited = html.replace('</p><p>Monday through Thursday</p>', '<br>Monday through Thursday</p>');
    expect(edited).not.toBe(html);
    await source.fill(edited);
    if (exit === 'visual') await page.getByTitle('Visual editor', { exact: true }).click();
    // Clicking Save also exercises source textarea blur before the save handler.
    await page.getByRole('button', { name: 'Save fixture', exact: true }).click();
    expect(images(await saved(page))).toEqual(before);
    expect(JSON.stringify(await saved(page))).toContain('hardBreak');
    await page.reload();
    expect(images(await saved(page))).toEqual(before);
    expect(JSON.stringify(await saved(page))).toContain('hardBreak');
    await page.locator('.ProseMirror').press('ArrowRight');
    await page.locator('.ProseMirror img').click();
    const toolbar = page.locator('.rte-image-toolbar');
    await expect(toolbar.getByRole('button', { name: 'M', exact: true })).toHaveClass(/active/);
    await expect(toolbar.getByRole('button', { name: 'Right', exact: true })).toHaveClass(/active/);
    await expect(page.getByTestId('rendered').locator('figure')).toHaveAttribute('class', 'fig-right');
    await expect(page.getByTestId('rendered').locator('figure')).toHaveAttribute('style', 'width: 50%');
    await expect(page.getByTestId('rendered').locator('a')).toHaveAttribute('href', '/visit');
  });
}

test('ordinary visual text editing preserves the accordion image', async ({ page }) => {
  const before = images(await saved(page));
  // The initial selection is the first (image) node. Move into adjacent text.
  await page.locator('.ProseMirror').press('ArrowRight');
  await page.keyboard.type(' updated');
  await page.getByRole('button', { name: 'Save fixture', exact: true }).click();
  expect(images(await saved(page))).toEqual(before);
  expect(JSON.stringify(await saved(page))).toContain('updated');
});

test('legacy style-only HTML retains image and text alignment', async ({ page }) => {
  const source = await openSource(page);
  const html = (await source.inputValue()).replace(/ data-(?:width|float|text-align)="[^"]*"/g, '');
  await source.fill(html);
  await page.getByTitle('Visual editor', { exact: true }).click();
  const doc = (await saved(page))[0].body;
  expect(images(doc)[0]).toMatchObject({ width: '50%', float: 'right', caption: 'Campus photograph', href: '/visit' });
  expect(doc.content.find((node: any) => node.type === 'paragraph').attrs.textAlign).toBe('center');
  expect(doc.content.find((node: any) => node.type === 'heading').attrs.textAlign).toBe('right');
});

test('legacy center shorthand, custom lengths, and safe data-attribute precedence', async ({ page }) => {
  const source = await openSource(page);
  await source.fill(`<img src="/image.svg" style="width:320px; margin:0 auto !important">
    <img src="/image.svg" data-width="25%" data-float="right" style="width:75%;float:left">
    <img src="/image.svg" data-width="50%;position:fixed" data-float="right;position:fixed">
    <p data-text-align="right" style="text-align:left">Hours</p>`);
  await page.getByTitle('Visual editor', { exact: true }).click();
  const doc = (await saved(page))[0].body;
  expect(images(doc)).toMatchObject([
    { width: '320px', float: 'center' },
    { width: '25%', float: 'right' },
    { width: null, float: 'none' },
  ]);
  expect(doc.content.find((node: any) => node.type === 'paragraph').attrs.textAlign).toBe('right');
});
