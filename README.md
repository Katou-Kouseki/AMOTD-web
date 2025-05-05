# Minecraft MOTD 生成器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/x1aoren/amotd-web?style=social)](https://github.com/x1aoren/amotd-web/stargazers)

## 简介

Minecraft MOTD 生成器是一款专业的服务器欢迎信息设计工具，为服务器管理员提供直观、强大的MOTD(Message of the Day)创建体验。支持标准Minecraft格式代码和MiniMessage格式，让您轻松打造个性化服务器欢迎信息，提升玩家第一印象。

无论是简洁的文本格式化，还是复杂的渐变色效果，本工具都能满足您的创意需求，同时确保MOTD在各种Minecraft客户端中正确显示。生成的样式码可直接应用于主流MOTD插件，无需复杂配置。

## 功能特点

- **双格式支持**：同时支持Minecraft原版格式代码(§)和MiniMessage高级格式
- **实时可视化预览**：所见即所得的编辑体验，立即预览最终效果
- **专业格式工具栏**：包含完整的颜色选择器和格式控制按钮
- **服务器图标上传**：支持自定义64x64服务器图标上传和预览
- **高级MiniMessage功能**：支持渐变色、自定义十六进制颜色等高级格式
- **样式码生成与管理**：生成可共享的样式码，带自动过期机制
- **资源优化保护**：限制生成频率，自动清理过期资源
- **多样式码管理**：管理多个样式码，带倒计时显示和一键复制
- **符合Minecraft UI风格**：遵循Minecraft设计语言，提供原汁原味的界面体验

## 贡献者

感谢以下贡献者对本项目的支持：

<a href="https://github.com/x1aoren">
  <img src="https://github.com/x1aoren.png" width="50" height="50" alt="x1aoren" />
</a>

## 快速开始

git clone https://github.com/x1aoren/amotd-web.git

cd amotd-web

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 开发环境运行

```bash
npm run dev
# 或
yarn dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 技术栈

- [Next.js](https://nextjs.org/) - React框架
- [TypeScript](https://www.typescriptlang.org/) - 静态类型检查
- [Tailwind CSS](https://tailwindcss.com/) - 样式系统
- [Slate.js](https://www.slatejs.org/) - 富文本编辑器

## 项目架构

```txt
amotd-web/
├── app/                                 # Next.js App Router
│   ├── [locale]/                        # 多语言路由
│   │   ├── api/                         # 多语言API路由
│   │   │   ├── fetch-motd/              # 获取服务器MOTD(多语言)
│   │   │   ├── motd/                    # MOTD样式码(多语言)
│   │   │   └── upload-icon/             # 图标上传(多语言)
│   │   ├── layout.tsx                   # 布局组件(带多语言支持)
│   │   ├── page.tsx                     # 主页面(多语言)
│   │   └── redirect.ts                  # 语言重定向
│   ├── api/                             # 全局API路由
│   │   ├── fetch-motd/                  # 获取服务器MOTD
│   │   ├── motd/                        # MOTD样式码
│   │   └── upload-icon/                 # 图标上传
│   ├── layout.tsx                       # 全局布局
│   └── page.tsx                         # 全局入口(重定向)
├── i18n/                                # 国际化配置
│   └── request.js                       # 国际化请求配置
├── i18n.js                              # 国际化主配置
├── messages/                            # 翻译文件
│   ├── en.json                          # 英文翻译
│   └── zh.json                          # 中文翻译
├── middleware.ts                        # Next.js中间件(处理语言)
├── public/                              # 静态资源
│   ├── motds/                           # 生成的MOTD数据(不纳入版本控制)
│   └── uploads/                         # 上传的服务器图标(不纳入版本控制)
├── src/                                 # 源代码
│   ├── components/                      # 组件
│   │   ├── ColorPicker.tsx              # 颜色选择器组件
│   │   ├── LanguageSwitcher.tsx         # 语言切换器组件
│   │   └── MOTDEditor.tsx               # MOTD编辑器组件
│   ├── services/                        # 服务
│   │   └── motd.ts                      # MOTD数据处理
│   └── styles/                          # 样式文件
│       └── editor.module.css            # 编辑器样式
├── tailwind.config.js                   # Tailwind配置
├── next.config.mjs                      # Next.js配置
└── package.json                         # 项目依赖
```

## 贡献指南

欢迎对本项目做出贡献！

### 贡献流程

1. Fork本仓库
2. 创建您的分支 
3. 提交您的更改 
4. 推送到分支
5. 打开Pull Request


### 代码规范

- 使用TypeScript编写所有代码
- 遵循eslint规则
- 使用Prettier格式化代码
- 对所有组件添加适当的注释