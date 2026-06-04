// 云函数 chatMessages · 拉取某会话的历史消息
// messages 集合权限"仅创建者可读写" → 客户端读不到对方创建的消息文档，
// 故历史消息必须经云函数（admin 权限）聚合返回。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { chatId = '' } = event;
  if (!chatId) return { ok: false, msg: '缺少 chatId', messages: [] };

  try {
    const res = await db.collection('messages')
      .where({ chatId })
      .orderBy('createdAt', 'asc')
      .limit(200)
      .get();
    const all = res.data || [];

    // 越权防护：我必须是该会话参与者（老数据无 participants 时放宽为 sender 判断）
    const belongs = all.length === 0 ||
      all.some(m => (Array.isArray(m.participants) && m.participants.includes(OPENID)) || m.sender_id === OPENID);
    if (!belongs) return { ok: false, msg: '无权访问该会话', messages: [] };

    const messages = all
      .filter(m => m.status !== 'blocked') // 被审核拦截的不送达
      .map(m => ({
        sender_id: m.sender_id,
        mine: m.sender_id === OPENID,
        content: m.content,
        type: m.type || 'text', // text | image(content=fileID) | location(content=地名 + lat/lng)
        lat: m.lat, lng: m.lng,
        status: m.status,
        ts: m.createdAt ? new Date(m.createdAt).getTime() : 0,
      }));
    return { ok: true, messages };
  } catch (e) {
    return { ok: false, error: String(e), messages: [] };
  }
};
