// Phase 0 本地种子数据 · 仅用于「未接入 CloudBase 时也能在开发者工具看到完整 UI」
// ⚠ 上线前删除 / 换成真实授权数据：冷启动期宁可 feed 空也不刷量（06 第 8 条「真实 > 看起来繁荣」）
// 字段对齐原型 FEED_DATA + 03 § 1.3 数据模型；type 仅 lost/found（care 已砍）
// lat/lng 为大理大致坐标（地图标记用 · 非精确）
module.exports = [
  {
    id: 1, emoji: '🐱', status: 'lost', statusLabel: '寻宠',
    name: '胖丁', sex: '♂', ageStage: 'adult', breed: '橘猫', color: '橘白',
    loc: '古城北门', time: '6 小时前', timeMins: 360, distanceKm: 1.2, helpers: 3,
    lat: 25.617, lng: 100.162,
    desc: '脖子有蓝色项圈，左耳有个小缺口，怕生但听到罐头声会出来。',
    clues: [{ name: '陈*', loc: '洋人街', timeAgo: '2 小时前', text: '好像在洋人街口看到一只橘猫钻进绿化带' }],
  },
  {
    id: 2, emoji: '🐶', status: 'found', statusLabel: '招领',
    name: '暂称「小白」', sex: '不确定', ageStage: 'unknown', breed: '比熊（疑似）', color: '白色',
    loc: '人民路', time: '1 小时前', timeMins: 60, distanceKm: 0.6, helpers: 5,
    lat: 25.606, lng: 100.167,
    desc: '在人民路咖啡馆门口捡到，很亲人，没有项圈，先带回店里了。',
    currentLocation: '人民路「白桃」咖啡馆', health: '精神好，已喂水',
  },
  {
    id: 3, emoji: '🐱', status: 'lost', statusLabel: '寻宠',
    name: '咖啡', sex: '♀', ageStage: 'adult', breed: '田园猫', color: '狸花',
    loc: '下关泰安路', time: '昨天', timeMins: 1500, distanceKm: 4.8, helpers: 8,
    lat: 25.591, lng: 100.226,
    desc: '胆子很小，受惊会躲起来。家里一直留着门等 ta。',
    clues: [],
  },
  {
    id: 4, emoji: '🐶', status: 'found', statusLabel: '招领',
    name: '暂称「金宝」', sex: '♂', ageStage: 'adult', breed: '金毛', color: '金黄',
    loc: '喜洲古镇', time: '3 小时前', timeMins: 180, distanceKm: 11, helpers: 2,
    lat: 25.852, lng: 100.122,
    desc: '喜洲田埂边发现，体型偏大很温顺，应该是走丢的家养犬。',
    currentLocation: '喜洲古镇游客中心', health: '健康，能吃能跑',
  },
  {
    id: 5, emoji: '🐱', status: 'lost', statusLabel: '寻宠',
    name: '奶糖', sex: '♀', ageStage: 'puppy', breed: '布偶', color: '海双',
    loc: '海东', time: '5 天前', timeMins: 7200, distanceKm: 9.3, helpers: 12,
    lat: 25.601, lng: 100.281,
    desc: '蓝眼睛，很黏人，走失时戴着粉色项圈。已经第 6 天了，全家都很想 ta。',
    clues: [{ name: '王*', loc: '海东月亮湾', timeAgo: '1 天前', text: '月亮湾路边见过一只长毛蓝眼猫，没敢靠近' }],
  },
];
