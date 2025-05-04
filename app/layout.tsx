import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

// 打印消息内容示例进行验证
console.log('EN Messages sample:', 
  enMessages.title?.substring(0, 30),
  enMessages.editor?.formatToolbar,
  enMessages.home?.uploadIcon
);
console.log('ZH Messages sample:', 
  zhMessages.title?.substring(0, 30),
  zhMessages.editor?.formatToolbar,
  zhMessages.home?.uploadIcon
);

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // 这里不处理params，而是从渲染的子组件data-locale属性获取语言信息
  // 国际化处理完全交给app/[locale]目录下的组件处理
  // 这里只提供必要的provider
  
  return (
    <html>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
