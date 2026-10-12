import type { APIRoute } from 'astro';
import { createRss } from '../lib/rss';
export const GET: APIRoute = ({ site }) => createRss('zh', site!);
