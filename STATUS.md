# 项目进度速查（STATUS）

> 切回项目时**先读这里**。5 分钟内回到工作状态。
> 最后更新：2026-05-23

---

## 🎯 一句话定位

让大理本地走失/招领宠物的信息跨社交圈流通起来。**平台只做撮合 + 关键节点 + 激励发放**，不当留痕系统、不当流程管控者。

---

## 📅 项目阶段（自上而下推进）

| 阶段 | 状态 | 产物 |
|------|------|------|
| 1. 需求与定位 | ✅ 完成 | `README.md`、`docs/00-overview.md` |
| 2. 善行值激励体系 | ✅ 完成 | `docs/01-points-system.md` |
| 3. 状态机设计 | ✅ 完成 | `docs/02-state-machines.md` |
| 4. 产品哲学 | ✅ 完成 | `docs/06-product-philosophy.md` |
| 5. 高保真原型（v1-v6） | ✅ 完成 | `prototypes/app-prototype-v6.html`（主原型） |
| 6. **MVP 范围裁剪** | 🚧 待补 | `docs/03-mvp-scope.md` |
| 7. **数据库表设计** | 🚧 待补 | `docs/04-database.md` |
| 8. **风险与合规** | 🚧 待补 | `docs/05-risks.md` |
| 9. **Design Doc 整合** | 🚧 待写 | `docs/DESIGN.md` |
| 10. 实施计划 / 开发开始 | ⏸ 未开始 | — |

---

## 🚀 下一步具体 todo（按优先级）

1. **对齐善行值规则**：原型 v1-v6 沿用 V2.0 旧规则 `线索 +1 / 归还 +6`，但 `docs/01-points-system.md` 已升级为新规则 `线索 +2 + 关键 +3 / 临时照料 +5 / 归还 +4`。要么改原型显示数字，要么开发时直接用新规则。**推荐后者**——下次原型迭代或正式开发时统一对齐。

2. **补 `docs/03-mvp-scope.md`**：明确 M0+ 包含/不包含哪些功能（搜索栏、地图 tab、邀请奖励、海报生成、志愿者后台等已决定不做或后置，需要落地成文档）。

3. **补 `docs/04-database.md`**：8 张核心表的字段定义（users / lost_pets / found_pets / clues / return_confirmations / thanks / point_transactions / reports）。

4. **补 `docs/05-risks.md`**：微信小程序合规底线（不能"加微信"字眼、平台对话必须、关键节点在小程序内）、冷启动假设风险、反作弊参数都是猜的。

5. **整合写 `docs/DESIGN.md`**：把上面所有 docs 摘要 + 数据流时序图整合成一份 design doc，作为实施计划的输入。

6. **撰写实施计划**（writing-plans 阶段）：分 Milestone 0/1/2，每个 milestone 的具体任务清单。

---

## 📚 5 分钟回到上下文 — 最少阅读清单

按顺序看这 4 个文件：

1. `README.md` — 项目骨架
2. **`STATUS.md`（本文件）** — 进度 + 下一步
3. `docs/06-product-philosophy.md` — **核心**：为什么这个产品长这样
4. `prototypes/app-prototype-v6.html` — 用浏览器打开看主原型

如果还有时间再看：
- `docs/00-overview.md` — 项目背景细节
- `docs/01-points-system.md` — 善行值规则
- `docs/02-state-machines.md` — 数据状态机

---

## 🗂 文件位置速查

```
petfinder/
├── README.md                          ← 项目导航
├── STATUS.md                          ← 你现在在看的这个
├── .gitignore
├── docs/
│   ├── 00-overview.md                 ← 项目背景
│   ├── 01-points-system.md            ← 善行值规则（已升级）
│   ├── 02-state-machines.md           ← 状态机
│   ├── 06-product-philosophy.md       ← 产品哲学（v6 后核心思想）
│   ├── 03-mvp-scope.md                ← 🚧 待补
│   ├── 04-database.md                 ← 🚧 待补
│   └── 05-risks.md                    ← 🚧 待补
└── prototypes/
    ├── feed-home.html                 ← v0
    ├── app-prototype-v1.html          ← 3 屏
    ├── app-prototype-v2.html          ← +发布+归还
    ├── app-prototype-v3.html          ← 沟通建议软化
    ├── app-prototype-v4.html          ← 哲学定稿
    ├── app-prototype-v5.html          ← 16 屏铺开
    └── app-prototype-v6.html          ← ★ 主原型（认领流程极简后）
```

---

## 🤝 协作上下文

- **目标城市**：云南大理（古城/下关/海东三个核心区互不重叠的社群网络）
- **团队**：开发者全职主导设计与代码（通过 Claude Code 实现）+ 1 名合作者全职
- **GitHub**：https://github.com/Hldao/petfinder-（public）
- **技术栈**：微信小程序原生 + 腾讯云开发（CloudBase）
- **小程序类目**：公益 / 动物救助（不选"生活服务"，审核更宽松）

---

## ⚠️ 切回项目时的 3 个提醒

1. **不要纠结于"留痕"**——平台允许用户私加微信、转线下，关键节点回小程序打卡就行。这是 v4 之后的核心哲学翻转，详见 `docs/06-product-philosophy.md`。
2. **善行值规则在 docs 和原型里不一致**（见上"下一步 todo #1"）。下次代码开发或原型迭代必须先对齐。
3. **地图 tab、邀请奖励、爬取冷启动数据已经决定不做**（M0）。如果讨论时有人提起，看 `docs/03-mvp-scope.md`（待补）或 `docs/06-product-philosophy.md` 中的对应章节。
