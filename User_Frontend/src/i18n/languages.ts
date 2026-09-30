export type LanguageCode =
  | 'en'
  | 'hi'
  | 'mr'
  | 'pa'
  | 'te'
  | 'ta'
  | 'ml'
  | 'kn'
  | 'bn'
  | 'gu'
  | 'as'
  | 'or'
  | 'ur';

export interface LanguageMeta {
  code: LanguageCode;
  englishName: string;
  nativeName: string;
  rtl: boolean;
}

export const STORAGE_KEY = '@app_language';
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', rtl: false },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', rtl: false },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', rtl: false },
  { code: 'gu', englishName: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  { code: 'as', englishName: 'Assamese', nativeName: 'অসমীয়া', rtl: false },
  { code: 'or', englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ', rtl: false },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', rtl: true },
];

export const LANGUAGE_CODES: LanguageCode[] = LANGUAGES.map((lang) => lang.code);

export function isLanguageCode(code: string | null | undefined): code is LanguageCode {
  if (!code) return false;
  return LANGUAGE_CODES.includes(code as LanguageCode);
}

export function getLanguageMeta(code: string): LanguageMeta {
  const match = LANGUAGES.find((lang) => lang.code === code);
  return match || LANGUAGES[0];
}

/**
 * BCP-47 locale used for date/number formatting in the active language.
 * All supported languages are Indian-market locales (IN).
 */
export const LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  as: 'as-IN',
  or: 'or-IN',
  ur: 'ur-IN',
};

export function getLocale(language: string): string {
  return LOCALE_MAP[language] || LOCALE_MAP.en;
}
