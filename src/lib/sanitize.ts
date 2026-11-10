import DOMPurify from 'isomorphic-dompurify';

export function sanitizeString(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });
}

export function sanitizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim().replace(/[^a-z0-9@._+-]/g, '');
}
