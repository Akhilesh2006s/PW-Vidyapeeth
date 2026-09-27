import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, type MessageKey } from './i18n';
import type { UiLanguage } from './types';

const STORAGE_KEY = 'motivisk_lang';

interface LanguageValue {
  lang: UiLanguage;
  setLang: (lang: UiLanguage) => void;
  t: (key: MessageKey) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLanguage>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'te' ? 'te' : 'en';
  });

  const setLang = (next: UiLanguage) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'te' ? 'te' : 'en';
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang,
      t: (key) => messages[lang][key],
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useI18n must be used within LanguageProvider');
  return value;
}
