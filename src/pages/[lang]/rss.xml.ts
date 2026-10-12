import type { APIRoute } from 'astro';
import { LOCALES, type Locale } from '../../lib/i18n';
import { createRss } from '../../lib/rss';
export function getStaticPaths() { return LOCALES.map(lang => ({ params: { lang } })); }
export const GET: APIRoute = ({ params, site }) => createRss(params.lang as Locale, site!);
