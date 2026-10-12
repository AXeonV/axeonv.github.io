import { SITE_TITLE } from '../consts';
import { conferencePublications, preprints } from '../data/publications';
import { getPublishedPosts, getPostUrl, POST_SECTIONS } from './posts';
import { messages, localePath, type Locale } from './i18n';

export async function createSearchIndex(locale: Locale) {
 const text = messages[locale];
 const pages = [
  { title: SITE_TITLE, description: text.personal, url: localePath(locale), section: 'Home', text: SITE_TITLE },
  { title: 'About Me', description: text.aboutPending, url: localePath(locale, '#about-me'), section: 'Home', text: locale === 'zh' ? '关于我 个人介绍' : 'About me biography' },
  { title: 'Publications', description: text.publicationsDescription, url: localePath(locale, '#publications'), section: 'Home', text: locale === 'zh' ? '论文 成果 学术' : 'Research papers publications scholar' },
  { title: 'Notes', description: text.writing, url: localePath(locale, '#notes'), section: 'Home', text: locale === 'zh' ? '笔记' : 'Notes' },
  { title: 'Contributions to Open Source Projects', description: locale === 'zh' ? '开源项目贡献待更新。' : 'Open source contributions coming soon.', url: localePath(locale, '#open-source'), section: 'Home', text: locale === 'zh' ? '开源 项目 贡献' : 'Open source projects contributions' },
  { title: 'Article', description: text.articleDescription, url: localePath(locale, 'articles/'), section: 'Article', text: locale === 'zh' ? '文章' : 'Articles' },
  { title: 'Blog', description: text.blogDescription, url: localePath(locale, 'blog/'), section: 'Blog', text: locale === 'zh' ? '日志 日常' : 'Journal reflections' },
  { title: 'Gallery', description: text.galleryDescription, url: localePath(locale, 'gallery/'), section: 'Gallery', text: locale === 'zh' ? '相册 照片' : 'Photos moments' },
 ];
 const posts = await getPublishedPosts(undefined, locale);
 const publications = [...conferencePublications.map(publication => ({ publication, anchor: 'conference-journal' })), ...preprints.map(publication => ({ publication, anchor: 'preprint' }))];
 return [...pages, ...publications.map(({ publication, anchor }) => ({
  title: publication.title, description: publication.venue ?? 'Preprint', url: localePath(locale, `#${anchor}`),
  section: 'Publications', text: `${publication.title} ${publication.date} ${publication.venue ?? ''}`,
 })), ...posts.map(post => ({
  title: post.data.title, description: post.data.description, url: getPostUrl(post),
  section: POST_SECTIONS[post.data.category].label, text: post.body ?? '',
 }))];
}
