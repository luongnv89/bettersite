import type { APIRoute } from 'astro';
import { withBase } from '../lib/url';

// These are the six public HTML routes. Exclude Markdown mirrors, assets,
// auth documents and demonstration fixtures from the search sitemap.
const paths = ['', 'privacy/', 'brand/'];
const locales = ['en', 'fr'] as const;
const xmlEscape = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[char]!));

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Set site in astro.config.mjs before generating the sitemap.');
  const href = (path: string, locale: typeof locales[number]) =>
    xmlEscape(new URL(withBase(locale === 'fr' ? `fr/${path}` : path), site).toString());
  const entries = paths.flatMap((path) => locales.map((locale) => `  <url>
    <loc>${href(path, locale)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${href(path, 'en')}" />
    <xhtml:link rel="alternate" hreflang="fr" href="${href(path, 'fr')}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${href(path, 'en')}" />
  </url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>\n`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
