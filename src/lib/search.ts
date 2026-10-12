import { SITE_TITLE } from '../consts';
import { conferencePublications, preprints } from '../data/publications';
import { getPublishedPosts, getPostUrl, POST_SECTIONS } from './posts';
import { messages, localePath, type Locale } from './i18n';

export async function createSearchIndex(locale: Locale) {
 const text = messages[locale];
 const pages = [
  { title: SITE_TITLE, description: text.personal, url: localePath(locale), section: 'Home', text: SITE_TITLE },
  { title: locale === 'zh' ? '关于我' : 'About Me', description: locale === 'zh' ? '南方科技大学2025级深港微电子学院本科生。' : 'SUSTech undergraduate, 2025 cohort, School of Microelectronics.', url: localePath(locale, '#about-me'), section: 'Home', text: locale === 'zh' ? '关于我 竞赛 开源 实习 科研 南方科技大学 NOIP Liii STEM Mogan Google Summer of Code 算法 插件 Gitee GVP 最有价值开源项目 GNU TeXmacs 一作 第一作者 EMNLP 录用 人工智能 CAE 计算机辅助工程 博弈科学 世界模型' : 'About me competitions open source internship research NOIP Liii STEM Mogan Google Summer of Code algorithms plugins Gitee GVP Most Valuable Open Source Project GNU TeXmacs first author EMNLP accepted artificial intelligence CAE computer-aided engineering game science world models' },
  { title: locale === 'zh' ? '学术论文' : 'Publications', description: text.publicationsDescription, url: localePath(locale, '#publications'), section: 'Home', text: locale === 'zh' ? '论文 成果 学术 会议 期刊 预印本' : 'Research papers publications scholar conference journal preprint' },
  { title: 'Article', description: text.articleDescription, url: localePath(locale, 'articles/'), section: 'Article', text: locale === 'zh' ? '文章' : 'Articles' },
  { title: 'Blog', description: text.blogDescription, url: localePath(locale, 'blog/'), section: 'Blog', text: locale === 'zh' ? '日志 日常' : 'Journal reflections' },
  { title: 'Gallery', description: text.galleryDescription, url: localePath(locale, 'gallery/'), section: 'Gallery', text: locale === 'zh' ? '相册 照片' : 'Photos moments' },
 ];
 const posts = await getPublishedPosts(undefined, locale);
 const publications = [...new Map([
  ...conferencePublications.map(publication => [publication.url, { publication, anchor: 'conference-journal' }] as const),
  ...preprints.map(publication => [publication.url, { publication, anchor: 'preprint' }] as const),
 ]).values()];
 return [...pages, ...publications.map(({ publication, anchor }) => ({
  title: publication.title, description: publication.venue ?? 'Preprint', url: localePath(locale, `#${anchor}`),
  section: 'Publications', text: `${publication.title} ${publication.date} ${publication.venue ?? ''}`,
 })), ...posts.map(post => ({
  title: post.data.title, description: post.data.description, url: getPostUrl(post),
  section: POST_SECTIONS[post.data.category].label, text: post.body ?? '',
 }))];
}
