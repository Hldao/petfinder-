// 纯展示函数 · 从原型 v10 移植（无 DOM 依赖，可直接复用）

// 距离：<10km 保留 1 位小数，否则取整
function distanceStr(km) {
  if (km == null) return '';
  return km < 10 ? km.toFixed(1) : km.toFixed(0);
}

// 情感化时间文案（仅寻宠 · 中性陈述，不做倒计时/损失框架 · 见 06 第 7 条）
// timeMins ≥ 1 天才显示「已走失第 N 天」；isLongterm(≥3天) 由页面决定是否标红
function emotionalTime(d) {
  if (d.status !== 'lost') return '';
  const days = Math.floor(d.timeMins / 1440);
  if (days < 1) return '';
  return `已走失第 ${days + 1} 天`;
}

function isLongterm(d) {
  return d.timeMins >= 4320; // ≥ 3 天，仅用于文案颜色
}

// 接力数文案（🤝 N 接力 = N 个不同的人在帮 · 见 03 § 1.3.1）
function helpersText(d) {
  if (!d.helpers) return '还没有人接力';
  return `🤝 ${d.helpers} 接力`;
}

// 卡片左侧地点行：「在 XX 走失/发现 · 距你 N km」
function locLine(d) {
  const verb = d.status === 'lost' ? '走失' : '发现';
  return `📍 在${d.loc}${verb} · 距你 ${distanceStr(d.distanceKm)} km`;
}

module.exports = { distanceStr, emotionalTime, isLongterm, helpersText, locLine };
