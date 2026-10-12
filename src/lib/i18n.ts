import { SITE_DESCRIPTION } from '../consts';

export const LOCALES = ['zh', 'en'] as const;
export type Locale = typeof LOCALES[number];
export type Translations = Partial<Record<Locale, string>>;
export const DEFAULT_LOCALE: Locale = 'zh';
export const LANGUAGE_LABELS: Record<Locale, string> = { zh: '简体中文', en: 'English' };
export const HTML_LANG: Record<Locale, string> = { zh: 'zh-CN', en: 'en' };

export function localeFromPath(path: string): Locale {
 return path.split('/')[1] === 'en' ? 'en' : 'zh';
}

export function localePath(locale: Locale, path = ''): string {
 return `/${locale}/${path.replace(/^\/+/, '')}`;
}

export function pageTranslations(path: string): Record<Locale, string> {
 const relative = path.replace(/^\/(zh|en)(?=\/|$)\/?/, '');
 return { zh: localePath('zh', relative), en: localePath('en', relative) };
}

export const messages = {
 zh: {
  description: SITE_DESCRIPTION, skip: '跳转到内容', mainNav: '主导航', mobileNav: '手机导航',
  menu: '网站菜单', darkMode: '深色模式', changeLanguage: '切换语言', outline: '本页目录',
  aboutPending: '个人介绍待更新。', publicationsDescription: '论文、会议成果与 Google Scholar。',
  articleDescription: '文章与笔记。', blogDescription: '日志与记录。', galleryDescription: '照片与影像。',
  emptyArticles: '暂无文章，内容将陆续更新。', emptyBlog: '暂无日志，内容将陆续更新。',
  emptyGallery: '暂无照片，内容将陆续更新。', updated: '更新于',
  search: '搜索本站', searchPlaceholder: '搜索文章、日志和页面…', searchKeyword: '搜索关键词',
  searchClose: '关闭搜索', searchInitial: '输入关键词，搜索本站。', searchResults: '搜索结果',
  searchFound: '找到 {count} 条结果', searchEmpty: '没有找到相关内容。', searchQuick: '快速访问',
  searchLoading: '正在加载搜索…', searchError: '搜索暂时无法加载，请关闭后重试。',
  searchHelp: '↑ ↓ 选择 · Enter 打开 · Esc 关闭',
  translationPending: '尚无中文译文，查看中文列表', personal: '个人主页', writing: '写作与记录',
 },
 en: {
  description: 'Personal website of Alex Tianyou Liu 刘天佑 · Articles, Blog & Gallery',
  skip: 'Skip to content', mainNav: 'Main navigation', mobileNav: 'Mobile navigation',
  menu: 'Site menu', darkMode: 'Dark mode', changeLanguage: 'Change language', outline: 'On this page',
  aboutPending: 'Personal introduction coming soon.', publicationsDescription: 'Research publications, conference papers and Google Scholar.',
  articleDescription: 'Articles and notes.', blogDescription: 'Journal and reflections.', galleryDescription: 'Photos and moments.',
  emptyArticles: 'No articles yet. New writing is on the way.', emptyBlog: 'No posts yet. More stories to come.',
  emptyGallery: 'No photos yet. More moments to come.', updated: 'Updated',
  search: 'Search this site', searchPlaceholder: 'Search articles, posts and pages…', searchKeyword: 'Search keywords',
  searchClose: 'Close search', searchInitial: 'Type a keyword to search this site.', searchResults: 'Search results',
  searchFound: '{count} results found', searchEmpty: 'No results found.', searchQuick: 'Quick links',
  searchLoading: 'Loading search…', searchError: 'Search could not load. Close and try again.',
  searchHelp: '↑ ↓ Select · Enter Open · Esc Close',
  translationPending: 'English translation pending; browse the English list', personal: 'Personal website', writing: 'Writing and moments',
 },
} as const;
