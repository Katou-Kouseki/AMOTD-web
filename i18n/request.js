import { getRequestConfig } from 'next-intl/server';
import i18nConfig from '../i18n';

export default getRequestConfig(async ({ locale }) => {
  // 确保locale有值，否则使用默认语言
  const resolvedLocale = locale || i18nConfig.defaultLocale;
  
  return {
    locale: resolvedLocale, // 显式返回locale
    messages: (await import(`../messages/${resolvedLocale}.json`)).default
  };
}); 