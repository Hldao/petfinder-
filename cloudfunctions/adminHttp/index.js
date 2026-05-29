// 云函数 adminHttp · HTTP 触发器代理（运营后台用，绕开 CloudBase Web SDK）
// 设计：通过 HTTP 触发器对外暴露，浏览器 fetch 调用，内部路由到 admin* 函数。
// 部署：上传后到 CloudBase 控制台 → 云函数 → adminHttp → 触发器 → 新建 HTTP 触发器
// 环境变量：ADMIN_PASSWORD（同 adminAuth 一份）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ALLOWED_FNS = ['adminAuth', 'adminPosts', 'adminDisputes', 'adminFeedback'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

exports.main = async (event = {}) => {
  // HTTP 触发器：event 含 httpMethod / body
  // 普通调用：直接 event 对象
  const isHttp = !!event.httpMethod;

  if (isHttp && event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  let payload = event;
  if (isHttp) {
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return resp(400, { ok: false, msg: 'body 不是合法 JSON' });
    }
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return isHttp
      ? resp(500, { ok: false, msg: '后台未配置 ADMIN_PASSWORD' })
      : { ok: false, msg: '后台未配置 ADMIN_PASSWORD' };
  }
  if (!payload.password || payload.password !== expected) {
    return isHttp
      ? resp(401, { ok: false, msg: '密码错误' })
      : { ok: false, msg: '密码错误' };
  }

  const fn = payload.fn;
  if (!ALLOWED_FNS.includes(fn)) {
    return isHttp
      ? resp(400, { ok: false, msg: '未知函数：' + fn })
      : { ok: false, msg: '未知函数：' + fn };
  }

  try {
    const r = await cloud.callFunction({
      name: fn,
      data: Object.assign({}, payload.data || {}, { password: expected }),
    });
    return isHttp ? resp(200, r.result || {}) : (r.result || {});
  } catch (e) {
    const errBody = { ok: false, msg: '调用失败：' + (e.message || String(e)) };
    return isHttp ? resp(500, errBody) : errBody;
  }
};
