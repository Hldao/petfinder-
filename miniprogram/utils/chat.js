// 私聊会话工具 · chatId 生成规则 + openid 兜底
// chatId = 同一对用户 + 同一个帖 → 永远确定性落到同一个"房间"
// 仅作不透明 key 用于精确匹配（不反向解析），故分隔符歧义无影响；
// 会话的结构化信息（postId/participants）由 sendMessage 单独存字段，不靠解析 chatId。
function makeChatId(postId, a, b) {
  return String(postId) + '__' + [String(a), String(b)].sort().join('__');
}

// 拿当前用户 openid；globalData 异步未就绪时补调一次 login
function ensureOpenid() {
  return new Promise(resolve => {
    const app = getApp();
    const cur = app.globalData.openid;
    if (cur) return resolve(cur);
    if (!app.globalData.cloudReady || !wx.cloud) return resolve('');
    wx.cloud.callFunction({ name: 'login' })
      .then(res => {
        const id = (res.result && res.result.openid) || '';
        app.globalData.openid = id;
        resolve(id);
      })
      .catch(() => resolve(''));
  });
}

// 时间戳 → 列表/气泡展示：当天显示 HH:mm，否则 MM-DD
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const p = n => String(n).padStart(2, '0');
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

module.exports = { makeChatId, ensureOpenid, fmtTime };
