# imqi1 小程序端

基于 **uni-app (Vue 3 + Vite + TypeScript)** 的小程序工程，UI 采用 **wot-design-uni**，原子化样式采用 **UnoCSS**。

本目录是一个**独立子项目**，与根目录的 Nuxt 工程互不影响：

- 根目录 `eslint.config.mjs` 已将 `mini` 加入 `ignores`，根项目 ESLint / vue-tsc 不会检查此目录。
- 本目录拥有独立的 `package.json` / `tsconfig.json` / `eslint.config.js`，需单独安装依赖与运行。

## 环境要求

- Node.js >= 20
- bun（与主项目一致）或 pnpm/npm 均可
- Python >= 3.10（用于字体子集化脚本）
- 微信开发者工具（用于运行 / 调试 `mp-weixin` 产物）

## 安装

```bash
cd mini
bun install
```

## 运行

```bash
# H5（浏览器调试）
bun run dev:h5

# 微信小程序（生成的产物在 dist/dev/mp-weixin，用微信开发者工具导入该目录）
bun run dev:mp-weixin

# 支付宝小程序
bun run dev:mp-alipay
```

## 构建

```bash
bun run build:h5          # 产物: dist/build/h5
bun run build:mp-weixin   # 产物: dist/build/mp-weixin
bun run build:mp-alipay   # 产物: dist/build/mp-alipay
```

## 检查

```bash
bun run type-check   # vue-tsc 类型检查
bun run lint         # ESLint（独立配置，不影响主项目）
```

## 字体子集化

remixicon 字体经过子集化处理，只包含项目实际用到的图标，大幅减少体积。

```bash
# 安装 Python 依赖
pip install -r scripts/requirements.txt

# 检查图标是否都存在
python scripts/subset-font.py --check

# 子集化字体
python scripts/subset-font.py
```

新增图标时，把图标名加进 `scripts/subset-font.py` 的 `ICONS` 列表，然后重跑脚本即可。

## 目录结构

```
mini/
├── eslint.config.js        # 独立 ESLint flat config
├── index.html              # H5 入口
├── package.json
├── tsconfig.json
├── uno.config.ts           # UnoCSS 配置（小程序适配）
├── vite.config.ts          # Vite + @dcloudio/vite-plugin-uni
├── scripts/
│   ├── requirements.txt    # Python 依赖
│   ├── subset-font.py      # 字体子集化脚本
│   └── inject-rpxcalc.mjs  # 微信构建后注入 rpxCalc 参数
└── src/
    ├── App.vue
    ├── env.d.ts
    ├── main.ts
    ├── manifest.json       # uni-app 应用配置（appid 等）
    ├── pages.json          # 路由 / easycom / 全局样式
    ├── static/icon/        # 图标字体（子集化后为 remixicon-subset.css）
    └── uni.scss
```

## 配置要点

- **easycom**：`pages.json` 已配置 `^wd-(.*)` 自动按需引入 wot-design-uni 组件，模板中直接使用 `<wd-button />` 等即可，无需手动 import。
- **appid**：`src/manifest.json` 的 `mp-weixin.appid` 已填示例值（`wxd45784d62bb73db8`），**开源/他人使用请替换为你自己的 AppID**（留空则每次构建后需在微信开发者工具重填）。
- **接口地址**：与主项目后端联调时，请在 `src/` 下封装请求并指向后端服务地址（H5 跨域与小程序合法域名需分别配置）。

## 注意事项

### 资源
- **表情**：`src/` 下的 `emojis.json` 与 `EMOJI_CATEGORIES` 需**手动同步**（`capoo` 图是 gif 且扩展名不统一，务必查表、不能从 key 推导 path）。
- **`/emojis` 图片路径**：需用 `siteConfig.siteUrl` 补全为绝对地址。
- **行内表情**：小程序 `text` 不能嵌 `image`，表情按 `parseCommentContent` 切成 text/emoji 分段渲染。
- **实况照片（LivePhoto / Motion Photo）**：拉整包扫 `ftyp` 切 MP4，用 `<video>` 覆盖静态图点击播放；H5 用 blob、小程序用 `wx.writeFile` 临时文件。
- **页面标题**：列表/聚合页 `.title-bar` 左右 padding 统一 `24rpx`，勿写 `40rpx`（卡片式头部自成体系除外）。

### 工作流
- **子模块**：本目录是主项目（`imqi1-cms`）的 **gitee 子模块**。改动后先在 `mini/` 内 `git add && commit && push`，再回主库 `git add mini` 提升子模块指针。校验用根脚本 `bun run mini:lint` / `mini:type-check`；`dist/` 已 gitignore。
