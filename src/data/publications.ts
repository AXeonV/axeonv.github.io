export interface Publication {
 date: string;
 title: string;
 url: string;
 venue?: string;
 venueItalic?: string;
}

const tmu: Publication = {
  date: '2026-03',
  title: '.tmu: A Low-Entropy Tree-Structured Representation for LLM-Assisted Scientific Writing',
  url: 'https://arxiv.org/abs/2603.02873',
};

export const conferencePublications: Publication[] = [{
 ...tmu,
 venue: 'The 2026 Conference on Empirical Methods in Natural Language Processing (EMNLP 2026), Industry Track',
 venueItalic: '2026 Conference on Empirical Methods in Natural Language Processing',
}];

export const preprints: Publication[] = [tmu];
