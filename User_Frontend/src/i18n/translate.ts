import { translations } from './translations';
import { en as enDictionary } from './translations/en';
import type { LanguageCode } from './languages';

type ParamMap = Record<string, string | number>;

const PARAM_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

function interpolate(template: string, params?: ParamMap): string {
  if (!params) {
    return template;
  }
  return template.replace(PARAM_REGEX, (match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
}

/**
 * Translates `key` into the active language with a strict fallback chain:
 *   Selected Language -> English -> the key itself.
 * This function never throws and never returns `undefined`.
 */
export function translate(
  language: LanguageCode | string,
  key: string,
  params?: ParamMap,
): string {
  if (!key) {
    return key;
  }
  const dictionary = translations[language];
  const value = dictionary?.[key] ?? enDictionary[key] ?? key;
  return interpolate(value, params);
}
