# 谢怀安 (Huaian.dev) - 暗色科技风个人空间

[![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Site](https://img.shields.io/badge/Domain-xiehuaian.de5.net-00f0ff?style=flat-square)](https://xiehuaian.de5.net)

集作品集展示与多主题技术博客于一体的高性能暗色科技风（Dark Tech）个人网站。

## ✨ 核心特性

- 🚀 **极速静态性能**：基于 Astro 5 孤岛架构（Islands），零 JS 默认运行时，Lighthouse 满分体验；
- 🎨 **暗色科技美学 (Dark Tech)**：深邃黑夜底色、点阵网格背景、电光青与霓虹紫流光双色点缀、毛玻璃质感与卡片 Hover 微光发光效果；
- 💻 **仿真终端组件 (Cyber Terminal)**：首页交互式极客终端窗口；
- 📝 **类型安全内容驱动**：内置 Content Collections（Zod 校验），支持 Markdown/MDX 文章与作品集；
- 🔍 **博客多维筛选与毫秒级即时搜索**：支持按分类、标签筛选及标题/正文即时模糊检索；
- 📑 **文章目录 (TOC) & 中英文阅读时长预估**；
- 🌐 **全套 SEO & RSS**：自动生成 `sitemap-index.xml` 与 `/rss.xml` 订阅源。

## 🛠️ 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:4321)
npm run dev

# 静态构建 (输出至 dist/)
npm run build

# 预览构建产物
npm run preview
```

## 🚀 部署与自定义域名

- **托管推荐**：Cloudflare Pages / Vercel
- **自定义域名**：`xiehuaian.de5.net`
- **DNS 配置**：添加 CNAME 记录指向托管平台分配的 `*.pages.dev` 或 `cname.vercel-dns.com`

---

© 2026 [Xie Huaian (谢怀安)](https://github.com/xiehuaian77-sketch).
