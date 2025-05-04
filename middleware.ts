import createMiddleware from 'next-intl/middleware';

// 定义支持的语言和默认语言
const locales = ['zh', 'en'];
const defaultLocale = 'zh';

// 创建国际化中间件
export default createMiddleware({
  // 支持的语言列表
  locales,
  // 默认语言
  defaultLocale,
  // 启用语言自动检测
  localeDetection: true,
  // 始终在URL中包含语言前缀
  localePrefix: 'always'
});

// 匹配规则
export const config = {
  matcher: [
    // 匹配所有非静态资源路径
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // 匹配根路径
    '/'
  ]
}; 