import { NextIntlClientProvider } from 'next-intl';
import fs from 'fs';
import path from 'path';

// 定义支持的语言
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }];
}

// 定义默认语言
const DEFAULT_LOCALE = 'zh';

// 加载翻译消息的函数
function loadMessages(locale: string) {
  try {
    const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
    const content = fs.readFileSync(messagesPath, 'utf8');
    return JSON.parse(content);
  } catch {
    try {
      // 回退到默认语言
      const defaultPath = path.join(process.cwd(), 'messages', `${DEFAULT_LOCALE}.json`);
      const defaultContent = fs.readFileSync(defaultPath, 'utf8');
      return JSON.parse(defaultContent);
    } catch {
      return {};
    }
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 使用await解析Promise
  const resolvedParams = await params;
  const locale = resolvedParams.locale || DEFAULT_LOCALE;
  
  // 加载翻译消息
  const messages = loadMessages(locale);
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="relative" data-locale={locale}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
} 