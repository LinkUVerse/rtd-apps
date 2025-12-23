# RTD Explorer 国际化技术方案

## 1. 项目概述

### 1.1 项目基本信息

| 属性 | 值 |
|------|-----|
| 项目名称 | rtd-explorer |
| 项目类型 | 区块链浏览器 Web 应用 |
| 技术栈 | React 19.1.1 + Vite 5.4.14 + TypeScript 5.7.3 |
| UI 框架 | TailwindCSS 3.4.17 |
| 状态管理 | React Query 5.85.6 |
| 项目路径 | `rtd-apps/rtd-explorer/src/explorer` |

### 1.2 国际化现状

- 当前无任何国际化配置
- 所有 UI 文本均为硬编码英文
- 需要从零开始搭建国际化架构

### 1.3 改造范围统计

| 统计项 | 数量 |
|--------|------|
| 总文件数 | 239 个 |
| 需国际化文件数 | ~38 个 |
| 唯一文本数量 | ~96 个 |
| 文本总引用次数 | ~969 处 |

---

## 2. 技术选型

### 2.1 推荐方案: i18next + react-i18next

```json
{
  "dependencies": {
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0",
    "i18next-browser-languagedetector": "^8.0.0"
  }
}
```

### 2.2 选型理由

| 优势 | 说明 |
|------|------|
| 生态成熟 | React 生态最流行的 i18n 方案，GitHub 7k+ stars |
| TypeScript 支持 | 完善的类型定义，支持翻译 key 自动提示 |
| Namespace 支持 | 支持按功能模块拆分翻译文件 |
| 插件丰富 | 语言检测、后端加载、缓存等插件完善 |
| 插值功能 | 支持变量插值、复数形式、日期格式化 |
| Vite 兼容 | 与 Vite 构建工具完美配合 |

### 2.3 方案对比

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **i18next** | 功能全面、生态好、TypeScript 支持好 | 包体积稍大 (~40KB) | ✅ 推荐 |
| react-intl | Facebook 出品、ICU 标准 | API 较复杂、灵活性差 | ❌ 不推荐 |
| lingui | 包体积小、编译时优化 | 社区相对小、配置复杂 | ❌ 不推荐 |

---

## 3. 目录结构设计

```
rtd-explorer/src/explorer/src/
├── i18n/
│   ├── index.ts                 # i18n 配置入口
│   ├── types.d.ts               # TypeScript 类型定义
│   └── locales/
│       ├── zh/                  # 中文翻译
│       │   ├── common.json      # 通用文本 (按钮、提示等)
│       │   ├── table.json       # 表格列头
│       │   ├── pages.json       # 页面标题和内容
│       │   └── errors.json      # 错误消息
│       └── en/                  # 英文翻译
│           ├── common.json
│           ├── table.json
│           ├── pages.json
│           └── errors.json
├── components/
│   ├── header/
│   │   └── Header.tsx           # 需添加语言切换器
│   └── LanguageSelector.tsx     # 新建: 语言切换组件
```

### 3.1 Namespace 划分策略

| Namespace | 说明 | 预计条目数 |
|-----------|------|-----------|
| `common` | 通用文本：按钮、操作、状态 | ~30 |
| `table` | 表格列头：Digest、Time 等 | ~25 |
| `pages` | 页面标题和描述 | ~25 |
| `errors` | 错误和提示消息 | ~16 |

---

## 4. 配置文件详解

### 4.1 i18n 配置入口 (src/i18n/index.ts)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import zhCommon from './locales/zh/common.json';
import zhTable from './locales/zh/table.json';
import zhPages from './locales/zh/pages.json';
import zhErrors from './locales/zh/errors.json';

import enCommon from './locales/en/common.json';
import enTable from './locales/en/table.json';
import enPages from './locales/en/pages.json';
import enErrors from './locales/en/errors.json';

const resources = {
  zh: {
    common: zhCommon,
    table: zhTable,
    pages: zhPages,
    errors: zhErrors,
  },
  en: {
    common: enCommon,
    table: enTable,
    pages: enPages,
    errors: enErrors,
  },
};

i18n
  .use(LanguageDetector) // 自动检测浏览器语言
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',      // 默认中文
    defaultNS: 'common',    // 默认 namespace
    ns: ['common', 'table', 'pages', 'errors'],

    interpolation: {
      escapeValue: false,   // React 已经处理 XSS
    },

    detection: {
      // 语言检测顺序
      order: ['localStorage', 'navigator'],
      // 缓存用户选择
      caches: ['localStorage'],
      lookupLocalStorage: 'rtd-explorer-language',
    },
  });

export default i18n;
```

### 4.2 TypeScript 类型定义 (src/i18n/types.d.ts)

```typescript
import 'i18next';

import zhCommon from './locales/zh/common.json';
import zhTable from './locales/zh/table.json';
import zhPages from './locales/zh/pages.json';
import zhErrors from './locales/zh/errors.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof zhCommon;
      table: typeof zhTable;
      pages: typeof zhPages;
      errors: typeof zhErrors;
    };
  }
}
```

### 4.3 入口文件修改 (src/index.tsx)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';  // 添加此行，初始化 i18n
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 5. 翻译文件示例

### 5.1 common.json (通用文本)

```json
{
  "buttons": {
    "copy": "复制",
    "copied": "已复制!",
    "search": "搜索",
    "execute": "执行",
    "showMore": "显示更多",
    "back": "返回"
  },
  "status": {
    "playing": "播放中",
    "paused": "已暂停",
    "loading": "加载中...",
    "autoRefreshOn": "自动刷新已开启",
    "autoRefreshPaused": "自动刷新已暂停"
  },
  "actions": {
    "viewEventData": "查看事件数据",
    "hideEventData": "隐藏事件数据",
    "showSystemTx": "显示系统交易"
  },
  "labels": {
    "none": "无",
    "nothing": "暂无"
  }
}
```

### 5.2 table.json (表格列头)

```json
{
  "columns": {
    "digest": "摘要",
    "sequenceNumber": "序号",
    "time": "时间",
    "txBlockCount": "交易块数量",
    "txBlocks": "交易块",
    "checkpointSet": "检查点集",
    "checkpointParticipation": "检查点参与",
    "address": "地址",
    "publicKey": "公钥",
    "validators": "验证者",
    "checkpoint": "检查点",
    "objects": "对象",
    "referenceGasPrice": "参考 Gas 价格"
  }
}
```

### 5.3 pages.json (页面内容)

```json
{
  "objectResult": {
    "title": "对象详情",
    "description": "描述",
    "location": "位置",
    "poolId": "池 ID",
    "type": "类型",
    "owner": "所有者"
  },
  "transaction": {
    "title": "交易详情",
    "status": "状态",
    "success": "成功",
    "failed": "失败",
    "sender": "发送者",
    "events": "事件"
  },
  "validators": {
    "title": "验证者",
    "topValidators": "排名靠前的验证者"
  },
  "recent": {
    "title": "最近活动",
    "transactions": "最近交易",
    "checkpoints": "最近检查点"
  }
}
```

### 5.4 errors.json (错误消息)

```json
{
  "load": {
    "coins": "加载代币失败",
    "epochs": "加载纪元失败",
    "nfts": "加载 NFT 失败",
    "transaction": "加载交易失败"
  },
  "transaction": {
    "failed": "交易失败"
  },
  "search": {
    "notFound": "未找到结果",
    "invalidInput": "输入无效"
  }
}
```

---

## 6. 代码改造示例

### 6.1 基础用法: useTranslation Hook

**改造前:**
```tsx
function CopyToClipboard() {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={handleCopy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
```

**改造后:**
```tsx
import { useTranslation } from 'react-i18next';

function CopyToClipboard() {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={handleCopy}>
      {copied ? t('buttons.copied') : t('buttons.copy')}
    </button>
  );
}
```

### 6.2 表格列头改造

**改造前:**
```tsx
const columns = [
  { header: "Digest", accessorKey: "digest" },
  { header: "Time", accessorKey: "timestamp" },
  { header: "Transaction Blocks", accessorKey: "txCount" },
];
```

**改造后:**
```tsx
import { useTranslation } from 'react-i18next';

function TransactionsTable() {
  const { t } = useTranslation('table');

  const columns = [
    { header: t('columns.digest'), accessorKey: "digest" },
    { header: t('columns.time'), accessorKey: "timestamp" },
    { header: t('columns.txBlocks'), accessorKey: "txCount" },
  ];
  // ...
}
```

### 6.3 带变量插值

**改造前:**
```tsx
<p>Failed to load {count} items</p>
```

**改造后:**
```tsx
// errors.json: { "loadItems": "加载 {{count}} 个项目失败" }
<p>{t('errors:loadItems', { count: 5 })}</p>
```

### 6.4 复数形式处理

```json
// common.json
{
  "items": "{{count}} 个项目",
  "items_plural": "{{count}} 个项目"
}
```

```tsx
t('items', { count: 1 })  // "1 个项目"
t('items', { count: 5 })  // "5 个项目"
```

---

## 7. 语言切换器实现

### 7.1 LanguageSelector 组件

```tsx
// src/components/LanguageSelector.tsx
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
```

### 7.2 集成到 Header 组件

**修改文件:** `src/components/header/Header.tsx`

```tsx
import NetworkSelect from "../network/Network";
import Search from "../search/Search";
import { LanguageSelector } from "../LanguageSelector";  // 新增

function Header() {
  // ... 现有代码

  return (
    <header className={/* ... */}>
      <div className="flex h-full max-w-[1440px] flex-1 items-center gap-5 px-5">
        {/* Logo */}
        <LinkWithQuery to="/">
          <PolymediaLogo />
        </LinkWithQuery>

        {/* Search + Controls */}
        <div className="flex w-full gap-2">
          <div className="flex-1">
            <Search />
          </div>
          <LanguageSelector />   {/* 新增语言切换器 */}
          <NetworkSelect />
        </div>
      </div>
    </header>
  );
}
```

---

## 8. 分阶段实施计划

### 阶段 1: 基础架构搭建 (2-3h)

| 任务 | 详情 |
|------|------|
| 安装依赖 | `pnpm add i18next react-i18next i18next-browser-languagedetector` |
| 创建目录结构 | 创建 `src/i18n/` 目录和翻译文件 |
| 配置 i18n | 编写 `i18n/index.ts` 配置文件 |
| 类型定义 | 添加 TypeScript 类型支持 |
| 入口集成 | 修改 `index.tsx` 引入 i18n |

### 阶段 2: 文本提取与翻译 (3-4h)

| 任务 | 详情 |
|------|------|
| 提取通用文本 | 按钮、状态、操作等 (~30 条) |
| 提取表格文本 | 列头、标签等 (~25 条) |
| 提取页面文本 | 页面标题、描述等 (~25 条) |
| 提取错误文本 | 错误消息、提示等 (~16 条) |
| 编写中文翻译 | 完成所有中文翻译 |

### 阶段 3: 组件改造 (6-8h)

| 优先级 | 文件 | 改造点 |
|--------|------|--------|
| P0 | 表格组件 (15个) | 列头文本 |
| P0 | 搜索组件 (3个) | 占位符、按钮 |
| P1 | UI 组件 (7个) | 操作按钮、提示 |
| P1 | 页面组件 (8个) | 标题、内容 |
| P2 | ID 页面 (2个) | 详情标签 |
| P2 | 其他组件 (3个) | 杂项文本 |

### 阶段 4: 语言切换器 (1-2h)

| 任务 | 详情 |
|------|------|
| 创建组件 | 编写 `LanguageSelector.tsx` |
| 集成 Header | 修改 `Header.tsx` 添加切换器 |
| 样式调整 | 确保与现有 UI 风格一致 |

### 阶段 5: 测试与优化 (2-3h)

| 任务 | 详情 |
|------|------|
| 功能测试 | 测试语言切换是否生效 |
| 翻译检查 | 检查翻译是否正确显示 |
| 性能检查 | 确保无性能问题 |
| 边缘情况 | 测试特殊字符、长文本等 |

---

## 9. 需改造文件清单

### 9.1 高优先级 (P0) - 表格和核心组件

| 文件路径 | 改造内容 |
|----------|----------|
| `src/components/Activity/EpochsActivityTable.tsx` | 表格列头 |
| `src/components/Activity/TransactionsActivityTable.tsx` | 表格列头 |
| `src/components/checkpoints/CheckpointsTable.tsx` | 表格列头 |
| `src/components/OwnedCoins/OwnedCoinView.tsx` | 标签文本 |
| `src/components/OwnedCoins/index.tsx` | 标题、错误 |
| `src/components/OwnedObjects/index.tsx` | 标题、错误 |
| `src/components/OwnedObjects/ListView.tsx` | 列头 |
| `src/components/search/Search.tsx` | 占位符、提示 |
| `src/components/header/Header.tsx` | 添加语言切换器 |

### 9.2 中优先级 (P1) - UI 组件

| 文件路径 | 改造内容 |
|----------|----------|
| `src/ui/CopyToClipboard.tsx` | "Copied!" 文本 |
| `src/ui/PlayPause.tsx` | "Playing"/"Paused" |
| `src/ui/Search.tsx` | 搜索占位符 |
| `src/ui/Banner.tsx` | 提示文本 |
| `src/components/top-validators-card/TopValidatorsCard.tsx` | 标题文本 |
| `src/components/module/ModuleCodeTabs.tsx` | Tab 标签 |
| `src/components/module/ModuleView.tsx` | 模块相关文本 |

### 9.3 低优先级 (P2) - 页面组件

| 文件路径 | 改造内容 |
|----------|----------|
| `src/pages/object-result/ObjectResult.tsx` | 页面标题 |
| `src/pages/object-result/views/ObjectView.tsx` | 详情标签 |
| `src/pages/object-result/views/PkgView.tsx` | 包详情 |
| `src/pages/object-result/views/TokenView.tsx` | 代币详情 |
| `src/pages/transaction-result/TransactionResult.tsx` | 交易详情 |
| `src/pages/transaction-result/Events.tsx` | 事件标签 |
| `src/pages/recent/index.tsx` | 页面标题 |
| `src/pages/id-page/PageContent.tsx` | ID 页面内容 |

---

## 10. 扩展性设计

### 10.1 添加新语言流程

1. 在 `src/i18n/locales/` 下创建新语言目录 (如 `ja/`)
2. 复制英文翻译文件作为模板
3. 完成翻译工作
4. 在 `i18n/index.ts` 中导入新语言资源
5. 在 `LanguageSelector` 中添加新语言选项

### 10.2 翻译工作流建议

```
开发阶段:
1. 开发者在代码中使用 t('key') 方式
2. 先添加英文翻译到 JSON 文件
3. 提交 PR 时同步更新翻译文件

翻译阶段:
1. 导出 JSON 文件给翻译人员
2. 翻译完成后导入项目
3. 验证翻译正确性
```

### 10.3 推荐的翻译管理工具

| 工具 | 说明 | 适用场景 |
|------|------|----------|
| JSON 文件直接管理 | 简单直接 | 小团队、语言少 |
| i18next-parser | 自动提取翻译 key | 开发效率提升 |
| Crowdin/Lokalise | 翻译平台 | 社区翻译、多语言 |

---

## 11. 工作量估算总结

| 阶段 | 工作内容 | 预估工时 |
|------|----------|----------|
| 阶段 1 | 基础架构搭建 | 2-3h |
| 阶段 2 | 文本提取与翻译 | 3-4h |
| 阶段 3 | 组件改造 | 6-8h |
| 阶段 4 | 语言切换器 | 1-2h |
| 阶段 5 | 测试与优化 | 2-3h |
| **合计** | | **14-20h** |

---

## 12. 注意事项

1. **保持 key 命名规范**: 使用点分隔的层级结构，如 `buttons.copy`
2. **避免重复翻译**: 相同文本复用同一个 key
3. **处理动态内容**: 使用插值语法 `{{variable}}`
4. **测试边缘情况**: 长文本、特殊字符、RTL 语言等
5. **性能优化**: 翻译文件按需加载（如果文件较大）
