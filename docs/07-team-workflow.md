# 07 — 团队协作工作流

> 本文档不是"规矩"，是**沉淀真实事故的教训**。
> 每条规则都对应一次真实出过问题的场景。读完能让你少踩 80% 的坑。
>
> **新加入伙伴必读**。

---

## 一、本仓库已发生的真实事故（按时间倒序）

### 🚨 案例 1 · Merge 保留"我们的删除"+"他们的调用"（发生过 2 次同型事故）

**现象**：
- 队友 push 之后，本地拉下来运行 → **feed 卡片渲染不出来 / banner 永不消失**
- 浏览器 DevTools Console 报 `ReferenceError: xxx is not defined`

**根因**：

队友的 merge 时，对同一段代码做了**最矛盾的选择**：

| 代码 | 状态 |
|---|---|
| `function isUrgent(d) { ... }` 定义 | **我们已删** · merge 保留了"删除" |
| `if (isUrgent(d)) { ... }` 调用 | **队友新增** · merge 保留了"新增" |

→ 函数没定义 + 代码调用 = JS ReferenceError → 后续代码不执行

**两次发生的具体函数**：
1. `isUrgent / renderTimeAndPhase / getRecoveryPhase`（我们 661ce7c 砍紧迫度系统时删的）
2. `initStatBarAutoDismiss`（我们 7feb023 加 banner 自隐时定义的）

**教训**：

→ **任何 merge 后必须开浏览器跑一遍核心流程 + 看 Console 有无报错**
→ Merge 时遇到 `<<<<<<<` 冲突标记，两边的删除/新增都要审视一遍

---

### 🚨 案例 2 · sed 处理含中文多行字符串把整个文件清空

**现象**：
- 一个 `sed -i '' -E "s/, source:'[^']*', sourceLabel:'[^']*',//g" v10.html`
- 执行后 v10.html **从 5076 行变成 0 字节空文件**
- 当时未 commit 的 6 个改动**全部丢失**（phase 系统 / 奥卡姆四件套 / 数据条叙事 / urgent 视觉强化 / nearby-helpers）

**根因**：
- macOS BSD sed 在 `-i ''` 模式下处理含中文 + 多行字符串时**行为不稳定**
- 复杂的正则一旦匹配出问题，会把整个文件流截断

**教训**：

→ **禁止用 sed 改 HTML/JS/Markdown 复杂文件**
→ 统一用 IDE 或 Claude Code 的 Edit 工具
→ **每个独立改动立即 commit**，不要攒着 — 否则一次事故全丢

---

### 🚨 案例 3 · 长分叉后合并丢失主线决策

**现象**：
- 队友早期 fork v8 出去做 v9 / v10
- 主线 v8 继续迭代了 3 个决策（砍临时照料 / 转发卡双码 / 冷启动三件套）
- 合并时这 3 个决策**没自动同步到 v10**

**根因**：长分叉无强制 rebase 节奏

**教训**：

→ 不要长时间在脱节版本上单独迭代
→ 如果必须脱节，**每天/每周强制 rebase 主线**，让冲突早暴露

---

## 二、Merge 前 / 中 / 后 checklist

### 🟢 Merge 前

- [ ] `git fetch origin` 看远端状态
- [ ] `git status -sb` 确认本地工作区干净（有未 commit → 先 commit 或 stash）
- [ ] `git log --oneline HEAD..origin/dadao` 看队友推了哪些 commit
- [ ] `git diff --stat HEAD..origin/dadao` 看影响哪些文件、规模多大
- [ ] 如果改动 > 200 行 → **先点开 commit 看队友改了什么思路**，不要盲合

### 🟡 Merge 中

- [ ] 优先用 `git pull --rebase`（保持线性历史）
- [ ] 遇到 `<<<<<<<` 冲突标记 → 用 **3-way diff 视图**（IDE 或 `git mergetool`）
- [ ] 对每个冲突块问 3 个问题：
  1. **「他们的代码引用了我们删掉的东西」**？→ 要么恢复，要么改调用，**不要直接接受双方**
  2. **「他们删了我们的函数 + 没引用」**？→ 安全接受
  3. **「双方都改了同一个函数体」**？→ 必须人工合并逻辑，理解双方意图
- [ ] 解决完跑 `git diff --check` 确认无残留冲突标记

### 🔴 Merge 后必须做（一个都不能省）

- [ ] **代码层校验**：grep 一遍可能被删的关键函数名（如 `grep -n "function xxx\|xxx(d)"`），确认定义和调用对得上
- [ ] **运行时校验**：浏览器打开 + DevTools Console **必须无 ReferenceError / TypeError**
- [ ] **核心流程跑一遍**：feed 加载 → 卡片点击 → 详情页 → 发布表单 → 转发 modal
- [ ] **commit message** 明确写：「合并自 XX commit，处理了 YY 冲突；保留了 A 删除了 B」
- [ ] push 前再跑一次 `git status -sb`

---

## 三、Commit 习惯（吸取的教训）

| 规则 | 为什么 |
|---|---|
| **每个独立改动立即 commit** | 案例 2 中未 commit 的工作被 sed 清空全丢；commit 是你的保险 |
| **commit 不超过 200 行代码 + 一个独立目的** | 便于 review 和 rollback |
| **commit message 包含"为什么"不只是"是什么"** | git diff 看得到 what，看不到 why；半年后回头看只剩 message |
| **不要攒着工作晚上一起 push** | 队友看不到你的进度，更容易撞车 |
| **push 前一定先 fetch + check** | 防止覆盖队友刚推的工作 |

---

## 四、本仓库的协作约定

### 4.1 分支策略

- **当前所有协作在 `dadao` 分支**
- 规模大了再考虑分 feature 分支
- 不要直接动 `main`（如果存在的话）

### 4.2 文件协作密度

| 文件 | 协作密度 | 改之前打招呼？ |
|---|---|---|
| `prototypes/app-prototype-v10.html` | 🔴 极高（多人同改）| ⚠ 大改动前在群里说一声 |
| `docs/06-product-philosophy.md` | 🟠 中（哲学需共识）| ✅ 改之前讨论 |
| `docs/03-mvp-scope.md` | 🟠 中 | 大块改动前对齐 |
| `docs/0X-*.md` 其他 | 🟢 低 | 起草者主负责 |

### 4.3 工具约定

- 改 HTML/JS/MD：**用 IDE 或 Claude Code 的 Edit 工具**
- **禁用 sed** 处理含中文的多行字符串
- 提交前至少在浏览器跑一遍核心流程

### 4.4 Commit message 风格（参考既有 commit history）

```
<type>(<scope>): <一句话目的>

<3-10 行 详细说明，包含 why>

<可选：影响范围 / 校验结果 / 关联决策>

Co-Authored-By: ... <如果是 AI 协作>
```

`type` 可用：`feat` / `refactor` / `fix` / `docs` / `chore` / `merge`
`scope` 可用：`v10` / `mvp` / `philosophy` / `risks` / 具体模块名

---

## 五、新加入伙伴的 Onboarding 路径（5 分钟版本）

| 顺序 | 文件 | 用途 |
|---|---|---|
| 1 | `README.md` | 项目背景 + 文档导航 |
| 2 | **`docs/06-product-philosophy.md`** | ★ 必读 · 8 条核心哲学 + 奥卡姆案例库。**比代码更重要** |
| 3 | `docs/03-mvp-scope.md` | MVP 范围 6 大模块详细规格 |
| 4 | **`docs/07-team-workflow.md`** | ★ 本文档 · 团队协作规范 |
| 5 | `prototypes/app-prototype-v10.html` | 当前主原型（启动 `python3 -m http.server 8765 --directory prototypes`）|

防止新人踩坑的 3 个提醒：

1. **不要往里加更多功能** → 读 `06` 的「奥卡姆案例库」，大概率你想加的东西已被砍过
2. **任何修改后立即 commit 立即 push** → 不要攒着，避免一次事故全丢
3. **用 Edit 工具改文件，不要用 sed** → 案例 2 的教训

---

## 六、复用这份文档的方式

- **新事故发生后** → 把现象/根因/教训按案例 1-3 的格式追加到第一节，让后人少踩一次
- **每月一次 review** → 看 checklist 是否需要更新
- **被问"为什么这么做"时** → 直接 reference 对应案例
