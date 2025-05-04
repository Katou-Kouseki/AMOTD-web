import createMiddleware from 'next-intl/middleware';

// 创建国际化中间件
export default createMiddleware({
  // 支持的语言列表
  locales: ['zh', 'en'],
  // 默认语言
  defaultLocale: 'zh',
  // 启用语言自动检测
  localeDetection: true,
  // 始终在URL中包含语言前缀
  localePrefix: 'always'
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