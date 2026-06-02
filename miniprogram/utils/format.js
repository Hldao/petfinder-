// 纯展示函数 · 从原型 v10 移植（无 DOM 依赖，可直接复用）

// 距离：<10km 保留 1 位小数，否则取整
function distanceStr(km) {
  if (km == null) return '';
  return km < 10 ? km.toFixed(1) : km.toFixed(0);
}

// 接力数文案（🤝 N 接力 = N 个不同的人在帮 · 见 03 § 1.3.1）
function helpersText(d) {
  if (!d.helpers) return '还没有人接力';
  return `🤝 ${d.helpers} 接力`;
}

// 卡片左侧地点行：「在 XX 走失/发现 · 距你 N km」（无距离时省略距离段）
function locLine(d) {
  const verb = d.status === 'lost' ? '走失' : '发现';
  const base = `📍 在${d.loc}${verb}`;
  return d.distanceKm > 0 ? `${base} · 距你 ${distanceStr(d.distanceKm)} km` : base;
}

module.exports = { distanceStr, helpersText, locLine };
