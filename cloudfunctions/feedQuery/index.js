// 云函数 feedQuery · 仅返回 status=approved 的帖（对应 03 接口 GET /feed）
// 客户端永不直接查库（00 架构原则 1），feed 列表统一走这里
// 字段映射：DB 用 type(lost/found)+status(approved)，卡片展示用 status(lost/found)+statusLabel
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { filter = 'all' } = event;
  const where = { status: 'approved' };
  if (filter === 'lost' || filter === 'found') where.type = filter;

  try {
    const res = await db.collection('posts')
      .where(where)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = (res.data || []).map(doc => {
      const t = doc.type || doc.status; // 兼容
      return Object.assign({}, doc, {
        id: doc._id, // 卡片导航 / wx:key 用统一 id
        status: t,
        statusLabel: t === 'lost' ? '寻宠' : '招领',
      });
    });
    return { posts };
  } catch (e) {
    // posts 集合还没建时返回空（feed 显示空状态 · 真实 > 看起来繁荣）
    return { posts: [], error: String(e) };
  }
};
