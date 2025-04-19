// 支持的语言列表
const locales = ['zh', 'en'];

// 默认语言
const defaultLocale = 'zh';

// 导出路径名称生成配置
const pathnames = {
  '/': '/',
  '/about': {
    en: '/about',
    zh: '/about'
  }
};

// 导出配置对象
module.exports = {
  defaultLocale,
  locales,
  pathnames,
  // 启用区域检测
  localeDetection: true,
  // 添加cookie支持
  localePrefix: 'as-needed'
}; 