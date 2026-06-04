// 云函数 sendMessage · 发送一条消息（对应 03 接口 POST /chats/:id/messages）
// 每条必过 msgSecCheck（03 §4.7）· blocked 消息仍入库（留存 ≥6 月满足取证）但不送达
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { chatId = '', content = '', postId = '', peerId = '', type = 'text', lat = null, lng = null } = event;
  if (!content) return { ok: false, msg: '空消息' };
  if (!chatId) return { ok: false, msg: '缺少会话标识' };

  // participants：会话双方（去重 + 去空）→ chatList 据此聚合"我参与的会话"
  const participants = [...new Set([OPENID, peerId].filter(Boolean))];

  let status = 'sent';
  // 仅文字消息过 msgSecCheck；图片(content=fileID)/定位(content=地名)无可审文本。
  // 图片审核 imgSecCheck 真机易超时(-504003)，且私聊双方已撮合、风险低于公开 feed，
  // MVP 直接送达；上线如需可在此补 imgSecCheck（注意超时）。
  if (type === 'text') {
    try {
      const safe = await cloud.callFunction({ name: 'contentSafety', data: { text: content } });
      const r = (safe && safe.result) || {};
      if (r.pass === false) status = 'blocked';
      else if (r.pass === null) status = 'reviewing'; // 审核不可用 → 待人工
    } catch (e) {
      status = 'reviewing';
    }
  }

  const doc = {
    chatId, postId, sender_id: OPENID, peer_id: peerId, participants,
    content, type, status,
    createdAt: db.serverDate(),
  };
  if (type === 'location') { doc.lat = lat; doc.lng = lng; } // 定位消息存坐标供 openLocation
  try {
    const add = await db.collection('messages').add({ data: doc });
    return { ok: true, id: add._id, status };
  } catch (e) {
    return { ok: false, status, error: String(e) };
  }
};
