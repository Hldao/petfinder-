// 云函数 adminDisputes · 争议申诉处理（list / resolve）
// 调用：{ password, action: 'list' | 'resolve', id?, resolution? }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, msg: '后台未配置 ADMIN_PASSWORD' };
  if (event.password !== expected) return { ok: false, msg: '权限不足' };

  const action = event.action || 'list';

  if (action === 'list') {
    const res = await db.collection('disputes')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return { ok: true, list: res.data };
  }

  if (action === 'resolve') {
    if (!event.id) return { ok: false, msg: '缺 id' };
    await db.collection('disputes').doc(event.id).update({
      data: {
        status: 'resolved',
        resolution: event.resolution || '',
        resolvedAt: db.serverDate(),
        resolvedBy: 'admin',
      },
    });
    return { ok: true };
  }

  return { ok: false, msg: '未知 action' };
};
