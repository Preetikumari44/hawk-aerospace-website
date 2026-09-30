import { Transform } from 'class-transformer';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes string inputs to prevent XSS attacks.
 * Strips all HTML tags by default.
 * 
 * Usage:
 *   @Sanitize()
 *   @IsString()
 *   name!: string;
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Strip all HTML tags and dangerous content
      return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    }
    if (Array.isArray(value)) {
      return value.map(item => 
        typeof item === 'string' 
          ? DOMPurify.sanitize(item, { ALLOWED_TAGS: [] })
          : item
      );
    }
    return value;
  });
}

/**
 * Sanitizes HTML content while preserving safe tags.
 * Use only for rich text fields where HTML is explicitly required.
 * 
 * Usage:
 *   @SanitizeHTML()
 *   @IsString()
 *   description!: string;
 */
export function SanitizeHTML() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [], // No attributes allowed (prevents onclick, onerror, etc.)
      });
    }
    return value;
  });
}
