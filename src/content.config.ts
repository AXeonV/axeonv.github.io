import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			author: z.string().optional(),
		format: z.enum(['markdown', 'text']).default('markdown'),
		document: z.string().regex(/^\/documents\/[a-zA-Z0-9_./-]+\.(tmu|tm|stem)$/).refine(value => !value.includes('..'), 'Document must stay in /documents/').optional(),
		pdf: z.string().regex(/^\/documents\/[a-zA-Z0-9_./-]+\.pdf$/).refine(value => !value.includes('..'), 'PDF must stay in /documents/').optional(),
			draft: z.boolean().default(false),
			pinned: z.boolean().default(false),
			pinOrder: z.number().int().positive().optional(),
			category: z.enum(['article', 'blog']).default('blog'),
			translationKey: z.string().optional(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

export const collections = { posts };
