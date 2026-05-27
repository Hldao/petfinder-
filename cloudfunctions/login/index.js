// 云函数 login · code → openid（对应 03 接口 POST /users/login）
// 用户身份基于 OpenID 自动建立，无注册/注销概念（06 反例库「注销账号」）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  // upsert 用户记录（首次登录建档）
  try {
    const users = db.collection('users');
    const existed = await users.where({ openid: OPENID }).count();
    if (existed.total === 0) {
      await users.add({ data: { openid: OPENID, createdAt: db.serverDate() } });
    }
  } catch (e) {
    // users 集合还没建时不阻断登录
    console.warn('users upsert skipped:', String(e));
  }
  return { openid: OPENID };
};
