import type { APIRoute } from 'astro';
import { createSearchIndex } from '../lib/search';
export const GET: APIRoute = async () => new Response(
 JSON.stringify(await createSearchIndex('zh')),
 { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
);
