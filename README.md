# Comate Canvas 项目

基于 Next.js 的交互式画布应用，支持 PixiJS 和 Spine 动画。

## 功能特性

- **交互式画布**: 基于 PixiJS 构建的高性能 2D 渲染引擎
- **Spine 动画**: 支持 Spine 动画，集成 PixiJS-Spine
- **图层管理**: 使用 @pixi/layers 进行多图层管理
- **React 集成**: 基于 Next.js 框架的现代 React 19 组件
- **动画控制**: 自定义动画管理钩子
- **绘图工具**: 画笔设置和绘图功能

## 技术栈

- [Next.js](https://nextjs.org) (v15.4.6)
- [PixiJS](https://pixijs.com) (v7.0.0) 支持 Spine
- [React](https://react.dev) (v19.0.0)
- TypeScript
- TailwindCSS

## 开始使用

首先，安装依赖：

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

然后，启动开发服务器：

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

## 项目结构

```
comate-canvas/
├── src/
│   ├── app/                 # Next.js App Router 页面
│   │   ├── chapter/         # 章节页面
│   │   ├── create/          # 创建页面
│   │   ├── menu/            # 菜单页面
│   │   ├── select/          # 选择页面
│   │   ├── showdetail/      # 详情页面
│   │   ├── sticky/          # 置顶页面
│   │   └── layout.tsx       # 应用布局
│   ├── components/          # React 组件
│   │   ├── ai-analyze-tool/ # AI 分析组件
│   │   ├── animation-text/  # 动画文本组件
│   │   ├── brush-settings/  # 画笔设置组件
│   │   └── custom_modal/    # 自定义弹窗组件
│   ├── lib/                 # 画布和动画钩子
│   │   └── hooks/
│   │       ├── animationController.ts
│   │       ├── useAnimation.ts
│   │       ├── useDrawingLayer.ts
│   │       ├── useGuideLineLayer.ts
│   │       ├── useImageLayer.ts
│   │       ├── usePixiCanvas.ts
│   │       ├── useSpineAnimation.ts
│   │       └── useSpineLayer.ts
│   ├── utils/               # 工具函数
│   │   ├── posterExample.ts
│   │   ├── posterGenerator.ts
│   │   └── README.md
│   └── constants/           # 应用常量
├── public/                  # 静态资源
│   ├── assets/
│   │   └── spine/           # Spine 动画资源
│   └── images/              # 图片资源
└── package.json             # 依赖和脚本
```

## 开发说明

项目使用多个关键钩子来实现画布功能：

1. **usePixiCanvas**: 主画布设置和管理
2. **useSpineLayer**: Spine 动画集成
3. **useDrawingLayer**: 绘图功能
4. **useImageLayer**: 图片图层管理
5. **useAnimation**: 动画控制

## 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器（端口 3002）
- `npm run lint` - 运行 ESLint

本项目使用 [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) 自动优化和加载 [Geist](https://vercel.com/font)，这是 Vercel 的一个新字体家族。

## 了解更多

要了解更多关于 Next.js 的信息，请查看以下资源：

- [Next.js 文档](https://nextjs.org/docs) - 了解 Next.js 功能和 API
- [学习 Next.js](https://nextjs.org/learn) - 交互式 Next.js 教程

您可以查看 [Next.js GitHub 仓库](https://github.com/vercel/next.js) - 欢迎提供反馈和贡献！

## 部署指南

### Vercel 部署

最简单的部署方式是使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)，这是 Next.js 的创建者提供的服务。

查看 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying) 获取更多细节。

### Docker 部署

本项目支持 Docker 容器化部署。详见 [DOCKER_DEPLOY.md](DOCKER_DEPLOY.md) 获取详细部署指南。

**快速 Docker 设置:**
```bash
# 构建 Docker 镜像
./build.sh

# 使用 Docker Compose 部署
./deploy.sh
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的修改 (`git commit -m '添加了很棒的特性'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 支持

如果遇到任何问题：
- 查看项目文档
- 参考 Docker 部署指南
- 在仓库中创建 issue

---

**最后更新**: 2024-12
**维护者**: Hackson 开发团队
