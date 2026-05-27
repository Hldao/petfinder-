// 云函数 myPosts · 查当前用户发布的帖（所有生命周期状态 · 不限 approved）
// is_owner = post.poster_id === openid（00 用户角色）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  try {
    const res = await db.collection('posts')
      .where({ poster_id: OPENID })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const posts = (res.data || []).map(doc => {
      const t = doc.type || 'lost';
      return Object.assign({}, doc, {
        id: doc._id,
        status: t,                       // 卡片展示用 lost/found
        statusLabel: t === 'lost' ? '寻宠' : '招领',
        lifecycle: doc.status,           // 生命周期 approved/pending_review/pending_return/returned
        _isMine: true,
      });
    });
    return { posts };
  } catch (e) {
    return { posts: [], error: String(e) };
  }
};
