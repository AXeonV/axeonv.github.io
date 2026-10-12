import { getCollection, type CollectionEntry } from 'astro:content';
import { LOCALES, DEFAULT_LOCALE, localePath, type Locale, type Translations } from './i18n';

export type Post = CollectionEntry<'posts'>;
export type PostCategory = Post['data']['category'];
export const POST_SECTIONS = {
 article: { label: 'Article', path: 'articles/' },
 blog: { label: 'Blog', path: 'blog/' },
} satisfies Record<PostCategory, { label: string; path: string }>;

export function getPostLocale(post: Post): Locale {
 return post.id.startsWith('en/') ? 'en' : DEFAULT_LOCALE;
}
export function getPostSlug(post: Post): string {
 return post.id.replace(/^(zh|en)\//, '');
}
export async function getPublishedPosts(category?: PostCategory, locale?: Locale): Promise<Post[]> {
 const posts = await getCollection('posts', ({ data }) => !data.draft && (!category || data.category === category));
 return posts.filter(post => !locale || getPostLocale(post) === locale)
  .sort((a,b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
export function getPostUrl(post: Post): string {
 return localePath(getPostLocale(post), `${POST_SECTIONS[post.data.category].path}${getPostSlug(post)}/`);
}
export async function getPostTranslations(post: Post): Promise<Translations> {
 const key = post.data.translationKey ?? getPostSlug(post);
 const entries = await getPublishedPosts(post.data.category);
 const translations: Translations = {};
 for (const locale of LOCALES) {
  const match = entries.find(entry => getPostLocale(entry) === locale && (entry.data.translationKey ?? getPostSlug(entry)) === key);
  if (match) translations[locale] = getPostUrl(match);
 }
 return translations;
}
