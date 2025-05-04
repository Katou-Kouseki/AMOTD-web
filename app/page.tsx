'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 根页面 - 自动重定向到默认语言路径
export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // 重定向到默认语言路径 (/zh)
    router.replace('/zh');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <p className="text-lg">页面加载中...</p>
    </div>
  );
}
