import createMiddleware from 'next-intl/middleware';
import i18nConfig from './i18n';

// 创建国际化中间件
export default createMiddleware({
  // 配置支持的语言
  locales: i18nConfig.locales,
  // 设置默认语言
  defaultLocale: i18nConfig.defaultLocale,
  // 启用语言检测
  localeDetection: true
});

// 匹配需要处理的路径
export const config = {
  matcher: [
    // 需要国际化的路径
    '/((?!api|_next|.*\\..*).*)',
    // 排除特定路径
    '/((?!_next|api|.*\\..*).*)' 
  ]
}; 