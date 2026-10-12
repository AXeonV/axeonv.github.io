# Theme sources

- Learn World Models theme copied verbatim from https://github.com/datawhalechina/learn-world-model/blob/2f0cbf858a8bb4159462b304c1371eeaf123ab93/docs/.vitepress/theme/style.css
- vitepress-base.css: scoped base CSS from the published VitePress v1.6.4 site, excluding its custom theme suffix and replacing deployment-specific font rules with a local Inter font.
- Header, sidebar and document layout preserve the upstream rendered structure and scoped attributes, adapted to Astro templates.
- LanguageSwitch.astro retains the published VPNavBarTranslations / VPFlyout / VPMenu / VPMenuLink structure and scoped styles. Component sources: https://github.com/vuejs/vitepress/tree/v1.6.4/src/client/theme-default/components (VitePress MIT).
- Original theme file is unchanged. Personal brand overrides and Astro interactions are in ../global.css and src/components.
- VitePress MIT license is included in VITEPRESS-LICENSE. The Learn World Models repository did not declare a license at the time of retrieval.
- Font: Inter roman from the reference site's VitePress distribution, under SIL OFL; see INTER-LICENSE.

