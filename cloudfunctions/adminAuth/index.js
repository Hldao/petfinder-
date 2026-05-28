// 云函数 adminAuth · 管理员密码验证（运营后台登录）
// 设计：密码与 process.env.ADMIN_PASSWORD 比对，匹配返回 ok。无 token，由前端 sessionStorage 保存后每次调用带上。
// 部署时必须在 CloudBase 控制台为本函数 + adminPosts + adminDisputes + adminFeedback 设置环境变量 ADMIN_PASSWORD
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event = {}) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, msg: '后台未配置 ADMIN_PASSWORD 环境变量' };
  if (!event.password) return { ok: false, msg: '请输入密码' };
  if (event.password !== expected) return { ok: false, msg: '密码错误' };
  return { ok: true };
};
