// 云函数 adminPosts · 帖子审核（list / approve / reject）
// 调用：{ password, action: 'list' | 'approve' | 'reject', id?, reason? }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, msg: '后台未配置 ADMIN_PASSWORD' };
  if (event.password !== expected) return { ok: false, msg: '权限不足' };

  const action = event.action || 'list';

  if (action === 'list') {
    // 待审核 / 风险标记 一并拉出来，按时间倒序
    const _ = db.command;
    const res = await db.collection('posts')
      .where({ status: _.in(['pending_review', 'risky']) })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return { ok: true, list: res.data };
  }

  if (action === 'approve') {
    if (!event.id) return { ok: false, msg: '缺 id' };
    await db.collection('posts').doc(event.id).update({
      data: { status: 'approved', reviewedAt: db.serverDate(), reviewedBy: 'admin' },
    });
    return { ok: true };
  }

  if (action === 'reject') {
    if (!event.id) return { ok: false, msg: '缺 id' };
    await db.collection('posts').doc(event.id).update({
      data: {
        status: 'rejected',
        rejectReason: event.reason || '',
        reviewedAt: db.serverDate(),
        reviewedBy: 'admin',
      },
    });
    return { ok: true };
  }

  return { ok: false, msg: '未知 action' };
};
