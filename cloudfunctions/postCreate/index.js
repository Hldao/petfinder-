// 云函数 postCreate · 创建帖子（对应 03 接口 POST /posts）
// 客户端永不直接写库（00 架构原则 1）· 内容必过审核 · 未通过不入 feed
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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
  try {
    const safe = await cloud.callFunction({ name: 'contentSafety', data: { text: `${desc} ${name} ${breed}`, images: photos } });
    const r = (safe && safe.result) || {};
    if (r.pass === false) return { ok: false, msg: '内容含敏感信息（如微信/电话/悬赏），请修改后重发' };
    if (r.pass === true) status = 'approved';
  } catch (e) {
    // contentSafety 调用异常 → 保持 pending_review
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
