'use client';

// 简单的加载页面，不再进行客户端重定向
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <p className="text-lg">页面加载中...</p>
    </div>
  );
}
