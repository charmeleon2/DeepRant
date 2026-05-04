# DeepRant 项目代码总结

> 本文档是对 DeepRant 项目代码的全面梳理，方便后续开发查阅。
> 版本：1.2.0 | 最后更新：2026-05-04

## 一、项目概述

DeepRant 是一款面向游戏玩家的多语言快捷翻译桌面工具，基于 **Tauri 2 (Rust)** + **React 18** 构建。核心功能是通过全局快捷键拦截剪贴板文本，调用用户自定义的 AI 大模型 API 进行翻译，并将结果自动粘贴回游戏聊天框。支持 macOS 和 Windows 双平台。

- 包标识：`com.DeepRant.app`
- 窗口尺寸：固定 1280×720
- 配置存储：`%APPDATA%/com.DeepRant.app/`（Windows）或 `~/Library/Application Support/com.DeepRant.app/`（macOS）

---

## 二、项目结构

```
├── src/                          # React 前端
│   ├── main.jsx                  # 入口
│   ├── App.jsx                   # 路由控制（状态驱动）
│   ├── components/
│   │   ├── Layout.jsx            # 布局：侧边栏 + 内容区 + Toast
│   │   ├── Sidebar.jsx           # 左侧导航（6 个页面）
│   │   ├── StoreProvider.jsx     # 全局状态管理（双 Store：settings + scenes）
│   │   ├── DropdownMenu.jsx      # 通用下拉菜单
│   │   ├── DeveloperNote.jsx     # 开发者信息卡片（已停用）
│   │   └── LoginModal.jsx        # 登录弹窗（已注释）
│   ├── pages/
│   │   ├── home/                 # 主页：演示视频 + 翻译方向/游戏场景/快捷键卡片
│   │   ├── Translate.jsx         # 翻译模式选择（嘴臭/职业/自动）
│   │   ├── Scenes.jsx            # 游戏场景管理（增删改查 + Prompt 模板）
│   │   ├── Phrases.jsx           # 常用语管理（编辑文字/快捷键、增删）
│   │   ├── Settings.jsx          # AI 模型配置（自定义 API + 帮助提示）
│   │   ├── About.jsx             # 关于页面（版本 + 打开配置目录）
│   │   └── User.jsx              # 用户页面（占位）
│   ├── icons/index.jsx           # 自定义 SVG 图标库
│   ├── utils/
│   │   ├── log.js                # 日志工具（前端 + Rust 后端双输出）
│   │   └── toast.js              # Toast 通知封装
│   └── assets/                   # 静态资源
│
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 应用初始化 + IPC 命令注册
│   │   ├── ai_translator.rs      # AI 翻译：Prompt 构建 + API 调用
│   │   ├── shell_helper.rs       # 系统交互：键盘模拟、剪贴板
│   │   ├── shortcut.rs           # 全局快捷键管理
│   │   ├── store.rs              # 持久化存储：数据结构 + 读写
│   │   └── tray.rs               # 系统托盘菜单
│   ├── tauri.conf.json           # Tauri 配置
│   └── Cargo.toml                # Rust 依赖
```

---

## 三、配置文件

配置文件存储在应用数据目录下，首次启动时自动生成，用户可通过"关于"页面的"打开配置文件目录"按钮直接访问并手动编辑。

### settings.json

存储应用设置，由 `store.rs` 管理，前端通过 `StoreProvider` 读写。

```json
{
  "settings": {
    "trans_hotkey": { "modifiers": ["Alt"], "key": "KeyT", "shortcut": "Alt+T" },
    "translation_from": "zh",
    "translation_to": "en",
    "active_scene": "dota2",
    "translation_mode": "toxic",
    "daily_mode": false,
    "model_type": "custom",
    "custom_model": { "auth": "", "api_url": "...", "model_name": "..." },
    "phrases": [
      { "id": 1, "phrase": "...", "hotkey": { "modifiers": ["Alt"], "key": "Digit1", "shortcut": "Alt+1" } }
    ]
  }
}
```

### scenes.json

存储游戏场景列表，独立于 settings 方便用户编辑 Prompt。

```json
{
  "scenes": [
    { "id": "dota2", "name": "Dota 2", "prompt": "环境: DOTA2\n英雄简称...", "is_builtin": true },
    { "id": "custom_17xxx", "name": "永劫无间", "prompt": "...", "is_builtin": false }
  ]
}
```

---

## 四、核心翻译流程

```
用户按下快捷键 (如 Alt+T)
    │
    ▼
shortcut.rs → ShortcutState::Pressed
    │
    ▼
shell_helper.rs → trans_and_replace_text()
    ├── [游戏模式] 模拟 Ctrl+A 全选
    ├── 模拟 Ctrl+C 复制
    ├── 读取剪贴板
    ├── [游戏模式] 写入 "翻译中..." 并粘贴
    │
    ▼
ai_translator.rs → translate_with_gpt()
    ├── 从 settings.json 读取设置
    ├── 从 scenes.json 读取当前场景 Prompt
    ├── 构建 System Prompt（base + mode_desc + scene_desc）
    ├── POST 到用户配置的 API（OpenAI 兼容格式）
    ├── 解析响应，处理 </think> 标签
    │
    ▼
shell_helper.rs
    ├── 写入翻译结果到剪贴板
    └── 模拟 Ctrl+V 粘贴
```

**日常模式**跳过全选和状态文本，直接复制→翻译→粘贴。

---

## 五、Rust 后端模块

### lib.rs — 应用初始化

**注册的插件：** updater、global-shortcut、store、shell、clipboard-manager、opener

**IPC 命令：**
| 命令 | 功能 |
|------|------|
| `get_settings` | 获取应用设置 |
| `get_version` | 获取版本号 |
| `update_translator_shortcut` | 更新翻译快捷键 |
| `get_scenes` | 获取场景列表 |
| `save_scenes` | 保存场景列表 |
| `open_config_dir` | 用系统文件管理器打开配置目录 |
| `log_to_backend` | 前端日志转发 |

**Setup 流程：** 初始化存储 → 注册快捷键 → 创建系统托盘

### ai_translator.rs — AI 翻译引擎

- `get_system_prompt(&settings, &scenes)` — 根据设置和场景数据动态构建 Prompt
- `get_model_config(&settings)` — 直接返回 `settings.custom_model`（已移除内置模型）
- `translate_with_gpt(app, original)` — 完整翻译流程
- 统一请求参数：`max_tokens: 300, temperature: 0.9, top_p: 0.7`
- 保留 `</think>` 标签处理（兼容推理模型）

**Prompt 结构（游戏模式）：**
```
<task> 翻译任务描述 </task>
<constraints> 格式约束 </constraints>
<terms> 术语规则 </terms>
[mode_desc] — toxic/pro 模式的风格描述（auto 模式为空）
<context> 从 scenes.json 动态读取的场景 Prompt </context>
<compliance> 质量检查 </compliance>
<output_format> 输出格式要求 </output_format>
```

### store.rs — 持久化存储

**数据结构：**
- `AppSettings` — 存储在 `settings.json`，包含快捷键、语言对、翻译模式、AI 模型配置、常用语
- `GameScene` — 存储在 `scenes.json`，包含 id、name、prompt、is_builtin
- `HotkeyConfig` — 快捷键配置（modifiers + key + shortcut 显示文本）
- `ModelConfig` — API 配置（auth + api_url + model_name）
- `Phrase` — 常用语（id + phrase + hotkey）

**关键函数：**
- `initialize_settings()` — 首次启动生成默认配置（11 个内置游戏场景 + 8 条默认常用语）
- `get_settings()` / `get_scenes()` — 读取配置
- `save_scenes()` — 保存场景
- `update_settings_field()` — 更新设置字段
- `get_config_dir()` — 获取配置目录路径

### shortcut.rs — 全局快捷键

- `init_shortcuts()` — 启动时注册翻译快捷键 + 所有常用语快捷键
- `update_translator_shortcut()` — 运行时更新翻译快捷键（注销旧的 → 注册新的 → 更新存储）
- 常用语快捷键目前仅在启动时注册，修改后需重启生效
- 平台差异：macOS 默认 `⌘+T`，Windows 默认 `Alt+T`

### shell_helper.rs — 系统交互

- macOS：`osascript` 执行 AppleScript 模拟键盘
- Windows：`powershell` 执行 `SendKeys` 模拟键盘

### tray.rs — 系统托盘

菜单项：打开主页面、检查更新、退出

---

## 六、React 前端

### 路由机制

状态驱动，无 React Router：
```jsx
const pages = { home, translate, scenes, phrases, settings, about };
const CurrentPage = pages[activeItem];
```

### 状态管理 — StoreProvider

双 Store 架构，基于 React Context 封装 `tauri-plugin-store`：

```jsx
const { settings, updateSettings, scenes, updateScenes, loading } = useStore();
```

- `settings` / `updateSettings` — 读写 `settings.json`
- `scenes` / `updateScenes` — 读写 `scenes.json`
- 自动保存：100ms 防抖

### 页面功能

| 页面 | 文件 | 功能 |
|------|------|------|
| 主页 | `home/index.jsx` | 演示视频 + 翻译方向卡片 + 游戏场景卡片 + 快捷键卡片 |
| 模式 | `Translate.jsx` | 三种翻译模式切换（嘴臭/职业/自动），互斥 |
| 场景 | `Scenes.jsx` | 游戏场景增删改查、Prompt 模板（MOBA/FPS/MMO/通用）、内置场景恢复默认、删除确认 |
| 常用语 | `Phrases.jsx` | 常用语增删、编辑文字、录制快捷键 |
| AI模型 | `Settings.jsx` | 自定义 API 配置（Key/URL/Model）、连接测试、帮助提示（常用 Base URL 列表） |
| 关于 | `About.jsx` | 版本信息、打开配置目录、特性卡片 |

### 支持的语言

中文、英文、韩文、法文、俄文、西班牙文、日文、德文、东南亚英语（9 种）

### 内置游戏场景

英雄联盟、Dota 2、CS:GO、PUBG、Apex Legends、守望先锋、Valorant、Fortnite、Minecraft、Warzone、魔兽世界（11 种，均可编辑 Prompt，支持用户自定义添加新游戏）

---

## 七、前后端通信

前端通过 `invoke()` 调用 Rust 命令：

```javascript
await invoke('update_translator_shortcut', { keys: ["AltLeft", "KeyT"] });
const settings = await invoke('get_settings');
const scenes = await invoke('get_scenes');
await invoke('save_scenes', { scenes: [...] });
await invoke('open_config_dir');
```

前端还直接使用 Tauri 插件 JS API：
- `@tauri-apps/plugin-store` — 读写 settings.json / scenes.json
- `@tauri-apps/plugin-updater` — 检查更新（暂时隐藏）
- `@tauri-apps/plugin-process` — 重启应用
- `@tauri-apps/plugin-opener` — 打开外部链接

---

## 八、依赖总结

### 前端

| 包名 | 用途 |
|------|------|
| `react` / `react-dom` 18.3 | UI 框架 |
| `vite` 6.0 | 构建工具 |
| `tailwindcss` 3.4 | CSS 框架 |
| `framer-motion` 12.0 | 动画 |
| `react-hot-toast` 2.5 | Toast 通知 |
| `country-flag-icons` 1.5 | 国旗图标 |
| `tailwind-merge` 2.6 | 类名合并 |

### 后端

| Crate | 用途 |
|-------|------|
| `tauri` 2.0.0-beta | 应用框架 |
| `reqwest` 0.12 | HTTP 客户端 |
| `serde` / `serde_json` | 序列化 |
| `anyhow` | 错误处理 |
| `tauri-plugin-global-shortcut` | 全局快捷键 |
| `tauri-plugin-store` | 持久化存储 |
| `tauri-plugin-shell` | Shell 命令 |
| `tauri-plugin-clipboard-manager` | 剪贴板 |
| `tauri-plugin-updater` | 自动更新 |

---

## 九、构建与打包

```bash
npm install              # 安装前端依赖
npm run tauri dev        # 开发模式
npm run tauri build      # 生产构建
npm run build:mac-arm    # macOS Apple Silicon
npm run clean            # 清理构建缓存
```

产物：macOS `.dmg` + `.app`，Windows `.msi`

---

## 十、已停用 / 占位功能

- **LoginModal.jsx** — 手机号登录（Supabase），已注释
- **supabase.js** — Supabase 客户端，已注释
- **User.jsx** — 用户页面，占位
- **DeveloperNote.jsx** — 开发者说卡片，About 页面已移除引用
- **Mana.jsx** — 能量/额度页面，已从路由和侧边栏移除
- **检查更新按钮** — About 页面已注释，代码保留
