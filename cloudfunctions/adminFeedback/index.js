// 云函数 adminFeedback · 意见反馈查看（list）
// 调用：{ password, action: 'list' }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, msg: '后台未配置 ADMIN_PASSWORD' };
  if (event.password !== expected) return { ok: false, msg: '权限不足' };

  const action = event.action || 'list';

  if (action === 'list') {
    const res = await db.collection('feedback')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return { ok: true, list: res.data };
  }

  return { ok: false, msg: '未知 action' };
};
