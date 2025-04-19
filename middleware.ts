import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  // 配置支持的语言
  locales: locales,
  // 默认语言
  defaultLocale: 'zh',
  // 启用语言检测
  localeDetection: true
});

export const config = {
  // 匹配所有路径，除了api、_next和文件路径
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 