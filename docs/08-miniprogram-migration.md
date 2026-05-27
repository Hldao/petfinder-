# 08 · HTML 原型 → 微信小程序原生迁移方案

> **本文目的**：把当前单文件 HTML 原型（`prototypes/app-prototype-v10.html`）迁移到**微信小程序原生**（wxml/wxss/js）+ **腾讯云开发 CloudBase** 的落地路线图。
>
> **定位**：原型是**交互真相来源（source of truth for UX）**，不是代码来源。迁移 = 把原型里已经验证的"做什么 / 不做什么"翻译成小程序工程，**不重新设计产品**。
>
> **前置必读**：`00-overview.md`（技术栈 + 4 条架构原则）· `02-state-machines.md`（3 张表状态机）· `03-mvp-scope.md`（模块规格 + 接口清单）· `06-product-philosophy.md`（迁移期防止"复活"已砍功能）
>
> **更新时间**：2026-05-27 · 对照原型 v10 r51

---

## 一、迁移总原则

1. **原型不是代码资产，是决策资产**。HTML 里 6000 行 CSS/JS 不会被"转译"，而是按小程序范式**重写**；保留的是布局、文案、交互流、视觉 token。
2. **照搬奥卡姆结果**：原型里已经砍掉的东西（左滑、紧急角标、浏览量、私有特征、悬赏、善行值数字…）**迁移期一律不许"顺手加回来"**。每个 page 开工前对照 `06` 反例库 + 不做清单。
3. **客户端永不直接写库**（00 § 架构原则 1）：所有写操作走云函数。小程序端只读视图 + 调云函数。
4. **先走通骨架，再填肉**：先用一条最短链路（登录 → feed 只读 → 详情）打通"小程序 + CloudBase"，再按 P0→P1→P2 铺开。

---

## 二、目标架构总览

```
┌─────────────────────────── 微信小程序（原生 wxml/wxss/js）──────────────────────────┐
│  pages/（页面）   components/（pet-card 等自定义组件）   utils/（api 封装 / storage / 常量）│
│        │ 只读视图 + setData                  │ 调用云函数（永不直连数据库）                  │
└────────┼──────────────────────────────────────┼────────────────────────────────────────┘
         │ wx.cloud.callFunction                  │ wx.cloud.uploadFile
         ▼                                        ▼
┌──────────────────── 腾讯云开发 CloudBase（单环境 · M0）──────────────────────────────┐
│  云函数 cloudfunctions/                云数据库 collections/         云存储 storage/      │
│   - login（code→openid）               - posts / users / chats        - 帖子照片（必过      │
│   - contentSafety（msg/imgSecCheck）   - messages / clues / sightings    imgSecCheck）      │
│   - postCreate / postUpdate            - share_logs / reports          - 聊天图片           │
│   - sendMessage（每条过审核）           - return_confirmations / disputes                    │
│   - confirmReturn / settleCooldown（定时触发器）                                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
         │ 服务通知模板消息
         ▼
   微信服务号（关联小程序 · 推送 / 留存 / 传播 · 见 03 模块 5）
```

**4 条不可妥协架构原则的落地点**（00 § 架构原则）：

| 原则 | 落地方式 |
|---|---|
| 客户端永不直接写库 | `wx.cloud.database()` 仅用 `.get()` 读；所有写经云函数；数据库权限设为"仅创建者可读写"兜底 |
| 善行值发放集中单一云函数 | MVP **不做善行值数字**（见 §六），V2 启用时入口唯一为 `settleReward` 云函数 |
| 图片落库前必过 imgSecCheck | 上传链路：`wx.chooseMedia` → `wx.cloud.uploadFile` → 云函数 `imgSecCheck` → 通过才写入帖子/消息 |
| M0 单云环境 | 一个 CloudBase 环境，开发者 + 合作者共用，不分 dev/prod |

---

## 三、工程结构

```
miniprogram/                       # 小程序主体
├── app.js / app.json / app.wxss   # 全局：cloud.init / tabBar / 全局样式 token
├── pages/
│   ├── feed/                      # tabBar① 首页（feed + 搜索入口）
│   ├── map/                       # tabBar② 地图
│   ├── messages/                  # tabBar③ 消息列表
│   ├── profile/                   # tabBar④ 我的（r44 工具入口列表）
│   ├── detail/                    # 详情（lost/found 视角自动推导）
│   ├── publish/                   # 发布表单
│   ├── chat/                      # 单会话
│   ├── search/ contact-guide/ return-success/
│   ├── my-posts/ all-posts/ feedback/ blocklist/ dispute/
├── components/                    # 自定义组件（跨页复用）
│   ├── pet-card/                  # feed/搜索/我的/全部 共用卡片
│   ├── chat-bubble/  action-sheet/  status-bubble/  share-modal/
├── custom-tab-bar/                # ⚠ 自定义 tabBar（中央凸起"发布"FAB 原生不支持）
├── utils/
│   ├── cloud.js                   # callFunction 封装 + 统一错误处理
│   ├── store.js                   # 全局状态（currentFilter/currentSort 等）
│   ├── format.js                  # 时间/距离/情感文案（formatEmotionalTime 等纯函数可直接搬）
│   └── theme.wxss                 # CSS 变量 token（--apricot 等，原型里可直接复用）
cloudfunctions/                    # 云函数（独立 node 工程）
├── login/  contentSafety/  postCreate/  postUpdate/  sendMessage/
├── confirmReturn/  settleCooldown/（定时触发器）  reportContent/
project.config.json  sitemap.json
```

**分包策略（重要）**：小程序主包上限 **2MB**。主包只放 4 个 tabBar 页 + 公共组件；详情/发布/聊天/归还等放**分包**（`subpackages`），按需下载，避免主包超限。

---

## 四、页面与导航映射

**范式转换**：原型用单页 `showScreen(name)` 显隐切换 + `_navHistory` 手维护栈。小程序用**真实页面路由**：

| 原型机制 | 小程序对应 |
|---|---|
| `showScreen('detail')` 显隐 div | `wx.navigateTo({url:'/pages/detail/detail?id=X'})` |
| `showScreen('feed', reset)` 回首页 | `wx.switchTab`（tabBar 页）/ `wx.navigateBack` |
| `role` 参数（owner/public 视角推导，r19/r29）| 页面 `onLoad(options)` 里按 `from` 入口参数推导，沿用"隐式推导不显式开关"原则 |
| `_navHistory` 手维护 | 小程序自带页面栈，删除该变量 |

**18 个 `data-screen` → 页面清单**（含视角合并）：

| 原型 screen | 小程序 page | 类型 | 备注 |
|---|---|---|---|
| feed | pages/feed | tabBar | 信息流 + 筛选(全部/寻宠/招领) + 排序 sheet |
| map | pages/map | tabBar | 腾讯位置服务，非高德 |
| messages | pages/messages | tabBar | 卡片化列表(r27) |
| profile | pages/profile | tabBar | 工具入口列表(r44)，**非善行值 dashboard** |
| detail-lost / detail-found / detail | pages/detail | 分包 | 统一一页，视角自动推导(r31 已砍双源) |
| publish | pages/publish | 分包 | lost/found 字段差异化(§6.6) |
| chat | pages/chat | 分包 | owner/finder 双视角 Quick Reply |
| search | pages/search | 分包 | |
| contact-guide | pages/contact-guide | 分包 | 见面建议（chat 内可选入口） |
| return-success | pages/return-success | 分包 | 温暖庆祝时刻(r45)，**非成就 dashboard** |
| my-posts / all-posts | pages/my-posts, all-posts | 分包 | |
| feedback / blocklist / dispute | 对应分包页 | 分包 | |

**中央 FAB「发布」**：原生 `tabBar` 不支持凸起中央按钮 → 必须用 **`custom-tab-bar/` 自定义 tabBar 组件**复刻原型的凸起发布键。

---

## 五、渲染范式转换清单（原型清点 → 小程序写法）

原型是 DOM + innerHTML 命令式渲染（清点出 ~160 处 querySelector/innerHTML、50+ inline onclick）。小程序是**数据驱动**，逐类替换：

| 原型写法 | 出现规模 | 小程序写法 |
|---|---|---|
| `container.innerHTML = mkFeedCardHtml(d)` 字符串拼接 | ~40 处 | WXML `<pet-card wx:for>` + `setData({list})` |
| `document.querySelector(...)` 直接取 DOM | ~160 处 | 全部改 `data` 绑定；个别测量用 `wx.createSelectorQuery` |
| inline `onclick="fn(this)"` | 50+ 处 | `bindtap="fn"` + `data-id="{{}}"`，`e.currentTarget.dataset` 取参 |
| CSS `:hover` | r50 已全删（移动端无效）| 如需点按态用 `view` 的 `hover-class`（小程序原生支持）|
| CSS `:active` / `transform` / `transition` / `@keyframes` | 79 处 | **WXSS 原样支持，无需改** |
| pointer events 拖拽（地图 sheet）| 1 处交互 | `bindtouchstart/move/end`（pointer 事件小程序不支持）|
| 下拉刷新（手写 touch+mouse）| 1 处 | 页面配置 `enablePullDownRefresh` + `onPullDownRefresh`，删手写逻辑 |
| `alert()` | 多处 | `wx.showToast`（轻提示）/ `wx.showModal`（需确认）|
| `confirm()`（删除/拉黑/归还确认）| ~5 处 | `wx.showModal({success:res=>res.confirm})` |
| `prompt()`（自定义时间/发进展）| ~3 处 | 自绘输入 modal（小程序无 prompt）|
| `localStorage`（教程已读/搜索历史）| 2 处 | `wx.setStorageSync` / `wx.getStorageSync` |
| 全局变量（currentFilter 等 22 个）| 22 个 | 页面 `data` + `utils/store.js`；持久项（拉黑名单）入 storage |
| mock 数据数组（FEED_DATA 等）| 6 个 | **不迁**，改云数据库查询（见 §七）|
| 纯函数（formatEmotionalTime / 距离格式化 / helpersText）| — | **可直接搬**到 utils/format.js |

---

## 六、wx API 落地清单

原型里只有 3 处显式 `wx.*` 占位（chooseImage/chooseLocation/getLocation），但真实小程序需要的 API 远不止：

| 能力 | wx API | 落地要点 |
|---|---|---|
| 登录身份 | `wx.login` → 云函数换 OpenID | 用户身份基于 OpenID 自动建立，**无注册/注销概念**（06 反例库）|
| 位置 | `wx.getLocation` | 发布选点 + 附近匹配；**精度模糊 500m + geohash**（03 § 1.5）|
| 选点 | `wx.chooseLocation`（腾讯位置服务）| 发布表单地点、聊天发位置 |
| 拍照/选图 | `wx.chooseMedia` | 取代 deprecated chooseImage；≤9 张；选完即传 |
| 上传 | `wx.cloud.uploadFile` | → 云函数 imgSecCheck → 通过才落帖子/消息 |
| 分享 | `onShareAppMessage` + `wx.shareAppMessage` | 转发卡；分享回调写 `share_logs`（接力数据来源，03 § 1.3.1）|
| 生成分享图 | `wx.showShareImageMenu` | 取代原型 mock 二维码转发卡 |
| 隐私授权 | `wx.requirePrivacyAuthorize` | 收集位置/照片/聊天**前**必调（03 § 6.3）|
| 订阅推送 | `wx.requestSubscribeMessage` | 进 chat / 发帖后请求一次；配合服务号模板消息 |
| 内容安全 | 云端 `security.msgSecCheck` / `imgSecCheck` | 见 §八，所有 UGC 必过 |

---

## 七、后端 CloudBase 设计

### 7.1 云数据库 collections

按 02/03 的状态机和数据模型建表（字段以原型 FEED_DATA + 03 数据模型为准）：

| collection | 来源 | 关键字段 | 状态机 |
|---|---|---|---|
| `users` | 03 | openid, nickname, realname_verified, blocked[] | — |
| `posts` | FEED_DATA + 03 § 1.3 | type(lost/found), status, pet{name,breed,sex,ageStage,color,photos[]}, location{district,address,lat,lng,geohash}, desc, poster_id, stats{helpers,shares,clues}, returnCooldownUntil | 02 § 1/2 |
| `clues` | 03 § 2.5 | post_id, user_id, text, loc, marked_useful | — |
| `chats` / `messages` | 03 § 4.5 | post_id, participants[] / chat_id, sender_id, content, type, status(reviewing/sent/blocked) | 03 active→closed |
| `sightings` | r24 目击上报 | post_id, user_id, desc | — |
| `share_logs` | 03 § 1.3.1 | post_id, user_id（接力数去重来源）| — |
| `return_confirmations` | 02 § 3 | lost_pet_id, found_pet_id, state(initiated/partial/confirmed/disputed/canceled) | 02 § 3 ★最关键 |
| `reports` / `disputes` | 03 § 2.4 | 举报留存 ≥ 6 月 | — |

> ⚠ `posts.type` 只有 `lost/found` 两态——`care`（临时照料）已随功能砍掉（03 §「临时照料取舍」），迁移期不要建 care。

### 7.2 云函数

| 云函数 | 职责 | 对应接口（03 § 四）|
|---|---|---|
| `login` | code → openid，建/取 user | POST /users/login |
| `contentSafety` | 封装 msgSecCheck + imgSecCheck（贯穿所有 UGC，03 § 三）| — |
| `postCreate` | 校验 + contentSafety → pending_review → approved 才入 feed | POST /posts |
| `postUpdate` | 编辑后**重新进审核队列**（03 § 2.6）| PUT /posts/:id |
| `feedQuery` | 按 city/filter/sort/page 查 approved 帖（含距离计算）| GET /feed |
| `sendMessage` | 每条过 msgSecCheck + 关键词预筛（03 § 4.4）| POST /chats/:id/messages |
| `confirmReturn` | 驱动 return_confirmations 状态机；1:N 匹配靠**事务/乐观锁**（02 § 一只宠物多人匹配）| — |
| `settleCooldown` | **定时触发器**：扫 confirmed + 24h 到期 → 结算 + posts→returned（02 § 24h 冷却）| — |

### 7.3 实时消息

MVP 用**轮询**（chat 页 `onShow` 拉取 + 定时拉）或云开发**数据库实时监听**（`db.collection().watch()`）。不自建 WebSocket（成本高）。新消息推送靠服务号模板消息（用户已在外时）。

---

## 八、合规落地 checklist（上线前逐项过）

源自 03 各模块合规要点 + 05-risks + 06 第 4 条。**这是小程序能否过审的命门**：

- [ ] 小程序类目选 **公益 / 动物救助**（不选"生活服务-社区"，审核更宽松，00 § 技术栈）
- [ ] 所有 UGC 入口（发布描述/聊天/线索/感谢信/申诉）后端必过 `msgSecCheck`；所有图片必过 `imgSecCheck`
- [ ] 聊天前端关键词预筛（微信号/电话/qq/加我/二维码，正则见 03 § 4.4）+ 后端 msgSecCheck 双层
- [ ] **UI 与文案零出现**"加微信/留电话/微信号"字眼（06 第 4 条）
- [ ] 收集位置/照片/聊天**前**调 `wx.requirePrivacyAuthorize`；后台填「用户隐私保护指引」
- [ ] 位置精度模糊 500m + geohash 加密入库（03 § 1.5）
- [ ] 聊天/举报留存 ≥ 6 个月；「清除我的数据」走 **30 天冷却**、聊天脱敏保留取证（03 § 6.3）
- [ ] **零金钱功能**：无充值/提现/积分商城/悬赏/感谢金担保（03 §「永远不做」）
- [ ] **零拉新返利**：M0 不做邀请奖励（06 第 4 条）
- [ ] 仅 `status=approved` 内容进 feed；编辑后重新审核

---

## 九、分期路线图

> 节奏：先打**最短可运行骨架（walking skeleton）**验证"小程序↔CloudBase"链路，再按 03 的 P0→P1→P2 铺。

### Phase 0 · 骨架打通（1 条链路）
- 建 CloudBase 环境 + `app.js` cloud.init + 工程脚手架 + 分包配置
- `login` 云函数（code→openid）
- `pages/feed` **只读**：`feedQuery` 拉真实 posts → `pet-card` 组件渲染（先手填 5 条真实大理数据，不 mock 不刷量，遵 06 第 8 条）
- 点卡片 → `pages/detail` 只读
- ✅ 验收：真机上能登录、看真实 feed、进详情。**证明范式跑通**。

### Phase 1 · P0 核心闭环（对应 03 P0）
- `pages/publish` + `postCreate` + contentSafety（发布→审核→入 feed）
- `pages/chat` + `messages` + `sendMessage`（站内 IM + 每条审核 + 订阅消息授权）
- `pages/search`
- 自定义 tabBar（中央发布 FAB）
- 图片上传链路（chooseMedia → uploadFile → imgSecCheck）
- ✅ 验收：能发帖、被审核、别人能看到、能站内私聊。

### Phase 2 · P0 余项 + 归还闭环
- `pages/map`（腾讯位置服务 + 选点）—— 与小伙伴并行
- `pages/profile`（工具入口列表，r44 形态）+「清除我的数据」+ 隐私协议流程
- 归还流程：`confirmReturn` 状态机 + `settleCooldown` 定时触发器 + `return-success`（温暖时刻 r45）
- `my-posts` / `all-posts`
- ✅ 验收：寻宠完整闭环（发布→线索→私聊→确认归还→24h 冷却）。

### Phase 3 · P1 + 公众号（对应 03 P1）
- 感谢信 / 争议申诉 `dispute` / 意见反馈 / 黑名单
- 服务号注册认证 + 关联小程序 + 模板消息（03 模块 5，可与开发并行）

### V2（不在 MVP，对应 03 P2）
- 善行值积分系统（启用时入口唯一 `settleReward` 云函数）/ 救助站合作 / AI 匹配 / 群聊

---

## 十、迁移期风险与防呆

| 风险 | 防范 |
|---|---|
| 主包超 2MB | 严格分包：主包仅 4 tabBar 页 + 公共组件 |
| 把已砍功能"顺手加回来" | 每页开工前过 `06` 反例库 + 不做清单（左滑/紧急角标/浏览量/私有特征/善行值数字…）|
| imgSecCheck 是异步回调 | 上传后置 `reviewing` 态，审核结果回调再转 `approved`，不要同步等 |
| 把原型 mock 数字当真实数据刷量 | 冷启动手填真实数据，宁可 feed 空（06 第 8 条 + §6.7 去 dashboard）|
| 实时消息过度工程 | MVP 用轮询/db.watch，不自建 WebSocket |
| "不留痕"哲学在 IM 落地走样 | 平台只提供站内 IM 默认渠道，不阻止/不追踪用户线下沟通（06 第 1/3 条）|
| 视角推导退化为显式开关 | 沿用 r19/r29 入口路径隐式推导（06 §6.6）|

---

## 十一、与其他文档关系

| 文档 | 本方案引用点 |
|---|---|
| `00-overview.md` | 技术栈 + 4 条架构原则 |
| `02-state-machines.md` | return_confirmations 状态机 + 24h 冷却 + 1:N 匹配 → 云函数设计 |
| `03-mvp-scope.md` | 模块规格 / 数据模型 / 接口清单 / P0-P2 优先级 → 页面与路线图 |
| `05-risks.md` | 逐屏合规标注 → §八 checklist |
| `06-product-philosophy.md` | 迁移期防止复活已砍功能 + §6.6/6.7 范式守则 |
| `04-database.md`（待写）| collection 详细字段，建议结合 §七先补 |

---

## 待团队拍板

- [ ] 实时消息：轮询 vs `db.watch()` vs 后期 WebSocket？（推荐 MVP 用 db.watch）
- [ ] Phase 0 的 5 条种子数据从哪来（开发者本人加的本地群真实信息 + 授权）？
- [ ] `04-database.md` 是否在 Phase 0 前先补齐字段定义？
- [ ] 自定义 tabBar vs 放弃中央 FAB 改普通 4 tab？（推荐自定义 tabBar 保留发布主入口）
