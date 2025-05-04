import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        id="Top"
      >
        {children}
      </body>
    </html>
  );
}
