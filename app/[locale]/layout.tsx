import { NextIntlClientProvider } from 'next-intl';
import fs from 'fs';
import path from 'path';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // 验证并获取当前语言
  const locale = (params?.locale === 'en') ? 'en' : 'zh';
  
  // 加载当前语言的翻译文件
  const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
  let messages;
  
  try {
    // 使用同步读取，确保在渲染前获取翻译文件
    const content = fs.readFileSync(messagesPath, 'utf8');
    messages = JSON.parse(content);
  } catch {
    // 如果无法加载，使用中文作为后备
    try {
      const zhMessagesPath = path.join(process.cwd(), 'messages', 'zh.json');
      const zhContent = fs.readFileSync(zhMessagesPath, 'utf8');
      messages = JSON.parse(zhContent);
    } catch {
      // 提供空对象防止应用崩溃
      messages = {};
    }
  }
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="relative" data-locale={locale}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
} 