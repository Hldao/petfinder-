// 云函数 chatList · 当前用户参与的所有会话（按最近消息倒序）
// messages 集合"仅创建者可读写" → 必须云函数聚合；
// 用 participants 数组字段查"我参与的会话"（云数据库对数组字段做标量匹配＝包含）。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  try {
    const res = await db.collection('messages')
      .where({ participants: OPENID })
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    const rows = res.data || [];

    // 按 chatId 分组，取每组最新一条（rows 已倒序 → 首次出现即最新）
    const seen = {};
    const order = [];
    for (const m of rows) {
      if (!m.chatId) continue;
      if (!seen[m.chatId]) { seen[m.chatId] = m; order.push(m.chatId); }
    }

    // 批量关联帖子信息（emoji / 名称 / 状态）
    const postIds = [...new Set(order.map(cid => seen[cid].postId).filter(Boolean))];
    const postMap = {};
    if (postIds.length) {
      const pr = await db.collection('posts').where({ _id: _.in(postIds) }).get();
      (pr.data || []).forEach(p => { postMap[p._id] = p; });
    }

    const chats = order.map(cid => {
      const last = seen[cid];
      const post = postMap[last.postId] || {};
      const type = post.type || 'lost';
      const statusLabel = post.status === 'returned'
        ? '已归还'
        : (type === 'lost' ? '寻宠' : '招领');
      return {
        chatId: cid,
        postId: last.postId || '',
        peerId: (last.participants || []).find(id => id !== OPENID) || last.sender_id,
        emoji: post.emoji || '🐾',
        petName: post.name || (type === 'found' ? '招领宠物' : '宠物'),
        statusLabel,
        type,
        role: post.poster_id === OPENID ? 'owner' : 'finder',
        lastMsg: last.status === 'blocked' ? '[消息被拦截]' : last.content,
        lastMine: last.sender_id === OPENID,
        lastTs: last.createdAt ? new Date(last.createdAt).getTime() : 0,
      };
    });
    return { ok: true, chats };
  } catch (e) {
    return { ok: false, error: String(e), chats: [] };
  }
};
