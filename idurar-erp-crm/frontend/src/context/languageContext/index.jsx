import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'app_lang';

const LanguageContext = createContext({
  locale: 'zh_tw',
  setLocale: () => {},
});

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === 'undefined') return 'zh_tw';
    return window.localStorage.getItem(STORAGE_KEY) || 'zh_tw';
  });

  const setLocale = (lang) => {
    if (lang !== 'zh_tw' && lang !== 'en_us') return;
    setLocaleState(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'zh_tw' || stored === 'en_us')) {
      setLocaleState(stored);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: typeof window !== 'undefined' ? (window.localStorage.getItem(STORAGE_KEY) || 'zh_tw') : 'zh_tw',
      setLocale: () => {},
    };
  }
  return context;
}

export default LanguageContext;
