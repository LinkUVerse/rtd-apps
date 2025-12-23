# RTD Wallet 国际化技术方案

## 1. 项目概述

### 1.1 项目基本信息

| 属性 | 值 |
|------|-----|
| 项目名称 | rtd-wallet |
| 项目类型 | Chrome 扩展钱包应用 |
| 技术栈 | React 19.1.1 + Webpack 5 + TypeScript 5.9.2 |
| 状态管理 | Redux Toolkit 2.8.2 + Zustand 5.0.8 |
| UI 框架 | TailwindCSS 3.4.4 + Radix UI |
| Chrome 扩展 | Manifest V3 |
| 项目路径 | `rtd-apps/wallet` |

### 1.2 Chrome 扩展架构

```
wallet/
├── src/
│   ├── background/          # Service Worker (后台脚本)
│   ├── content-script/      # Content Script (页面注入)
│   ├── dapp-interface/      # DApp 接口
│   ├── manifest/            # Chrome 扩展配置
│   └── ui/                  # 弹窗 UI (React 应用)
│       └── app/
│           ├── pages/       # 页面组件
│           ├── components/  # UI 组件
│           └── shared/      # 共享组件
```

### 1.3 国际化现状

- 当前无任何国际化配置
- 所有 UI 文本均为硬编码英文
- 需要同时处理 React UI 和 Chrome 扩展国际化

### 1.4 改造范围统计

| 统计项 | 数量 |
|--------|------|
| 总文件数 | 463 个 |
| 需国际化文件数 | ~180-200 个 |
| 文本字符串数量 | ~240-280 个 |
| 按钮文本 | ~43 个 |
| 表单标签 | ~21 个 |
| 页面标题 | ~63 个 |
| 错误消息 | ~50+ 个 |

---

## 2. 技术选型

### 2.1 推荐方案: i18next + react-i18next

```json
{
  "dependencies": {
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0"
  }
}
```

### 2.2 选型理由

| 优势 | 说明 |
|------|------|
| 生态成熟 | React 生态最流行的 i18n 方案 |
| TypeScript 支持 | 完善的类型定义 |
| Namespace 支持 | 便于按功能模块拆分大量翻译 |
| 轻量化 | 可按需引入功能 |
| Chrome 扩展兼容 | 与 Chrome i18n API 可协同工作 |

### 2.3 Chrome 扩展国际化策略

由于 Chrome 扩展的特殊性，采用**双轨制**国际化方案：

| 部分 | 方案 | 说明 |
|------|------|------|
| UI 层 (React) | i18next | 弹窗界面、设置页面等 |
| 扩展层 (Manifest) | Chrome i18n API | 扩展名称、描述等静态文本 |

---

## 3. 目录结构设计

```
wallet/src/
├── i18n/
│   ├── index.ts                    # i18n 配置入口
│   ├── types.d.ts                  # TypeScript 类型定义
│   └── locales/
│       ├── zh/                     # 中文翻译
│       │   ├── common.json         # 通用文本
│       │   ├── accounts.json       # 账户相关
│       │   ├── transactions.json   # 交易相关
│       │   ├── settings.json       # 设置相关
│       │   ├── staking.json        # Staking 相关
│       │   └── errors.json         # 错误消息
│       └── en/                     # 英文翻译
│           ├── common.json
│           ├── accounts.json
│           ├── transactions.json
│           ├── settings.json
│           ├── staking.json
│           └── errors.json
├── _locales/                       # Chrome 扩展国际化
│   ├── zh_CN/
│   │   └── messages.json
│   └── en/
│       └── messages.json
└── manifest/
    └── manifest.json               # 需添加 default_locale
```

### 3.1 Namespace 划分策略

| Namespace | 说明 | 预计条目数 |
|-----------|------|-----------|
| `common` | 通用按钮、状态、标签 | ~50 |
| `accounts` | 账户创建、导入、管理 | ~45 |
| `transactions` | 交易、转账、审批 | ~40 |
| `settings` | 设置、偏好、网络 | ~30 |
| `staking` | 质押相关 | ~20 |
| `errors` | 错误和验证消息 | ~55 |

---

## 4. 配置文件详解

### 4.1 i18n 配置入口 (src/i18n/index.ts)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译文件
import zhCommon from './locales/zh/common.json';
import zhAccounts from './locales/zh/accounts.json';
import zhTransactions from './locales/zh/transactions.json';
import zhSettings from './locales/zh/settings.json';
import zhStaking from './locales/zh/staking.json';
import zhErrors from './locales/zh/errors.json';

import enCommon from './locales/en/common.json';
import enAccounts from './locales/en/accounts.json';
import enTransactions from './locales/en/transactions.json';
import enSettings from './locales/en/settings.json';
import enStaking from './locales/en/staking.json';
import enErrors from './locales/en/errors.json';

const resources = {
  zh: {
    common: zhCommon,
    accounts: zhAccounts,
    transactions: zhTransactions,
    settings: zhSettings,
    staking: zhStaking,
    errors: zhErrors,
  },
  en: {
    common: enCommon,
    accounts: enAccounts,
    transactions: enTransactions,
    settings: enSettings,
    staking: enStaking,
    errors: enErrors,
  },
};

// 从 localStorage 读取用户语言设置
const getStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem('rtd-wallet-language');
    return stored || 'zh';
  } catch {
    return 'zh';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),   // 使用存储的语言设置
    fallbackLng: 'zh',          // 默认中文
    defaultNS: 'common',
    ns: ['common', 'accounts', 'transactions', 'settings', 'staking', 'errors'],

    interpolation: {
      escapeValue: false,
    },
  });

// 语言切换时保存到 localStorage
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('rtd-wallet-language', lng);
  } catch (e) {
    console.error('Failed to save language preference', e);
  }
});

export default i18n;
```

### 4.2 TypeScript 类型定义 (src/i18n/types.d.ts)

```typescript
import 'i18next';

import zhCommon from './locales/zh/common.json';
import zhAccounts from './locales/zh/accounts.json';
import zhTransactions from './locales/zh/transactions.json';
import zhSettings from './locales/zh/settings.json';
import zhStaking from './locales/zh/staking.json';
import zhErrors from './locales/zh/errors.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof zhCommon;
      accounts: typeof zhAccounts;
      transactions: typeof zhTransactions;
      settings: typeof zhSettings;
      staking: typeof zhStaking;
      errors: typeof zhErrors;
    };
  }
}
```

### 4.3 UI 入口文件修改 (src/ui/index.tsx)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../i18n';  // 添加此行，初始化 i18n
import App from './App';

// ... 其余代码
```

---

## 5. Chrome 扩展国际化配置

### 5.1 修改 manifest.json

**文件:** `src/manifest/manifest.json`

```json
{
  "manifest_version": 3,
  "default_locale": "zh_CN",
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "action": {
    "default_title": "__MSG_extName__",
    "default_popup": "ui.html?type=popup"
  },
  // ... 其余配置保持不变
}
```

### 5.2 创建 _locales 目录结构

**文件:** `src/_locales/zh_CN/messages.json`

```json
{
  "extName": {
    "message": "RTD Wallet",
    "description": "扩展名称"
  },
  "extDescription": {
    "message": "连接去中心化网络的安全钱包",
    "description": "扩展描述"
  }
}
```

**文件:** `src/_locales/en/messages.json`

```json
{
  "extName": {
    "message": "RTD Wallet",
    "description": "Extension name"
  },
  "extDescription": {
    "message": "A secure wallet connecting you to the decentralized web",
    "description": "Extension description"
  }
}
```

### 5.3 Webpack 配置修改

需要确保 `_locales` 目录被正确复制到构建输出：

```javascript
// configs/webpack/webpack.config.js
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/_locales', to: '_locales' },
        // ... 其他复制规则
      ],
    }),
  ],
};
```

---

## 6. 翻译文件示例

### 6.1 common.json (通用文本)

```json
{
  "buttons": {
    "add": "添加",
    "back": "返回",
    "cancel": "取消",
    "close": "关闭",
    "continue": "继续",
    "copy": "复制",
    "next": "下一步",
    "okay": "确定",
    "proceed": "继续",
    "remove": "移除",
    "save": "保存",
    "selectAll": "全选",
    "undo": "撤销"
  },
  "labels": {
    "from": "发送方",
    "to": "接收方",
    "amount": "金额",
    "token": "代币",
    "total": "总计",
    "name": "名称",
    "description": "描述"
  },
  "status": {
    "loading": "加载中...",
    "success": "成功",
    "failed": "失败",
    "pending": "处理中"
  },
  "time": {
    "day": "天",
    "days": "天",
    "hour": "小时",
    "hours": "小时",
    "minute": "分钟",
    "minutes": "分钟"
  }
}
```

### 6.2 accounts.json (账户相关)

```json
{
  "welcome": {
    "title": "欢迎使用 RTD Wallet",
    "subtitle": "连接您与去中心化网络",
    "signInPrompt": "使用您的首选服务登录"
  },
  "create": {
    "title": "创建新账户",
    "passphrase": "创建新的助记词账户",
    "importPassphrase": "导入助记词",
    "importPrivateKey": "导入私钥"
  },
  "import": {
    "title": "导入现有账户",
    "passphraseLabel": "输入助记词",
    "privateKeyLabel": "输入私钥",
    "invalidPassphrase": "助记词无效"
  },
  "protect": {
    "title": "保护您的账户",
    "createPassword": "创建账户密码",
    "confirmPassword": "确认账户密码",
    "passwordMismatch": "密码不匹配"
  },
  "export": {
    "title": "导出助记词",
    "privateKeyTitle": "账户私钥",
    "warning": "请妥善保管，切勿泄露给他人"
  },
  "manage": {
    "title": "管理账户",
    "addAccount": "添加账户",
    "selectAllAccounts": "选择所有账户",
    "nickname": "为账户设置昵称"
  },
  "social": {
    "signInWith": "使用 {{provider}} 登录",
    "microsoft": "使用 Microsoft 登录",
    "google": "使用 Google 登录",
    "facebook": "使用 Facebook 登录",
    "twitch": "使用 Twitch 登录",
    "kakao": "使用 Kakao 登录"
  },
  "forgotPassword": {
    "title": "忘记密码?",
    "recover": "恢复账户"
  },
  "logout": {
    "title": "确定要退出吗?",
    "confirm": "退出"
  }
}
```

### 6.3 transactions.json (交易相关)

```json
{
  "send": {
    "title": "发送",
    "sendNow": "立即发送",
    "sendNFT": "发送 NFT",
    "sendNFTNow": "立即发送 NFT",
    "enterAddress": "输入地址",
    "selectCoin": "选择代币",
    "selectAmount": "选择金额"
  },
  "approval": {
    "title": "审批交易",
    "approveConnection": "批准连接",
    "approveTransaction": "批准交易",
    "signMessage": "签署消息",
    "unlockToApprove": "解锁以批准",
    "review": "审查"
  },
  "sponsor": {
    "title": "赞助方",
    "sponsorPays": "赞助方支付",
    "youPay": "您支付"
  },
  "activity": {
    "title": "您的活动",
    "transactions": "交易记录",
    "viewOnExplorer": "在浏览器中查看"
  },
  "receipt": {
    "title": "收据",
    "success": "交易成功",
    "failed": "交易失败"
  }
}
```

### 6.4 settings.json (设置相关)

```json
{
  "title": "钱包设置",
  "network": {
    "title": "网络",
    "apiUrl": "API URL"
  },
  "autoLock": {
    "title": "自动锁定账户",
    "label": "在我不活动后自动锁定",
    "notSetUp": "未设置"
  },
  "language": {
    "title": "语言",
    "zh": "中文",
    "en": "English"
  },
  "apps": {
    "title": "已连接应用",
    "connectedAccounts": "已连接账户",
    "connectionActive": "连接活跃",
    "disconnect": "断开连接"
  },
  "support": {
    "title": "支持",
    "faq": "常见问题",
    "termsOfService": "服务条款"
  },
  "moreOptions": {
    "title": "更多选项"
  },
  "version": "RTD Wallet 版本 v{{version}}"
}
```

### 6.5 staking.json (质押相关)

```json
{
  "title": "质押 RTD",
  "stake": "质押",
  "unstake": "取消质押",
  "stakeRTD": "质押 RTD",
  "unstakeRTD": "取消质押 RTD",
  "rewards": {
    "title": "质押奖励",
    "earned": "已获得"
  },
  "yourStake": {
    "title": "您的质押",
    "current": "当前"
  },
  "locked": {
    "title": "已锁定且不可用"
  }
}
```

### 6.6 errors.json (错误消息)

```json
{
  "account": {
    "createFailed": "创建账户失败 (未知错误)",
    "invalidPassphrase": "助记词无效",
    "passwordMismatch": "密码不匹配",
    "wrongPassword": "密码错误"
  },
  "transaction": {
    "failed": "交易失败",
    "rejected": "交易被拒绝",
    "insufficientBalance": "余额不足"
  },
  "network": {
    "connectionFailed": "网络连接失败",
    "timeout": "请求超时"
  },
  "security": {
    "insecureWebsite": "不安全的网站",
    "maliciousBehavior": "此网站已被标记为恶意行为",
    "returnToSafety": "返回安全页面"
  },
  "validation": {
    "required": "此字段必填",
    "invalidAddress": "地址无效",
    "invalidAmount": "金额无效"
  }
}
```

---

## 7. 代码改造示例

### 7.1 欢迎页面改造

**改造前:** `src/ui/app/pages/accounts/WelcomePage.tsx`

```tsx
<Heading variant="heading2" color="gray-90" as="h1" weight="bold">
  Welcome to Rtd Wallet
</Heading>
<Text variant="pBody" color="steel-dark" weight="medium">
  Connecting you to the decentralized web and Rtd network.
</Text>
<Text variant="pBody" color="steel-dark" weight="medium">
  Sign in with your preferred service
</Text>
```

**改造后:**

```tsx
import { useTranslation } from 'react-i18next';

function WelcomePage() {
  const { t } = useTranslation('accounts');

  return (
    <>
      <Heading variant="heading2" color="gray-90" as="h1" weight="bold">
        {t('welcome.title')}
      </Heading>
      <Text variant="pBody" color="steel-dark" weight="medium">
        {t('welcome.subtitle')}
      </Text>
      <Text variant="pBody" color="steel-dark" weight="medium">
        {t('welcome.signInPrompt')}
      </Text>
    </>
  );
}
```

### 7.2 社交登录按钮改造

**改造前:** `src/ui/app/components/accounts/SocialButton.tsx`

```tsx
const providerConfig = {
  microsoft: {
    icon: SocialMicrosoft24,
    label: 'Sign in with Microsoft',
  },
  google: {
    icon: SocialGoogle24,
    label: 'Sign in with Google',
  },
  // ...
};
```

**改造后:**

```tsx
import { useTranslation } from 'react-i18next';

function SocialButton({ provider }) {
  const { t } = useTranslation('accounts');

  const providerConfig = {
    microsoft: {
      icon: SocialMicrosoft24,
      label: t('social.microsoft'),
    },
    google: {
      icon: SocialGoogle24,
      label: t('social.google'),
    },
    // ...
  };
  // ...
}
```

### 7.3 表单组件改造

**改造前:**

```tsx
<TextAreaField label="Enter Private Key" rows={4} {...register('privateKey')} />
<Button variant="outline" size="tall" text="Cancel" onClick={() => navigate(-1)} />
<Button type="submit" variant="primary" size="tall" text="Add Account" />
```

**改造后:**

```tsx
import { useTranslation } from 'react-i18next';

function ImportPrivateKeyForm() {
  const { t } = useTranslation(['accounts', 'common']);

  return (
    <>
      <TextAreaField
        label={t('accounts:import.privateKeyLabel')}
        rows={4}
        {...register('privateKey')}
      />
      <Button
        variant="outline"
        size="tall"
        text={t('common:buttons.cancel')}
        onClick={() => navigate(-1)}
      />
      <Button
        type="submit"
        variant="primary"
        size="tall"
        text={t('accounts:manage.addAccount')}
      />
    </>
  );
}
```

### 7.4 自动锁定选择器改造

**改造前:**

```tsx
const lockIntervals = [
  { id: 'day', label: 'Day' },
  { id: 'hour', label: 'Hour' },
  { id: 'minute', label: 'Minute' },
];

<CheckboxField
  name="autoLock.enabled"
  label="Auto-lock after I am inactive for"
  disabled={disabled}
/>
```

**改造后:**

```tsx
import { useTranslation } from 'react-i18next';

function AutoLockSelector({ disabled }) {
  const { t } = useTranslation(['settings', 'common']);

  const lockIntervals = [
    { id: 'day', label: t('common:time.day') },
    { id: 'hour', label: t('common:time.hour') },
    { id: 'minute', label: t('common:time.minute') },
  ];

  return (
    <CheckboxField
      name="autoLock.enabled"
      label={t('settings:autoLock.label')}
      disabled={disabled}
    />
  );
}
```

---

## 8. 语言切换器实现

### 8.1 创建语言切换组件

```tsx
// src/ui/app/components/LanguageSelector.tsx
import { useTranslation } from 'react-i18next';
import { Globe24 } from 'rtd-apps-icons';

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation('settings');

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="flex items-center gap-2">
      <Globe24 className="text-steel-darker" />
      <select
        value={i18n.language}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-steel-darker outline-none cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 8.2 集成到设置菜单

**修改文件:** `src/ui/app/components/menu/content/WalletSettingsMenuList.tsx`

```tsx
import { LanguageSelector } from '../../LanguageSelector';
import { Globe24 } from 'rtd-apps-icons';

function MenuList() {
  const { t } = useTranslation('settings');
  const languageUrl = useNextMenuUrl(true, '/language');

  return (
    <MenuLayout title={t('title')}>
      <div className="flex flex-col divide-y divide-x-0 divide-solid divide-gray-45">
        <MenuListItem
          to={networkUrl}
          icon={<Domain24 />}
          title={t('network.title')}
          subtitle={networkName}
        />
        {/* 新增语言设置项 */}
        <MenuListItem
          to={languageUrl}
          icon={<Globe24 />}
          title={t('language.title')}
          subtitle={i18n.language === 'zh' ? '中文' : 'English'}
        />
        <MenuListItem
          to={autoLockUrl}
          icon={<LockLocked24 />}
          title={t('autoLock.title')}
          subtitle={/* ... */}
        />
        {/* ... 其他设置项 */}
      </div>
    </MenuLayout>
  );
}
```

### 8.3 创建语言设置页面

```tsx
// src/ui/app/pages/settings/LanguagePage.tsx
import { useTranslation } from 'react-i18next';
import { MenuLayout } from '_components/menu/content/MenuLayout';
import { Check12 } from 'rtd-apps-icons';

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

export function LanguagePage() {
  const { i18n, t } = useTranslation('settings');

  const handleSelect = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <MenuLayout title={t('language.title')}>
      <div className="flex flex-col">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-40"
          >
            <span className="text-body font-medium">{lang.label}</span>
            {i18n.language === lang.code && (
              <Check12 className="text-success" />
            )}
          </button>
        ))}
      </div>
    </MenuLayout>
  );
}
```

---

## 9. 分阶段实施计划

### 阶段 1: 基础架构搭建 (3-4h)

| 任务 | 详情 |
|------|------|
| 安装依赖 | `pnpm add i18next react-i18next` |
| 创建目录结构 | 创建 `src/i18n/` 和 `src/_locales/` 目录 |
| 配置 i18n | 编写 `i18n/index.ts` 配置文件 |
| Chrome 扩展配置 | 修改 manifest.json，创建 _locales |
| Webpack 配置 | 确保 _locales 被正确复制 |
| 类型定义 | 添加 TypeScript 类型支持 |

### 阶段 2: 文本提取与翻译 (6-8h)

| 任务 | 详情 |
|------|------|
| 提取通用文本 | 按钮、状态、时间单位等 (~50 条) |
| 提取账户文本 | 创建、导入、管理等 (~45 条) |
| 提取交易文本 | 发送、审批、活动等 (~40 条) |
| 提取设置文本 | 网络、锁定、支持等 (~30 条) |
| 提取质押文本 | 质押、奖励等 (~20 条) |
| 提取错误文本 | 验证、网络、安全等 (~55 条) |
| 编写中文翻译 | 完成所有中文翻译 |

### 阶段 3: 核心页面改造 (8-10h)

| 优先级 | 模块 | 文件数 | 改造内容 |
|--------|------|--------|----------|
| P0 | 欢迎/登录流程 | ~15 | 首次使用体验 |
| P0 | 账户管理 | ~20 | 创建、导入、导出 |
| P0 | 设置菜单 | ~10 | 设置页面文本 |
| P1 | 交易流程 | ~25 | 发送、审批 |
| P1 | 资产展示 | ~15 | 代币、NFT 列表 |

### 阶段 4: 组件改造 (8-14h)

| 优先级 | 模块 | 文件数 | 改造内容 |
|--------|------|--------|----------|
| P0 | 表单组件 | ~25 | 标签、占位符 |
| P0 | 按钮组件 | ~15 | 按钮文本 |
| P1 | 对话框组件 | ~20 | 标题、内容 |
| P1 | 列表组件 | ~15 | 列表项文本 |
| P2 | 其他共享组件 | ~30 | 杂项文本 |

### 阶段 5: 语言切换器 (2-3h)

| 任务 | 详情 |
|------|------|
| 创建选择组件 | 编写 `LanguageSelector.tsx` |
| 创建设置页面 | 编写 `LanguagePage.tsx` |
| 集成设置菜单 | 修改 `WalletSettingsMenuList.tsx` |
| 添加路由 | 添加 `/language` 路由 |

### 阶段 6: Chrome 扩展适配 (2-3h)

| 任务 | 详情 |
|------|------|
| manifest.json | 添加 default_locale |
| _locales 目录 | 创建 zh_CN 和 en 目录 |
| 构建验证 | 确保构建产物正确 |
| 扩展测试 | 测试 Chrome 扩展加载 |

### 阶段 7: 测试与优化 (3-4h)

| 任务 | 详情 |
|------|------|
| 功能测试 | 测试语言切换是否生效 |
| UI 测试 | 检查文本是否正确显示 |
| 边缘情况 | 长文本、特殊字符测试 |
| 性能测试 | 确保无性能问题 |
| 回归测试 | 确保原有功能正常 |

---

## 10. 需改造文件清单

### 10.1 高优先级 (P0) - 核心流程

**欢迎/登录流程:**

| 文件路径 | 改造内容 |
|----------|----------|
| `src/ui/app/pages/accounts/WelcomePage.tsx` | 欢迎文案 |
| `src/ui/app/components/accounts/ZkLoginButtons.tsx` | 社交登录按钮 |
| `src/ui/app/components/accounts/SocialButton.tsx` | 登录提示 |
| `src/ui/app/pages/accounts/AddAccountPage.tsx` | 添加账户选项 |
| `src/ui/app/pages/accounts/ImportPassphrasePage.tsx` | 导入助记词 |
| `src/ui/app/pages/accounts/ImportPrivateKeyPage.tsx` | 导入私钥 |
| `src/ui/app/pages/accounts/ProtectAccountPage.tsx` | 密码设置 |

**账户管理:**

| 文件路径 | 改造内容 |
|----------|----------|
| `src/ui/app/pages/accounts/ManageAccountsPage.tsx` | 管理账户页 |
| `src/ui/app/pages/accounts/ExportAccountPage.tsx` | 导出账户 |
| `src/ui/app/pages/accounts/ExportPassphrasePage.tsx` | 导出助记词 |
| `src/ui/app/pages/accounts/forgot-password/*.tsx` | 忘记密码流程 |

**设置菜单:**

| 文件路径 | 改造内容 |
|----------|----------|
| `src/ui/app/components/menu/content/WalletSettingsMenuList.tsx` | 设置列表 |
| `src/ui/app/components/menu/content/MenuLayout.tsx` | 菜单布局 |
| `src/ui/app/components/accounts/AutoLockSelector.tsx` | 自动锁定 |

### 10.2 中优先级 (P1) - 交易流程

| 文件路径 | 改造内容 |
|----------|----------|
| `src/ui/app/pages/home/transfer-coin/*.tsx` | 转账流程 |
| `src/ui/app/pages/home/nft-transfer/*.tsx` | NFT 转账 |
| `src/ui/app/pages/approval-request/*.tsx` | 交易审批 |
| `src/ui/app/pages/site-connect/*.tsx` | DApp 连接 |
| `src/ui/app/pages/home/receipt/*.tsx` | 交易收据 |

### 10.3 低优先级 (P2) - 其他功能

| 文件路径 | 改造内容 |
|----------|----------|
| `src/ui/app/pages/home/assets/*.tsx` | 资产展示 |
| `src/ui/app/pages/home/tokens/*.tsx` | 代币列表 |
| `src/ui/app/pages/home/nft-details/*.tsx` | NFT 详情 |
| `src/ui/app/pages/home/kiosk-details/*.tsx` | Kiosk 详情 |
| `src/ui/app/staking/*.tsx` | 质押相关 |

---

## 11. 扩展性设计

### 11.1 添加新语言流程

1. 在 `src/i18n/locales/` 下创建新语言目录 (如 `ja/`)
2. 复制中文翻译文件作为模板
3. 完成翻译工作
4. 在 `i18n/index.ts` 中导入新语言资源
5. 在语言选择组件中添加新语言选项
6. 在 `src/_locales/` 下创建对应目录 (如 `ja/`)
7. 创建 Chrome 扩展的 messages.json

### 11.2 翻译工作流建议

```
开发阶段:
1. 开发者在代码中使用 t('namespace:key') 方式
2. 先添加中文翻译到 JSON 文件
3. 提交 PR 时同步更新翻译文件

翻译阶段:
1. 导出 JSON 文件给翻译人员
2. 翻译完成后导入项目
3. 验证翻译正确性
```

### 11.3 语言持久化

用户的语言选择通过 localStorage 持久化存储：
- 存储 key: `rtd-wallet-language`
- 默认值: `zh`
- 切换语言时自动保存

---

## 12. 工作量估算总结

| 阶段 | 工作内容 | 预估工时 |
|------|----------|----------|
| 阶段 1 | 基础架构搭建 | 3-4h |
| 阶段 2 | 文本提取与翻译 | 6-8h |
| 阶段 3 | 核心页面改造 | 8-10h |
| 阶段 4 | 组件改造 | 8-14h |
| 阶段 5 | 语言切换器 | 2-3h |
| 阶段 6 | Chrome 扩展适配 | 2-3h |
| 阶段 7 | 测试与优化 | 3-4h |
| **合计** | | **32-46h** |

---

## 13. 注意事项

### 13.1 Chrome 扩展特殊考虑

1. **Content Script**: Content Script 中的文本如需国际化，需要单独处理
2. **Service Worker**: Background Script 中通常不包含 UI 文本
3. **构建输出**: 确保 `_locales` 目录在构建产物中正确位置
4. **扩展更新**: 语言包更新需要重新发布扩展

### 13.2 性能考虑

1. **翻译文件大小**: 控制单个翻译文件大小，必要时按需加载
2. **首次加载**: 默认语言资源打包到主 bundle
3. **语言切换**: 切换语言时避免页面刷新

### 13.3 测试要点

1. **弹窗 UI**: 测试弹窗中所有文本
2. **全屏 UI**: 测试全屏页面文本
3. **DApp 连接**: 测试连接请求文本
4. **交易审批**: 测试审批流程文本
5. **错误场景**: 测试错误消息显示
