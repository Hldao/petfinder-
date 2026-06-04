// 纯展示/计算函数 · 从原型 v10 移植（无 DOM 依赖，可直接复用）

// 距离：<10km 保留 1 位小数，否则取整
function distanceStr(km) {
  if (km == null) return '';
  return km < 10 ? km.toFixed(1) : km.toFixed(0);
}

// 两点球面距离（haversine）· 返回 km · 给真实帖现场算「距你」
function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
  const R = 6371;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 年龄段标签（粗略年龄段 · r39）
const AGE_LABEL = { puppy: '幼年', adult: '成年', senior: '老年', unknown: '' };
function ageStageLabel(s) { return AGE_LABEL[s] || ''; }

// 名字旁副文本 · 对齐原型 petMeta：招领带年龄段(性别·年龄段·品种)，寻宠(性别·品种)
function petMeta(d) {
  if (d.status === 'found' && d.ageStage) {
    return [d.sex, ageStageLabel(d.ageStage), d.breed].filter(Boolean).join(' · ');
  }
  if (d.sex !== undefined && d.sex !== null && d.sex !== '') {
    return [d.sex, d.breed].filter(Boolean).join(' · ');
  }
  return d.breed || '';
}

// 接力数文案 · 对齐原型 r41 状态化措辞；0 用温和兜底（第7条 不给失主加焦虑）
function helpersText(d) {
  const n = d.helpers || 0;
  if (n === 0) return '还没有人接力';
  if (d.status === 'lost') return `🤝 ${n} 人在接力寻找`;
  if (d.status === 'found') return `🤝 ${n} 人在帮忙找主人`;
  return `🤝 ${n} 人接力`;
}

// 卡片地点行 · 对齐原型：「📍 地点 · 距你 N km」（无距离时只显地点）
function locLine(d) {
  const base = `📍 ${d.loc}`;
  return d.distanceKm > 0 ? `${base} · 距你 ${distanceStr(d.distanceKm)} km` : base;
}

module.exports = { distanceStr, haversineKm, ageStageLabel, petMeta, helpersText, locLine };
