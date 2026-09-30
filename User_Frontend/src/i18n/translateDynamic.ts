import { Storage } from '../utils/storage';
import { shouldTranslate } from './guards';

/**
 * Runtime translation of ARBITRARY dynamic text (API responses, database
 * records, open-meteo payloads, user-generated content) using Google's free
 * translate endpoint.
 *
 * Translations are cached in AsyncStorage keyed by (language + source text),
 * so each unique string is translated at most once. A concurrency limiter
 * prevents request storms when a screen contains many dynamic strings. On any
 * failure the original text is returned — this function NEVER throws and NEVER
 * returns an empty string for a non-empty input.
 */

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const CACHE_PREFIX = '@i18n_dynamic_v1';
const MAX_CONCURRENT = 6;

function cacheKey(targetLang: string, text: string): string {
  return `${CACHE_PREFIX}_${targetLang}_${encodeURIComponent(text)}`;
}

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}

function release(): void {
  active -= 1;
  const next = waiters.shift();
  if (next) {
    active += 1;
    next();
  }
}

function extractTranslated(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return '';
  }
  return data[0]
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('');
}

/**
 * Translates `text` into `targetLang`. Cached in AsyncStorage. Falls back to
 * the original text on any error or when `text` is not translatable.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string> {
  if (!shouldTranslate(text, targetLang)) {
    return text;
  }

  try {
    const cached = await Storage.getItem(cacheKey(targetLang, text));
    if (cached) {
      return cached;
    }
  } catch {
    // cache read failure is non-fatal
  }

  await acquire();
  try {
    const url = `${TRANSLATE_ENDPOINT}?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return text;
    }
    const data: unknown = await response.json();
    const translated = extractTranslated(data).trim();
    const result = translated || text;

    try {
      await Storage.setItem(cacheKey(targetLang, text), result);
    } catch {
      // cache write failure is non-fatal
    }
    return result;
  } catch {
    return text;
  } finally {
    release();
  }
}
