# 02 — 三张核心表的状态机

> 这是开发阶段最容易返工的地方，先把转换图理清楚再动键盘。

---

## 1. `lost_pets`（寻宠帖）

### 状态枚举

| 状态 | 含义 | 是否终态 |
|------|------|---------|
| `searching` | 寻找中（默认） | 否 |
| `tracking` | 有线索跟进中 | 否 |
| `pending_return` | 归还流程进行中 | 否 |
| `returned` | 已归还 | **终态** |
| `closed_self` | 自行找回 | **终态** |
| `expired` | 90 天无更新自动归档 | 软终态（可复活） |
| `removed` | 已删除 | **终态** |

### 状态转换

```
                                  ┌── 24h 内反悔 ──┐
                                  ▼               │
[searching] ──失主标记线索"有用"──→ [tracking] ─发起归还→ [pending_return] ─双方确认→ [returned]
    │                                  │                                            │
    │ 失主自行找到                       │                                            │
    └──→ [closed_self]                  │                                            │
    │                                  │                                            │
    │ 90 天无更新（自动）                 │                                            │
    └──→ [expired] ←──────────────────┘                                            │
    │                                                                              │
    │ 管理员/失主删除                                                                │
    └──→ [removed] ←──────────────────────────────────────────────────────────────┘
```

### 关键规则
- `expired` 是软终态，失主可手动"重新激活"回到 `searching`
- `returned` 后允许撤回到 `tracking`（24h 内冒领发现）

---

## 2. `found_pets`（招领帖）

### 状态枚举

| 状态 | 含义 | 是否终态 |
|------|------|---------|
| `published` | 已发布（默认） | 否 |
| `caring` | 临时照料中 | 否 |
| `pending_return` | 归还流程进行中 | 否 |
| `returned` | 已归还 | **终态** |
| `unclaimed` | 30 天无人认领 | 软终态（可复活） |
| `removed` | 已删除 | **终态** |

### 状态转换

```
[published] ─勾选可照料─→ [caring] ─失主联系─→ [pending_return] ─双方确认→ [returned]
    │                       │                                              │
    │ 失主联系（未照料）      │                                              │
    └─→ [pending_return] ←──┘                                              │
    │                                                                       │
    │ 30 天无认领（自动）                                                     │
    └──→ [unclaimed] ────────────────────────────────────────────────────→ │
    │                                                                       │
    │ 删除                                                                   │
    └──→ [removed] ←─────────────────────────────────────────────────────→ │
```

### 关键规则
- 发布时勾选"可临时照料"则自动进 `caring`，否则停在 `published`
- `unclaimed` 后发现者可手动延长 30 天

---

## 3. `return_confirmations`（归还确认，最关键）

### 状态枚举

| 状态 | 含义 | 善行值结算 |
|------|------|-----------|
| `initiated` | 失主点"我要认领" | 不结算 |
| `partial` | 一方已确认，等另一方 | 不结算 |
| `confirmed` | 双方已确认（24h 冷却） | 24h 后结算 |
| `disputed` | 任一方申请仲裁 | 冻结，等仲裁 |
| `canceled` | 任一方撤销 | 不结算（已结算的回滚） |

### 状态转换

```
                            ┌─── 双方都确认 ───→ [confirmed] ──24h 冷却期──→ 触发结算
                            │                       │
[initiated] ─任一方先确认──→ [partial] ─另一方确认──┘   │
    │                          │                       │
    │                          │  任一方反悔            │
    │                          ├──────────────────────→ [canceled]
    │                          │
    │                          │  任一方申请仲裁
    │                          └──────────────────────→ [disputed] ──仲裁→ confirmed / canceled
    │
    │ 任一方主动取消（未确认前）
    └──→ [canceled]
```

### 24h 冷却期（重点）

`confirmed` 后**不立即结算**善行值，留 24 小时反悔窗口。这是冒领的最后防线。
- 冷却期内 UI 显示"等待 24 小时确认期结束"
- 任一方在冷却期内可点击"撤回归还"，状态退回 `partial`，需重新走流程
- 冷却期满后定时任务（云函数定时触发器）扫一遍 `confirmed` 状态，进行善行值结算

### 一只宠物多人匹配

同一只 `lost_pet_id` 可能对应多条 `return_confirmations`（多人捡到，误认）。
- 允许并行存在多个 `initiated / partial` 状态的 confirmations
- **一旦某个进入 `confirmed`**，其他同 lost_pet_id 的自动 → `auto_canceled`
- 数据完整性靠**事务**保证（云函数原子操作或乐观锁）

---

## 跨表状态联动

| 触发 | lost_pets | found_pets | return_confirmations |
|------|-----------|------------|---------------------|
| 失主标记线索"有用" | searching → tracking | — | — |
| 失主发起归还 | tracking → pending_return | published/caring → pending_return | (create) → initiated |
| 一方确认归还 | — | — | initiated → partial |
| 双方确认归还 | — | — | partial → confirmed（开始 24h 冷却） |
| 冷却 24h 后结算 | pending_return → returned | pending_return → returned | confirmed → (结算完成) |
| 一方在冷却期撤回 | pending_return → tracking | pending_return → caring/published | confirmed → canceled |
| 一方申请仲裁 | （保持当前） | （保持当前） | (任意) → disputed |

---

## 仲裁动作集（志愿者）

仲裁员只有两个动作，确保流程封闭：
- **判定 confirmed** → 触发善行值结算
- **判定 canceled** → 双方都不得分，恶意一方扣分 + 封号

⚠️ 仲裁员**不能直接改善行值**，避免暗箱操作。

---

## 待拍板的决策

- [ ] 24h 冷却期 vs 立即结算？（推荐 24h）
- [ ] 一只宠物允许同时存在多个 pending_return 吗？（推荐允许，并行匹配）
- [ ] `expired` / `unclaimed` 帖子的"重新激活"放 V1 还是 V2？（推荐 V1，因为成本极低）
