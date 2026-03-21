// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import cloudflare from '@astrojs/cloudflare';

const gaId = process.env.GA_MEASUREMENT_ID;

export default defineConfig({
	site: 'https://docs.wollycms.com',
	output: 'server',
	adapter: cloudflare(),
	integrations: [
		starlight({
			title: 'WollyCMS Docs',
			head: gaId ? [
				{
					tag: 'script',
					attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${gaId}` },
				},
				{
					tag: 'script',
					content: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
				},
			] : [],
			logo: {
				light: '/src/assets/logo-light.svg',
				dark: '/src/assets/logo-dark.svg',
				replacesTitle: false,
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wollycms/wollycms' }],
			customCss: [],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'Project Structure', slug: 'getting-started/project-structure' },
					],
				},
				{
					label: 'Core Concepts',
					items: [
						{ label: 'Pages & Content Types', slug: 'concepts/pages' },
						{ label: 'Blocks & Regions', slug: 'concepts/blocks' },
						{ label: 'Menus', slug: 'concepts/menus' },
						{ label: 'Media', slug: 'concepts/media' },
						{ label: 'Taxonomies', slug: 'concepts/taxonomies' },
						{ label: 'Preview', slug: 'concepts/preview' },
						{ label: 'Revisions', slug: 'concepts/revisions' },
						{ label: 'Accessibility', slug: 'concepts/accessibility' },
						{ label: 'API Keys', slug: 'concepts/api-keys' },
						{ label: 'Webhooks', slug: 'concepts/webhooks' },
						{ label: 'Tracking Scripts', slug: 'concepts/tracking' },
					],
				},
				{
					label: 'Astro Integration',
					items: [
						{ label: 'Setup', slug: 'astro/setup' },
						{ label: 'BlockRenderer', slug: 'astro/block-renderer' },
						{ label: 'Menu Helpers', slug: 'astro/menus' },
						{ label: 'Images', slug: 'astro/images' },
						{ label: 'SEO', slug: 'astro/seo' },
					],
				},
				{
					label: 'Deployment',
					items: [
						{ label: 'Cloudflare Workers', slug: 'deployment/cloudflare' },
						{ label: 'Docker', slug: 'deployment/docker' },
						{ label: 'Node.js', slug: 'deployment/nodejs' },
					],
				},
				{
					label: 'API Reference',
					autogenerate: { directory: 'api' },
				},
			],
		}),
	],
});
