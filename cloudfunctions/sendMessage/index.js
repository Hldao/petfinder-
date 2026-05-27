// 云函数 sendMessage · 发送一条消息（对应 03 接口 POST /chats/:id/messages）
// 每条必过 msgSecCheck（03 §4.7）· blocked 消息仍入库（留存 ≥6 月满足取证）但不送达
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { chatId = '', content = '' } = event;
  if (!content) return { ok: false, msg: '空消息' };

  let status = 'sent';
  try {
    const safe = await cloud.callFunction({ name: 'contentSafety', data: { text: content } });
    const r = (safe && safe.result) || {};
    if (r.pass === false) status = 'blocked';
    else if (r.pass === null) status = 'reviewing'; // 审核不可用 → 待人工
  } catch (e) {
    status = 'reviewing';
  }

  const doc = {
    chatId, sender_id: OPENID, content, type: 'text', status,
    createdAt: db.serverDate(),
  };
  try {
    const add = await db.collection('messages').add({ data: doc });
    return { ok: true, id: add._id, status };
  } catch (e) {
    return { ok: false, status, error: String(e) };
  }
};
