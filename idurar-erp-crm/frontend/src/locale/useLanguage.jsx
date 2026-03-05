import { useLocale } from '@/context/languageContext';
import languages from '@/locale/translation/translation';

const getLabel = (key, locale, langs) => {
  try {
    const lowerCaseKey = key
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/ /g, '_');
    const langMap = langs[locale] || langs.en_us;
    const fallbackMap = langs.en_us;
    if (langMap && langMap[lowerCaseKey]) return langMap[lowerCaseKey];
    if (fallbackMap && fallbackMap[lowerCaseKey]) return fallbackMap[lowerCaseKey];
    const removeUnderscore = key.replace(/_/g, ' ').split(' ');
    const formatted = removeUnderscore.map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
    return formatted;
  } catch (error) {
    return key;
  }
};

const useLanguage = () => {
  const { locale } = useLocale();
  const translate = (value) => getLabel(value, locale || 'zh_tw', languages);
  return translate;
};

export default useLanguage;
