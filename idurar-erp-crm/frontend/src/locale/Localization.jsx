import { ConfigProvider } from 'antd';
import { useLocale } from '@/context/languageContext';
import antdLocale from '@/locale/antdLocale';

export default function Localization({ children }) {
  const { locale } = useLocale();
  const currentLocale = antdLocale[locale] || antdLocale.zh_tw;

  return (
    <ConfigProvider
      locale={currentLocale}
      theme={{
        token: {
          colorPrimary: '#339393',
          colorLink: '#1640D6',
          borderRadius: 0,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
