# AGENTS.md

## 技术栈

WXT (浏览器扩展框架) + Vue 3 + Naive UI + pnpm + TypeScript

## 命令

```bash
pnpm dev              # 开发模式 (Chrome)
pnpm dev:firefox      # 开发模式 (Firefox)
pnpm build            # 生产构建
pnpm build:firefox    # 生产构建 (Firefox)
pnpm compile          # 类型检查 (vue-tsc --noEmit)
```

## 项目结构

```
entrypoints/          # WXT 入口点（每个目录/文件 = 一个扩展入口）
  background.ts       # Service Worker
  content.ts          # Content Script
  popup/              # 弹窗页面
    index.html        # 指定 <meta name="manifest.type" content="browser_action">
    main.ts           # Vue 应用入口
    App.vue           # 根组件
components/           # 共享 Vue 组件
public/               # 静态资源，直接复制到输出目录
assets/               # 构建时处理的资源（通过 @/assets/ 引用）
.wxt/                 # 自动生成，已在 .gitignore 中忽略
```

## 框架约定

### 自动导入（无需手动 import）

- **Vue API**: `ref`, `reactive`, `computed`, `watch`, `defineComponent` 等已全局自动导入
- **Naive UI 组合式 API**: `useDialog`, `useMessage`, `useNotification`, `useLoadingBar` 已自动导入
- **WXT API**: `defineBackground`, `defineContentScript`, `browser` 等已全局可用

### 组件自动注册

Naive UI 组件通过 `unplugin-vue-components` 按需自动解析，在模板中直接使用 `<n-button>`, `<n-modal>` 等，无需手动导入。

### 路径别名

- `@/` → 项目根目录
- `@/assets/` → assets 目录
- `@/components/` → components 目录

### 类型检查

`tsconfig.json` 继承自 `.wxt/tsconfig.json`（由 `pnpm postinstall` / `wxt prepare` 自动生成）。首次克隆项目后需要运行 `pnpm install` 来生成此文件。

## 注意事项

- Vite 插件必须嵌套在 `vite: () => ({ plugins: [...] })` 中，不能直接写在 `defineConfig` 顶层
- `.wxt/` 目录是自动生成的，不要手动修改里面的文件
- `pnpm compile` 仅做类型检查，不产生输出，构建使用 `pnpm build`
- content script 的 `matches` 模式在 `entrypoints/content.ts` 的 `defineContentScript` 中定义
- 弹窗页面的 manifest 类型通过 `index.html` 中的 `<meta name="manifest.type">` 指定
