import React, { forwardRef, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { TextProps, TextInputProps } from 'react-native';
import { useLanguage } from './LanguageContext';
import { translateText } from './translateDynamic';
import { shouldTranslate } from './guards';

function childrenToArray(children: ReactNode): ReactNode[] {
  if (Array.isArray(children)) {
    return children;
  }
  if (children === null || children === undefined || typeof children === 'boolean') {
    return [];
  }
  return [children];
}

/**
 * Auto-translating <Text> wrapper. For each string child:
 *  1. guard says skip  -> render as-is (numbers, technical values, denylist);
 *  2. dictionary hit   -> render offline translation instantly;
 *  3. English dynamic  -> render original, swap to the cached Google
 *     translation when it arrives (never blank, never crashes).
 */
const Text = forwardRef<RNText, TextProps>(function LocalizedText(props, ref) {
  const { t, language } = useLanguage();
  const { children, ...rest } = props;
  const childList = childrenToArray(children);

  const needs = childList.filter(
    (child): child is string =>
      typeof child === 'string' && shouldTranslate(child, language) && t(child) === child,
  );
  const needsKey = needs.join('\u0001');

  const [dynamic, setDynamic] = useState<Record<string, string>>({});

  useEffect(() => {
    if (needs.length === 0) {
      return;
    }
    let cancelled = false;
    Promise.all(needs.map(async (value) => ({ value, result: await translateText(value, language) })))
      .then((results) => {
        if (cancelled) {
          return;
        }
        const map: Record<string, string> = {};
        results.forEach(({ value, result }) => {
          map[value] = result;
        });
        setDynamic(map);
      })
      .catch(() => {
        // network failures keep the original text
      });
    return () => {
      cancelled = true;
    };
  }, [needsKey, language]);

  const localized = childList.map((child) => {
    if (typeof child === 'string') {
      if (!shouldTranslate(child, language)) {
        return child;
      }
      const direct = t(child);
      if (direct !== child) {
        return direct;
      }
      return dynamic[child] ?? child;
    }
    return child;
  });

  return (
    <RNText ref={ref} {...rest}>
      {localized}
    </RNText>
  );
});

/**
 * Auto-translating <TextInput> wrapper: translates the `placeholder` prop the
 * same way (offline dictionary fast-path, else runtime Google with cache).
 * All other props (including controlled `value`) are untouched.
 */
const TextInput = forwardRef<RNTextInput, TextInputProps>(function LocalizedTextInput(props, ref) {
  const { t, language } = useLanguage();
  const { placeholder, ...rest } = props;
  const [ph, setPh] = useState(placeholder);

  useEffect(() => {
    if (!placeholder) {
      setPh(placeholder);
      return;
    }
    const direct = t(placeholder);
    if (direct !== placeholder) {
      setPh(direct);
      return;
    }
    if (!shouldTranslate(placeholder, language)) {
      setPh(placeholder);
      return;
    }
    let cancelled = false;
    translateText(placeholder, language).then((result) => {
      if (!cancelled) {
        setPh(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [placeholder, language]);

  return <RNTextInput ref={ref} {...rest} placeholder={ph} />;
});

export { Text, TextInput };

/**
 * Translates a piece of dynamic text (hook form) for usage OUTSIDE <Text>
 * children, e.g. interpolation into a translated template. Shows the original
 * text until the cached translation arrives. Never throws.
 */
export function useDynamicText(initialText?: string | null): string {
  const { language } = useLanguage();
  const [text, setText] = useState<string>(initialText || '');
  const requestIdRef = useRef(0);

  useEffect(() => {
    const value = initialText || '';
    setText(value);
    if (!value || !shouldTranslate(value, language)) {
      return;
    }
    const requestId = ++requestIdRef.current;
    translateText(value, language).then((result) => {
      if (requestIdRef.current === requestId) {
        setText(result);
      }
    });
  }, [initialText, language]);

  return text;
}
