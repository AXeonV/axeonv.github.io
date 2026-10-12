import rss from '@astrojs/rss';
import { SITE_TITLE } from '../consts';
import { getPublishedPosts, getPostUrl } from './posts';
import { messages, HTML_LANG, type Locale } from './i18n';

export async function createRss(locale: Locale, site: URL) {
 const posts = await getPublishedPosts(undefined, locale);
 return rss({
  title: SITE_TITLE, description: messages[locale].description, site,
  customData: `<language>${HTML_LANG[locale]}</language>`,
  items: posts.map(post => ({
   title: post.data.title, description: post.data.description,
   pubDate: post.data.pubDate, link: getPostUrl(post),
  })),
 });
}
