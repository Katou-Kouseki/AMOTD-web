import createMiddleware from 'next-intl/middleware';
import i18nConfig from './i18n.js';

// 创建国际化中间件
export default createMiddleware({
  // 直接使用 i18n.js 中的配置
  locales: i18nConfig.locales,
  defaultLocale: i18nConfig.defaultLocale,
  localeDetection: i18nConfig.localeDetection,
  localePrefix: i18nConfig.localePrefix
});

// 匹配规则
export const config = {
  matcher: [
    // 匹配所有非静态资源和API路由
    '/',
    '/(zh|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
}; 