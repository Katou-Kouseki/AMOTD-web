import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

// 这是标准的Next.js中间件格式
export function middleware(request: NextRequest) {
  // 使用next-intl创建的中间件
  const intlMiddleware = createMiddleware({
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
    localeDetection: true,
    localePrefix: 'as-needed'
  });
  
  // 执行中间件并返回结果
  return intlMiddleware(request);
}

export const config = {
  // 匹配所有路径，除了api、_next和文件路径
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 