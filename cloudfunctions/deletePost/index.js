// 云函数 deletePost · 删除自己发布的帖子
// 客户端永不直接写库（00 架构原则 1）→ 经云函数(admin 权限)；代码内校验 poster_id 防越权删他人帖。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { postId = '' } = event;
  if (!postId) return { ok: false, msg: '缺少帖子标识' };
  try {
    const doc = await db.collection('posts').doc(postId).get();
    const post = doc && doc.data;
    if (!post) return { ok: false, msg: '帖子不存在或已删除' };
    if (post.poster_id !== OPENID) return { ok: false, msg: '只能删除自己发布的帖子' };
    await db.collection('posts').doc(postId).remove();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
