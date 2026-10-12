export interface Publication {
 date: string;
 title: string;
 url: string;
 venue?: string;
}

export const conferencePublications: Publication[] = [
 {
  date: '2026-03',
  title: '.tmu: A Low-Entropy Tree-Structured Representation for LLM-Assisted Scientific Writing',
  url: 'https://arxiv.org/abs/2603.02873',
  venue: 'EMNLP 2026, Industry Track',
 },
];

export const preprints: Publication[] = [];
