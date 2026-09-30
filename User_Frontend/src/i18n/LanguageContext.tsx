import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Storage } from '../utils/storage';
import { customerApi, getSession } from '../utils/api';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  STORAGE_KEY,
  getLanguageMeta,
  getLocale,
  isLanguageCode,
} from './languages';
import type { LanguageCode, LanguageMeta } from './languages';
import { translate } from './translate';
import { detectRegionalLanguage } from './regional';

type ParamMap = Record<string, string | number>;

export interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, params?: ParamMap) => string;
  isRTL: boolean;
  locale: string;
  regionalLanguage: LanguageCode | null;
  allLanguages: LanguageMeta[];
}

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: LanguageCode | string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, initialLanguage = DEFAULT_LANGUAGE }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(
    isLanguageCode(initialLanguage) ? initialLanguage : DEFAULT_LANGUAGE,
  );
  const [regionalLanguage, setRegionalLanguage] = useState<LanguageCode | null>(null);

  useEffect(() => {
    let mounted = true;
    detectRegionalLanguage()
      .then((regional) => {
        if (mounted && regional) {
          setRegionalLanguage(regional);
        }
      })
      .catch(() => {
        // region detection is best-effort; never crash
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (code: string) => {
    if (!isLanguageCode(code)) {
      return;
    }
    setLanguageState(code);
    try {
      await Storage.setItem(STORAGE_KEY, code);
    } catch {
      // persistence is best-effort
    }
    try {
      const session = await getSession();
      if (session?.accessToken) {
        await customerApi.setLanguage(code).catch(() => {});
      }
    } catch {
      // backend sync is best-effort
    }
  }, []);

  const t = useCallback(
    (key: string, params?: ParamMap) => translate(language, key, params),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      isRTL: getLanguageMeta(language).rtl,
      locale: getLocale(language),
      regionalLanguage,
      allLanguages: LANGUAGES,
    }),
    [language, setLanguage, t, regionalLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

const FALLBACK_VALUE: LanguageContextValue = {
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
  t: (key: string, params?: ParamMap) => translate(DEFAULT_LANGUAGE, key, params),
  isRTL: false,
  locale: getLocale(DEFAULT_LANGUAGE),
  regionalLanguage: null,
  allLanguages: LANGUAGES,
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return FALLBACK_VALUE;
  }
  return context;
}
