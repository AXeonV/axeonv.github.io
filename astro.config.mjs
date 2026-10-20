// @ts-check

import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://axeonv.github.io',
	devToolbar: { enabled: false },
	vite: {
		// The content-config runner is a separate Vite environment from page SSR.
		environments: { astro: { resolve: { external: ['astro/content/config', 'astro/loaders', 'astro/zod'] } } },
		optimizeDeps: {
			// Include the lazy black-hole scene before the first Gallery request.
			include: [
				'three',
				'three/addons/controls/OrbitControls.js',
				'three/addons/postprocessing/EffectComposer.js',
				'three/addons/postprocessing/RenderPass.js',
				'three/addons/postprocessing/UnrealBloomPass.js',
				'three/addons/postprocessing/ShaderPass.js',
				'three/addons/lines/Line2.js',
				'three/addons/lines/LineGeometry.js',
				'three/addons/lines/LineMaterial.js',
			],
		},
	},
	integrations: [sitemap({ filter: page => !/\/(zh|en)\/blog\/[a-f0-9]{64}\/?$/.test(new URL(page).pathname) })],
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
