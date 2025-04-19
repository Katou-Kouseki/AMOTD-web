'use client';

import { useParams } from 'next/navigation';
import { setCookie } from 'cookies-next';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl'; 

export default function LanguageSwitcher() {
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('common');

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // 获取当前语言
  const locale = params.locale as string || 'zh';
  
  const switchLanguage = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh';
    
    // 设置cookie
    setCookie('NEXT_LOCALE', newLocale, { maxAge: 60 * 60 * 24 * 365 }); // 1年过期
    
    // 刷新页面到新语言路径
    window.location.href = `/${newLocale}`;
  };

  return (
    <button
      onClick={switchLanguage}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all z-50"
      aria-label={locale === 'zh' ? '切换到英文' : 'Switch to Chinese'}
    >
      {t('language')}
    </button>
  );
} 