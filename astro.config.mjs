// @ts-check

import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://axeonv.github.io',
	devToolbar: { enabled: false },
	vite: { optimizeDeps: { include: ['three/addons/controls/OrbitControls.js'] } },
	integrations: [sitemap()],
	i18n: {
		locales: ['zh', 'en'],
		defaultLocale: 'zh',
		routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
	},
	redirects: {
		'/articles': '/zh/articles/',
		'/blog': '/zh/blog/',
		'/gallery': '/zh/gallery/',
	},
});
