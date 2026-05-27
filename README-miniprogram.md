# 小程序工程 · Phase 0 骨架（walking skeleton）

> 迁移自 `prototypes/app-prototype-v10.html`，完整方案见 [`docs/08-miniprogram-migration.md`](./docs/08-miniprogram-migration.md)。
> 本骨架对应方案 **Phase 0**：登录 + feed 只读 + 详情，验证「小程序 ↔ CloudBase」范式打通。

## 目录

```
project.config.json          # 工程配置（appid / 云函数根目录）
miniprogram/
├── app.js / app.json / app.wxss / config.js   # 入口 + 全局 token + 唯一手填配置
├── utils/  cloud.js · format.js · seed.js      # 云调用封装 / 纯展示函数 / 本地种子数据
├── components/pet-card/                        # 卡片组件（feed/搜索/我的 将复用）
└── pages/feed/  pages/detail/                  # 首页（只读列表）/ 详情
cloudfunctions/
├── login/        # code → openid
└── feedQuery/    # 返回 status=approved 的帖
```

## 怎么跑起来

### A. 先离线看 UI（不用配云，立即可看）
1. 微信开发者工具 → 导入项目 → 选这个仓库根目录
2. AppID 选「测试号」即可（project.config.json 里是 `touristappid`）
3. 直接编译 → 首页用 `utils/seed.js` 的 5 条示例数据渲染，可点进详情
   - 底部会有「本地示例数据」提示，表示当前是离线模式

### B. 接入 CloudBase（真实链路）
1. project.config.json 的 `"appid"` 改成你的小程序 AppID
2. 开发者工具开通「云开发」，拿到环境 ID
3. `miniprogram/config.js` 的 `CLOUD_ENV` 改成你的环境 ID
4. 右键 `cloudfunctions/login` 和 `cloudfunctions/feedQuery` → 上传并部署（云端安装依赖）
5. 重新编译：app 自动 `wx.cloud.init` + 调 `login`，feed 改调 `feedQuery`
   - 此时 `posts` 集合为空 → feed 显示空状态（**真实行为：冷启动 feed 本就空**）
   - 在云数据库建 `posts` 集合、按 `utils/seed.js` 的字段加几条 `status:'approved'` 的真实数据即可看到列表

## 已遵循的产品纪律（迁移期防止复活已砍功能）
- feed 筛选只有 **全部 / 寻宠 / 招领**（紧急已砍 · r49）
- 卡片**无超时角标**（r48）、无浏览量、视觉平等
- 顶部是**希望叙事条**，非成就 dashboard（r49 · §6.7）
- `posts.type` 仅 lost/found（care 已砍）
- 客户端**不直接写库**，写操作走云函数（00 架构原则）

## 下一步（Phase 1，见 08 方案）
发布表单 + postCreate + 内容审核（msgSecCheck/imgSecCheck）· 站内聊天 · 搜索 · 自定义 tabBar（中央发布 FAB）· 图片上传链路。
