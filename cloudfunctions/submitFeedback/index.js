// 云函数 submitFeedback · 意见反馈入库（UGC → 过 msgSecCheck）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { cat = 'other', text = '' } = event;
  if (!text) return { ok: false, msg: '空内容' };

  try {
    const safe = await cloud.callFunction({ name: 'contentSafety', data: { text } });
    if (safe && safe.result && safe.result.pass === false) return { ok: false, msg: '内容含敏感信息' };
  } catch (e) { /* 审核不可用不阻断反馈 */ }

  try {
    await db.collection('feedback').add({ data: { cat, text, user_id: OPENID, createdAt: db.serverDate() } });
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: '提交失败', error: String(e) };
  }
};
