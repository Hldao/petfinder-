// 云函数 submitDispute · 争议申诉入库（进入仲裁队列 · 02 仲裁 · 关键节点必须在平台内 06 第3条）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { text = '', photos = [], postId = '' } = event;
  if ((text || '').length < 10) return { ok: false, msg: '请详细描述（≥10 字）' };

  try {
    const safe = await cloud.callFunction({ name: 'contentSafety', data: { text, images: photos } });
    if (safe && safe.result && safe.result.pass === false) return { ok: false, msg: '内容含敏感信息' };
  } catch (e) { /* 审核不可用不阻断申诉 */ }

  try {
    await db.collection('disputes').add({
      data: { text, photos, post_id: postId, user_id: OPENID, status: 'pending', createdAt: db.serverDate() },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: '提交失败', error: String(e) };
  }
};
