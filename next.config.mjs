/** @type {import('next').NextConfig} */
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '/', // 开发环境用根路径
  
  // 添加缓存控制设置
  async headers() {
    return [
      {
        // 匹配字体文件
        source: '/fonts/Minecraft.ttf',
        headers: [
          {
            key: 'Cache-Control',
            // 1年缓存，immutable表示文件内容不会改变
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      // 可以添加其他静态资源的缓存控制
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control', 
            value: 'public, max-age=31536000, immutable',
          }
        ],
      }
    ]
  },
};

export default withNextIntl(nextConfig); 