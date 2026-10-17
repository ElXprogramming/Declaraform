export const ASSESSMENT_TYPES = Object.freeze(['Assignment', 'Quiz', 'Lab Exercise', 'Project']);

export const GROUP_MEMBER_COUNT = 10;

export const STORAGE_KEYS = Object.freeze({
  INDIVIDUAL_DRAFT: 'declaraform:individualDraft',
  GROUP_DRAFT: 'declaraform:groupDraft',
});

export const PDF_TEMPLATES = Object.freeze({
  INDIVIDUAL: '/templates/declarationFormIndividual.pdf',
  GROUP: '/templates/declarationFormGroup.pdf',
});

const DEFAULT_PUBLIC_FEEDBACK_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzKn_G_BWaegCu4hmbQthgPWBINlKU2tWUXbgUCQlZg-HOyJQYV8Mo484CiBHuSqirfQw/exec';

export const FEEDBACK_ENDPOINT_URL =
  import.meta.env?.VITE_FEEDBACK_ENDPOINT_URL || DEFAULT_PUBLIC_FEEDBACK_ENDPOINT;

export const FEEDBACK_CATEGORIES = Object.freeze([
  Object.freeze({ label: 'Bug Report', icon: '🐛' }),
  Object.freeze({ label: 'Idea Suggestion', icon: '💡' }),
  Object.freeze({ label: 'Other', icon: '💬' }),
]);
