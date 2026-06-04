// 云函数 submitClue · 给某帖追加一条公开线索（「我看到了」· 06 哲学 r17）
// 留线索的是路人(非帖主)，posts 权限"仅创建者可写" → 必须经云函数(admin 权限)写入。
// 内容审核 best-effort：纯文本走 msgSecCheck，接口不可用/异常不阻塞（文本审核无 downloadFile，
// 不会像发帖图片审核那样超时 -504003）；pass===false 才拦截。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const { postId = '', text = '' } = event;
  const t = (text || '').trim();
  if (!postId) return { ok: false, msg: '缺少帖子标识' };
  if (t.length < 2) return { ok: false, msg: '请说一下你看到的' };
  if (t.length > 200) return { ok: false, msg: '线索请控制在 200 字内' };

  // 内容审核（接口不可用时静默放过，交后台手审）
  try {
    const safe = await cloud.callFunction({ name: 'contentSafety', data: { text: t } });
    const r = (safe && safe.result) || {};
    if (r.pass === false) return { ok: false, msg: '内容含敏感信息（如微信/电话），请修改后重发' };
  } catch (e) { /* 接口不可用 → 放过 */ }

  // 不收集真实身份（反例 #8 信任剧场）→ 统一占位「热心人」；时间用相对文案，ts 备查
  const clue = { name: '热心人', loc: '', timeAgo: '刚刚', text: t, by: OPENID, ts: Date.now() };
  try {
    await db.collection('posts').doc(postId).update({
      data: { clues: _.push([clue]), 'stats.clues': _.inc(1), updatedAt: db.serverDate() },
    });
    return { ok: true, clue };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
