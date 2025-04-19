'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setCookie } from 'cookies-next';
import { useState, useEffect } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const switchLanguage = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh';
    
    // 设置cookie
    setCookie('NEXT_LOCALE', newLocale, { maxAge: 60 * 60 * 24 * 365 }); // 1年过期
    
    // 刷新页面应用新语言
    window.location.href = window.location.pathname.replace(`/${locale}`, `/${newLocale}`);
  };

  return (
    <button
      onClick={switchLanguage}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all z-50"
      aria-label={locale === 'zh' ? '切换到英文' : 'Switch to Chinese'}
    >
      {locale === 'zh' ? 'English' : '中文'}
    </button>
  );
} 