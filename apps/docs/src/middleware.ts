import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
	const response = await next();

	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('text/html')) return response;

	let gaId: string | undefined;
	try {
		const { env } = await import('cloudflare:workers');
		gaId = (env as Record<string, string>).GA_MEASUREMENT_ID;
	} catch {
		// Not running on Workers (local dev without wrangler)
	}

	if (!gaId) return response;

	const gaScript = `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>`;

	const html = await response.text();
	const injected = html.replace('</head>', `${gaScript}</head>`);

	return new Response(injected, {
		status: response.status,
		headers: response.headers,
	});
});
