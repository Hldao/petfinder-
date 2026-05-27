// 云函数 confirmReturn · 确认归还（驱动 return_confirmations 状态机 · 02 §3）
// MVP 简化：一个按钮即进入 confirmed + 24h 冷却（归还极简 · 06 第1条）
// 不立即结算善行值，留 24h 反悔窗口（冒领最后防线 · 02 §24h 冷却）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { postId } = event;
  if (!postId) return { ok: false, msg: '缺少 postId' };

  const cooldownUntil = Date.now() + 24 * 3600 * 1000;
  try {
    await db.collection('return_confirmations').add({
      data: { post_id: postId, by: OPENID, state: 'confirmed', cooldownUntil, createdAt: db.serverDate() },
    });
    await db.collection('posts').doc(postId).update({
      data: { status: 'pending_return', returnCooldownUntil: cooldownUntil, updatedAt: db.serverDate() },
    });
    return { ok: true, cooldownUntil };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
