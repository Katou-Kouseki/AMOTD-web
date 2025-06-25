import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

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
    <html suppressHydrationWarning>
      <head>
        {/* 预加载Minecraft字体 */}
        <link 
          rel="preload" 
          href="/fonts/Minecraft.ttf" 
          as="font" 
          type="font/ttf" 
          crossOrigin="anonymous" 
        />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <Script id="dark-mode-manager" strategy="beforeInteractive">
          {`
            // 在客户端渲染前执行，避免闪烁
            (function() {
              const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })()
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-gray-900 dark:text-gray-100`}
        id="Top"
      >
        {children}
      </body>
    </html>
  );
}
