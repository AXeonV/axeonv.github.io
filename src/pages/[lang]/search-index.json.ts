import type { APIRoute } from 'astro';
import { LOCALES, type Locale } from '../../lib/i18n';
import { createSearchIndex } from '../../lib/search';
export function getStaticPaths() { return LOCALES.map(lang => ({ params: { lang } })); }
export const GET: APIRoute = async ({ params }) => new Response(
 JSON.stringify(await createSearchIndex(params.lang as Locale)),
 { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
);
