# Training Studio

Wilf's Training Studio —— 从 Claude.ai artifact 搬过来的 React 单页应用。

## 技术栈
- Vite 8 + React 19 (JSX, 非 TypeScript)
- 包管理: npm (PowerShell 下用 `npm.cmd`，因执行策略不允许 `.ps1`)

## 目录约定
- `src/App.jsx` —— 主组件入口
- `src/components/` —— 拆分出来的子组件
- `src/data/` —— 静态数据 (题库、配置、JSON)
- `src/styles/` —— CSS / Tailwind 配置 (如使用)
- `public/` —— 静态资源 (图片、字体)
- 暂不引入路由，单页面即可；如后续需要再加 react-router

## 常用命令
- `npm.cmd run dev` —— 启动开发服务器 (默认 http://localhost:5173)
- `npm.cmd run build` —— 生产构建 (输出到 dist/)
- `npm.cmd run preview` —— 本地预览构建产物
- `npm.cmd run lint` —— ESLint 检查

## 工作流约定
- 改完代码主动跑 `npm.cmd run dev` 验证，能跑起来再交付
- 大改动前先在小样本上验证，参考全局 CLAUDE.md 中的工作纪律
- 不引入额外构建工具或框架除非明确需要 (例如 Next.js、Remix)
- 新依赖安装前先告知用途和体积影响
