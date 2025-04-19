import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import fs from 'fs';
import path from 'path';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'MOTD在线生成器 —— 免费 直观 好用的Minecraft MOTD生成器',
  description: '一个现代化的Minecraft服务器MOTD生成和预览工具，支持完整的Minecraft格式化代码和自定义服务器图标。',
};

// 加载中文消息
const zhMessagesPath = path.join(process.cwd(), 'messages', 'zh.json');
const zhMessages = JSON.parse(fs.readFileSync(zhMessagesPath, 'utf8'));

// 加载英文消息
const enMessagesPath = path.join(process.cwd(), 'messages', 'en.json');
const enMessages = JSON.parse(fs.readFileSync(enMessagesPath, 'utf8'));

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale?: string };
}) {
  // 确保使用固定的locale值，防止undefined
  const locale = params.locale || 'zh';
  
  // 根据locale选择对应的语言文件
  const messages = locale === 'en' ? enMessages : zhMessages;
  
  return (
    <html lang={locale}>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </NextIntlClientProvider>
    </html>
  );
}
