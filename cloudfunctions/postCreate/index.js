// 云函数 postCreate · 创建帖子（对应 03 接口 POST /posts）
// 客户端永不直接写库（00 架构原则 1）· 内容必过审核 · 未通过不入 feed
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 开发期开关 · 仅当内容安全接口不可用(pass:null·未发布小程序调不通 msgSecCheck/imgSecCheck)时生效
// 在 postCreate 函数配置 → 环境变量 设 DEV_AUTO_APPROVE=1 即开发期自动通过；
// ⚠ 生产环境不要设此变量 → null 仍走 pending_review 交人工审核
const DEV_AUTO_APPROVE = process.env.DEV_AUTO_APPROVE === '1';

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const {
    type = 'lost', petType = 'other', emoji = '🐾',
    name = '', breed = '', sex = '不确定',
    loc = '', time = '', timeMins = 0, desc = '', photos = [],
    lat = null, lng = null,
    currentLocation = '', health = '',
  } = event;

  // 基础校验（与前端一致 · 防绕过）
  if (!['lost', 'found'].includes(type)) return { ok: false, msg: '类型错误' };
  if (!photos.length) return { ok: false, msg: '请至少上传 1 张照片' };
  if (!loc) return { ok: false, msg: '请选择地点' };
  if ((desc || '').length < 10) return { ok: false, msg: '描述至少 10 字' };

  // 内容审核：pass→approved，risky→拒绝，不可用→pending_review 交人工
  let status = 'pending_review';
  if (DEV_AUTO_APPROVE) {
    // ⚠ 开发期专用：未发布小程序的 msgSecCheck/imgSecCheck 在真机上会发起真实网络请求并
    // 挂起到超时（imgSecCheck 还逐张 downloadFile，更慢）。postCreate 串行等 contentSafety
    // 就会超过云函数默认 3s 执行上限被杀（-504003 FUNCTIONS_TIME_LIMIT_EXCEEDED · 真机联调撞到）。
    // 开发期审核结果反正一律放过 → 干脆跳过整个审核调用，直接 approved。
    // 生产环境不设 DEV_AUTO_APPROVE → 走下面真实审核链路。
    status = 'approved';
  } else {
    try {
      const safe = await cloud.callFunction({ name: 'contentSafety', data: { text: `${desc} ${name} ${breed}`, images: photos } });
      const r = (safe && safe.result) || {};
      if (r.pass === false) return { ok: false, msg: '内容含敏感信息（如微信/电话/悬赏），请修改后重发' };
      if (r.pass === true) status = 'approved';
      // pass:null（接口不可用）→ 保持 pending_review 交人工
    } catch (e) {
      // contentSafety 调用异常 → 保持 pending_review 交人工
    }
  }

  const doc = {
    type, status, statusLabel: type === 'lost' ? '寻宠' : '招领',
    emoji, petType,
    name: type === 'lost' ? name : '',
    breed, sex,
    loc, time, timeMins: Number(timeMins) || 0,
    lat, lng, distanceKm: 0, helpers: 0,
    desc, photos, clues: [],
    poster_id: OPENID,
    stats: { helpers: 0, shares: 0, clues: 0 },
    createdAt: db.serverDate(), updatedAt: db.serverDate(),
  };
  if (type === 'found') { doc.currentLocation = currentLocation; doc.health = health; }

  const add = await db.collection('posts').add({ data: doc });
  return { ok: true, id: add._id, status };
};
