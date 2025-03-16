# Minecraft MOTD 生成器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/x1aoren/amotd-web?style=social)](https://github.com/x1aoren/amotd-web/stargazers)

一个现代化的Minecraft服务器MOTD生成和预览工具，支持完整的Minecraft格式化代码和自定义服务器图标。
主要针对MOTD插件而制作

## 功能特点

- 直观的MOTD编辑器，支持实时预览
- 完整支持Minecraft格式化代码（颜色、粗体、斜体、下划线、删除线）
- 支持自定义服务器图标上传
- 生成样式码分享链接
- 符合Minecraft UI设计风格的界面

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

amotd-web/
│
├── app/ # Next.js App Router
│ ├── api/ # API路由
│ │ ├── motd/ # MOTD相关API
│ │ └── upload-icon/ # 图标上传API
│ └── page.tsx # 主页面
│
├── public/ # 静态资源
│ ├── uploads/ # 上传的服务器图标 (不纳入版本控制)
│ └── motds/ # 生成的MOTD数据 (不纳入版本控制)
│
├── src/ # 源代码
│ ├── components/ # 组件
│ │ └── MOTDEditor.tsx # MOTD编辑器组件
│ └── services/ # 服务
│ ├── motd.ts # MOTD数据处理
│ └── upload.ts # 文件上传处理
│
└── tailwind.config.js # Tailwind配置


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