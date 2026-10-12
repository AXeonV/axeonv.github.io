# Alex Tianyou Liu 刘天佑 · Personal Website

Astro 中英文个人主页。直接复用 [Learn World Models](https://github.com/datawhalechina/learn-world-model) 的 VitePress 主题源码、排版、布局和语言菜单，适配 Astro；靛蓝主题，居中搜索，Article / Blog / Gallery 导航。

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

- 中文首页：`src/pages/zh/index.astro`；英文首页：`src/pages/en/index.astro`。先编辑中文文件，再将译文写入英文文件。根地址 `/` 默认跳转至 `/zh/`。
- 姓名与站点描述：`src/consts.ts`；中英文界面文字：`src/lib/i18n.ts`。
- 学术成果：`src/data/publications.ts`，中英文首页共用同一份记录。Google Scholar 链接位于 `src/consts.ts`。
- 左侧导航暂时关闭；需要恢复时，将 `src/consts.ts` 中的 `SIDEBAR_ENABLED` 改为 `true`。组件与原框架保留。
- 中文文章和日志放在 `src/content/posts/zh/`；译文放在 `src/content/posts/en/`，`category: article` 对应 Article，`category: blog` 对应 Blog。
- 两种语言使用相同的相对文件名即可自动配对，例如 `zh/my-note.md` 与 `en/my-note.md`。若文件名不同，两者设置相同的 `translationKey`。每个语言的列表、搜索、RSS 只收录该语言已发布的内容。
- 尚未翻译的文章不生成英文正文；语言菜单会跳到目标语言的列表页。补充译文后会自动切换到对应文章。
- `draft: true` 的草稿不会构建公开页面，也不会进入列表、搜索、RSS 或站点地图。
- 相册：照片放入 `public/gallery/`，在 `src/data/gallery.ts` 添加路径、alt 和标题。
- 主题原文件：`src/styles/vendor/learn-world-model.css`，保持原样；仅在 `src/styles/global.css` 覆盖靛蓝配色和 Astro 适配。
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
