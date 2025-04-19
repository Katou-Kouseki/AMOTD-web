import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// 创建国际化中间件
export default createMiddleware({
  // 配置支持的语言
  locales,
  // 设置默认语言
  defaultLocale,
  // 启用语言检测
  localeDetection: true
});

// 匹配需要处理的路径
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)', '/((?!_next|api|.*\\..*).*)']
}; 