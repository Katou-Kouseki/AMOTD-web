# Minecraft MOTD Generator

English | [中文](README_ZH.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/x1aoren/amotd-web?style=social)](https://github.com/x1aoren/amotd-web/stargazers)

## Introduction

Minecraft MOTD Generator is a professional server welcome message design tool that provides server administrators with an intuitive and powerful MOTD (Message of the Day) creation experience. It supports both standard Minecraft format codes and MiniMessage format, allowing you to easily create personalized server welcome messages that enhance players' first impressions.

Whether you need simple text formatting or complex gradient effects, this tool can meet your creative needs while ensuring your MOTD displays correctly across various Minecraft clients. The generated style codes can be directly applied to mainstream MOTD plugins without complex configuration.

## Features

- **Dual Format Support**: Simultaneously supports Minecraft vanilla format codes (§) and advanced MiniMessage format
- **Real-time Visual Preview**: WYSIWYG editing experience with immediate preview of the final effect
- **Professional Formatting Toolbar**: Includes complete color picker and format control buttons
- **Server Icon Upload**: Supports custom 64x64 server icon upload and preview
- **Advanced MiniMessage Functionality**: Supports gradients, custom hex colors, and other advanced formatting
- **Style Code Generation and Management**: Generates shareable style codes with automatic expiration mechanism
- **Resource Optimization**: Limits generation frequency and automatically cleans up expired resources
- **Multiple Style Code Management**: Manage multiple style codes with countdown display and one-click copying
- **Minecraft UI Style**: Follows Minecraft design language for an authentic interface experience

## Contributors

Thanks to the following contributors for their support of this project:

<a href="https://github.com/x1aoren">
  <img src="https://github.com/x1aoren.png" width="50" height="50" alt="x1aoren" />
</a>

## Quick Start

git clone https://github.com/x1aoren/amotd-web.git

cd amotd-web

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Run Development Environment

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Technology Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Static type checking
- [Tailwind CSS](https://tailwindcss.com/) - Styling system
- [Slate.js](https://www.slatejs.org/) - Rich text editor

## Project Structure

```txt
amotd-web/
├── app/                                 # Next.js App Router
│   ├── [locale]/                        # Multi-language routes
│   │   ├── api/                         # Multi-language API routes
│   │   │   ├── fetch-motd/              # Fetch server MOTD (multi-language)
│   │   │   ├── motd/                    # MOTD style codes (multi-language)
│   │   │   └── upload-icon/             # Icon upload (multi-language)
│   │   ├── layout.tsx                   # Layout component (with language support)
│   │   ├── page.tsx                     # Main page (multi-language)
│   │   └── redirect.ts                  # Language redirect
│   ├── api/                             # Global API routes
│   │   ├── fetch-motd/                  # Fetch server MOTD
│   │   ├── motd/                        # MOTD style codes
│   │   └── upload-icon/                 # Icon upload
│   ├── layout.tsx                       # Global layout
│   └── page.tsx                         # Global entry (redirect)
├── i18n/                                # Internationalization config
│   └── request.js                       # i18n request config
├── i18n.js                              # Main i18n config
├── messages/                            # Translation files
│   ├── en.json                          # English translation
│   └── zh.json                          # Chinese translation
├── middleware.ts                        # Next.js middleware (language handling)
├── public/                              # Static assets
│   ├── motds/                           # Generated MOTD data (not in version control)
│   └── uploads/                         # Uploaded server icons (not in version control)
├── src/                                 # Source code
│   ├── components/                      # Components
│   │   ├── ColorPicker.tsx              # Color picker component
│   │   ├── LanguageSwitcher.tsx         # Language switcher component
│   │   └── MOTDEditor.tsx               # MOTD editor component
│   ├── services/                        # Services
│   │   └── motd.ts                      # MOTD data handling
│   └── styles/                          # Style files
│       └── editor.module.css            # Editor styles
├── tailwind.config.js                   # Tailwind config
├── next.config.mjs                      # Next.js config
└── package.json                         # Project dependencies
```

## Contribution Guide

Contributions to this project are welcome!

### Contribution Process

1. Fork this repository
2. Create your branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

### Code Standards

- Write all code using TypeScript
- Follow eslint rules
- Use Prettier for code formatting
- Add appropriate comments to all components