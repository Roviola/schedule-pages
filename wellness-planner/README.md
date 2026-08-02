# 数字健康版 · 个人日程管理工作台

一个**默认纯本地、可选登录云同步**的个人效率工具。集日历、日常记录、目标拆解、灵感收集与思维导图于一体，主打「数字健康」的柔和蜜桃配色。不登录时零后端、数据全在本机；登录后可在手机与电脑间自动同步。

> 本项目的设计理念来自 Viola 个人 IP 设计系统（星云蓝 / 暖金 / 活力橙红 + 数字健康家族色）。

---

## ✨ 功能模块

| 模块 | 说明 |
| --- | --- |
| 📅 日历 | 月 / 周 / 日 三视图；事件可增删改；完成后打钩，已完成项自动变暗；与「目标」联动标记截止日 |
| 🌿 日常 | 图文时间流 + 习惯打卡；实时鼓励总结；可切换历史日期 |
| 🎯 目标 | 长期 / 短期分区；可折叠树状拆解；进度自动推算；截止日期 |
| 💡 灵感 | 瀑布流卡片墙；分类筛选、收藏、手动添加、展开详情 |
| 🧠 思维导图 | 自由画布、滚轮缩放、就地改名、增删节点；支持 Markdown 缩进一键生成导图，导图也可导出 PNG |

---

## 🔒 为什么「互相修改不会影响到其他用户」

这是本产品最重要的设计特点：

- **所有数据都只存在你自己的浏览器 `localStorage` 里**，没有任何服务器、数据库或账号系统。
- 你下载 / Fork 后使用，数据只写在你这一台设备的浏览器中，**完全不会上传，也不会被其他用户看到或修改**。
- 哪怕是大家都访问同一个在线网址（GitHub Pages），A 的日程和 B 的日程也按浏览器彼此隔离——因为数据从不落地到服务器。

也就是说：**不登录时，不需要后端、不需要注册，天然就是「各用各的」。** 若你选择登录（见下节「云同步」），数据改为存到你自己的云端账号，仍按用户彼此隔离，只是从「本机」升级为「跨设备同步」。

---

## 🚀 如何使用

### 方式一：下载到本地，双击即用（推荐）

1. 下载本仓库的 `index.html`；
2. 直接双击用浏览器打开（`file://` 即可运行，脚本全部内联，不依赖外部 JS）；
3. 开始使用，所有内容自动保存在本机浏览器。

> 提示：若你的浏览器对 `file://` 下的本地存储有限制，或同浏览器还开着另一个同源 `file://` 页面，建议使用方式二，或用一个简单的本地静态服务器打开。

### 方式二：在线打开（需作者开启 GitHub Pages）

如果作者已开启 GitHub Pages，可直接访问仓库提供的网址，效果和本地完全一致，且能避开 `file://` 的个别浏览器限制。

---

## ☁ 云同步（可选 · 跨设备）

想在手机和电脑之间自动同步数据？登录即可，无需改变使用习惯：

- 侧边栏点「☁ 登录 / 同步」→ 用邮箱注册 / 登录（密码至少 6 位）；
- 登录后，你的所有改动会**自动上传到云端**，并在每次打开页面时**自动拉取最新**；
- 在另一台设备（手机 / 电脑）用同一账号登录，数据即同步；
- 数据按账号隔离（服务端 RLS 策略保证），你只看得见自己的；
- 不登录则完全回到「纯本地」模式，行为与此前一致。

**部署者注意（开启该功能需几步后端配置）：**

1. 需要一个 Supabase 项目（免费）。在 Supabase 控制台 → SQL Editor 执行下方建表 SQL；
2. Authentication → Providers → Email 开启（个人测试可关闭 "Confirm email"）；
3. `sync.js` 顶部的 `SUPABASE_URL` 与 `SUPABASE_ANON` 已填好示例值；若同步失败，到 Settings → API 核对 `anon public` 并替换。**anon key 可公开嵌入前端，安全；切勿把数据库密码写进前端。**
4. 仓库里 `index.html` 与 `sync.js` 需同时部署（GitHub Pages 多文件天然支持）；若只下载单个 `index.html` 离线用，则自动降级为纯本地模式。

建表 SQL：

```sql
create table if not exists public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_data enable row level security;
drop policy if exists "own_app_data" on public.app_data;
create policy "own_app_data" on public.app_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 🌐 关于字体

- 界面正文字体（Outfit / Noto Sans SC）通过 Google Fonts CDN 加载，**联网时效果最佳**；离线时会自动回退到系统默认字体，不影响功能。
- 侧边栏的「today」手写签名体已**内嵌进文件**（Base64），离线也保留。

---

## 🧩 如何二次修改 / 参与

本项目以 `index.html` 为主（云同步时同目录附带 `sync.js`），所有 HTML / CSS / 主逻辑都内联在 `index.html` 里：

1. 用任意文本编辑器（VS Code 等）打开 `index.html` 即可修改样式、文案、配色；
2. 想长期维护自己的版本？直接 **Fork 本仓库**——你的改动只存在于你的副本，不会影响其他任何人；
3. 数据键名以 `viola_*` 前缀存放在 `localStorage`（如 `viola_schedule_v1`、`viola_maps_v1` 等），如需重置某模块，清空对应键或在该模块内使用「清空」功能即可。

---

## 📁 目录结构

```
digital-wellness-planner/
├── index.html   # 全部功能（主文件，自包含）
├── sync.js      # 云同步逻辑（登录后跨设备同步；本地模式不需要）
├── README.md    # 本说明
└── LICENSE      # MIT 许可证
```

---

## 📄 许可证

本项目以 [MIT 许可证](./LICENSE) 开源，可自由下载、修改、再分发。

---

_数字健康，从好好安排每一天开始。_
