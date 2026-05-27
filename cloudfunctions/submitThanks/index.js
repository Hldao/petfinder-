// 云函数 submitThanks · 感谢信入库（归还后写 · 触发被点名者轻量信任记录）
// 关键节点在平台内（06 第3条）· 不数据化为分数（§6.7）· 仅记录"收到 N 封感谢"
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { text = '', photo = '', pet = '' } = event;
  if ((text || '').length < 5) return { ok: false, msg: '写几句吧' };

  try {
    const images = photo ? [photo] : [];
    const safe = await cloud.callFunction({ name: 'contentSafety', data: { text, images } });
    if (safe && safe.result && safe.result.pass === false) return { ok: false, msg: '内容含敏感信息' };
  } catch (e) { /* 审核不可用不阻断 */ }

  try {
    await db.collection('thanks').add({ data: { text, photo, pet, from: OPENID, createdAt: db.serverDate() } });
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: '提交失败', error: String(e) };
  }
};
