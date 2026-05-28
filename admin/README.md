# 寻宠·大理 · 运营后台

单文件 HTML + CloudBase Web SDK。无构建工具链，部署简单。

## 包含模块

| 模块 | 功能 | 对应集合 |
|---|---|---|
| 内容审核 | 列出 `pending_review` / `risky` 帖子 → 通过/拒绝 | `posts` |
| 争议申诉 | 列出申诉 → 标记处理 + 写处理结论 | `disputes` |
| 意见反馈 | 列出用户反馈 | `feedback` |

## 部署步骤

### 1. 上传 4 个 admin 云函数

在微信开发者工具中右键以下文件夹 → 上传并部署：

- `cloudfunctions/adminAuth/`
- `cloudfunctions/adminPosts/`
- `cloudfunctions/adminDisputes/`
- `cloudfunctions/adminFeedback/`

### 2. 配置环境变量 ADMIN_PASSWORD

每个 admin 云函数都需要设置 `ADMIN_PASSWORD`：

1. CloudBase 控制台 → 云函数 → 选中函数（例如 `adminAuth`）→ 函数配置
2. 找到「环境变量」 → 添加：`ADMIN_PASSWORD` = `你的运营密码`
3. **4 个 admin 函数都要重复一遍同一个密码**

> 密码改了之后所有 admin 函数都要同步更新，否则会出现某些功能能用某些不能用。

### 3. 用浏览器打开 `admin.html`

```bash
# 本地直接打开（双击 admin.html 或：）
start admin/admin.html
```

或者部署到 CloudBase 静态托管：
1. CloudBase 控制台 → 静态网站托管 → 上传 `admin.html`
2. 通过分配的 URL 访问

### 4. 首次登录

- **环境 ID**：CloudBase 控制台首页可看到，类似 `xunchong-dali-xxxxxxxxx`
- **密码**：第 2 步设置的 `ADMIN_PASSWORD`

环境 ID 存 localStorage，密码存 sessionStorage（关浏览器即清）。

## 安全说明

- ❌ 不要把密码写进 admin.html 或 git
- ❌ 不要把 admin.html 公开链接发到 SEO 可索引的位置（CloudBase 静态托管默认有 robots.txt，但还是要小心）
- ✅ 密码用 sessionStorage 而非 localStorage（关闭浏览器自动清除）
- ✅ 每次云函数调用都在服务端比对密码（与 process.env.ADMIN_PASSWORD），不依赖前端校验
- ✅ HTTPS 传输（CloudBase 全链路 HTTPS）

## 字段说明

### posts 状态机
- `pending_review` — 待人工审核（contentSafety 不可用时入此态）
- `risky` — 内容审核标记为风险但未明确拒绝（保留人工复核）
- `approved` — 已通过（feed 可见）
- `rejected` — 已拒绝（feed 不可见，存档 + `rejectReason`）

### disputes 状态机
- `pending` — 默认（用户刚提交）
- `resolved` — 后台已处理（写 `resolution` + `resolvedAt` + `resolvedBy`）

## 限制 / TODO

- 列表硬编码 50 条上限（posts/disputes）/ 100 条（feedback）。量大后加分页。
- 拒绝原因/处理结论用 `prompt()`，UX 一般。文本量大可后续改 modal。
- 反馈暂时只能看，不能回复（V2 加：写消息给用户 OPENID）。
- 无操作日志（V2 加 `admin_actions` 集合记录 who/when/what）。
