// 云函数 settleCooldown · 定时触发器（每小时）· 02 §24h 冷却
// 扫 confirmed 且冷却到期的 return_confirmations → posts 置 returned + 标记结算
// （V2 启用善行值时，这里是唯一结算入口 · 00 架构原则2）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const now = Date.now();
  let settled = 0;
  try {
    const res = await db.collection('return_confirmations')
      .where({ state: 'confirmed', cooldownUntil: _.lte(now) })
      .limit(100)
      .get();
    for (const rc of res.data) {
      try {
        await db.collection('posts').doc(rc.post_id).update({ data: { status: 'returned', updatedAt: db.serverDate() } });
        await db.collection('return_confirmations').doc(rc._id).update({ data: { state: 'settled', settledAt: db.serverDate() } });
        settled++;
      } catch (e) { /* 单条失败不阻断其余 */ }
    }
    return { ok: true, settled };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
