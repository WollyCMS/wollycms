# WollyCMS College Template

A higher education site template with academic programs, news articles, events, department taxonomies, and campus information pages.

## What's included

- 6 content types, 10 block types, 12 sample pages
- Pre-configured taxonomies (Departments: Business, Sciences, Arts & Humanities, Health Sciences, Technology; Tags: admissions, financial-aid, student-life, athletics)
- Main navigation (About, Admissions, Academics, Student Life, Contact) and Footer navigation (Campus Map, Privacy, Accessibility)
- 2 sample academic programs, 2 news articles, 1 campus event
- Admissions page with FAQ accordion and apply CTA
- Contact page with departmental contact list
- Ready to customize

## Quick start

```bash
npx create-wolly my-site --template college
cd my-site
wolly migrate
wolly import templates/college/seed.json
wolly start
```

## Content types

| Content Type | Slug | Regions |
|-------------|------|---------|
| Home Page | `home_page` | hero, content, features, bottom |
| Landing Page | `landing_page` | hero, content, features, bottom |
| Secondary Page | `secondary_page` | hero, content, sidebar, bottom |
| Program | `program` | hero, content, sidebar |
| Article | `article` | hero, content, sidebar |
| Event | `event` | hero, content, sidebar |

**Program fields:** department, degree_type (associate/bachelor/certificate), credits, application_url
**Event fields:** event_date, event_time, location, registration_url
**Article fields:** body_summary, author, tags, published_date

## Block types

| Block Type | Slug | Description |
|-----------|------|-------------|
| Rich Text | `rich_text` | TipTap rich text content |
| Hero | `hero` | Banner with heading, subheading, and background image |
| Image | `image` | Single image with alt text and caption |
| CTA Button | `cta_button` | Call-to-action button with configurable style |
| Accordion | `accordion` | Expandable FAQ or collapsible content sections |
| Contact List | `contact_list` | List of contacts with name, title, email, phone |
| Location | `location` | Address, coordinates, and optional map embed |
| Content Listing | `content_listing` | Dynamic content listing filtered by type and taxonomy |
| Link List | `link_list` | Styled list of links with optional descriptions |
| Embed | `embed` | Embed external content via URL or HTML |
