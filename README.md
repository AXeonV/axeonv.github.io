# Alex Tianyou Liu 刘天佑 · Personal Website

Astro 中英文个人主页。使用适配 Astro 的 Portfolio 主题与 VitePress 排版、布局和语言菜单；靛蓝主题，居中搜索，Article / Blog / Gallery 导航。

## 开发

```sh
npm install
npm run dev -- --background
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
npm run build
```

## 内容

- 中文首页：`src/pages/zh/index.astro`；英文首页：`src/pages/en/index.astro`。先编辑中文文件，再将译文写入英文文件。根地址 `/` 直接复用中文首页，不经过重定向；修改中文首页会同时更新 `/` 和 `/zh/`。
- 姓名、邮箱、GitHub 和 Google Scholar 链接：`src/consts.ts`；中英文界面文字：`src/lib/i18n.ts`。
- 论文部分的介绍与章节标题：`src/components/Publications.astro`，包含中文原文和英文译文。
- 学术成果：`src/data/publications.ts`，中英文首页共用同一份记录。Google Scholar 链接位于 `src/consts.ts`。
- 左侧导航暂时关闭；需要恢复时，将 `src/consts.ts` 中的 `SIDEBAR_ENABLED` 改为 `true`。组件与原框架保留。
- 中文文章和日志放在 `src/content/posts/zh/`；译文放在 `src/content/posts/en/`，`category: article` 对应 Article，`category: blog` 对应 Blog。
- 两种语言使用相同的相对文件名即可自动配对，例如 `zh/my-note.md` 与 `en/my-note.md`。若文件名不同，两者设置相同的 `translationKey`。每个语言的列表、搜索、RSS 只收录该语言已发布的内容。
- 尚未翻译的文章不生成英文正文；语言菜单会跳到目标语言的列表页。补充译文后会自动切换到对应文章。
- `draft: true` 的草稿不会构建公开页面，也不会进入列表、搜索、RSS 或站点地图。
- 相册：照片放入 `public/gallery/`，在 `src/data/gallery.ts` 添加路径、alt 和标题。
- 主题样式：`src/styles/vendor/portfolio-theme.css`；靛蓝配色、个人主页布局和 Astro 适配位于 `src/styles/global.css`。图片说明采用普通字体，模板的水平分割线已移除。
- GitHub Pages 保留原有工作流，推送 master 后部署。

文章 frontmatter 示例：

```yaml
---
title: 文章标题
description: 简短介绍
pubDate: 2026-10-12
category: article
draft: false
---
```

主题来源、固定提交与许可证见 [vendor README](src/styles/vendor/README.md)。
