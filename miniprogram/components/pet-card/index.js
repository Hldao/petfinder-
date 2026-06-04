const fmt = require('../../utils/format.js');

// 照片底色 · 无 photoClass 的帖按 id 确定性取一种（让无照片卡片像原型一样 6 色多彩，不再单调一色）
const PHOTO_CLASSES = ['ph-orange', 'ph-blue', 'ph-cream', 'ph-mint', 'ph-pink', 'ph-plum'];
function pickPhotoClass(d) {
  if (d.photoClass) return d.photoClass;
  const s = String(d.id || d.emoji || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PHOTO_CLASSES[h % PHOTO_CLASSES.length];
}

Component({
  properties: {
    post: { type: Object, value: {} },
  },
  data: {
    locLine: '', helpersText: '', statusCls: 'lost', metaText: '', photoCls: '',
    displayName: '', imgError: false, hintText: '',
  },
  observers: {
    post(d) {
      if (!d || !d.id) return;
      const statusCls = d.status === 'found' ? 'found' : 'lost';
      const name = (d.name || '').trim();
      const ageLabel = d.status === 'found' ? fmt.ageStageLabel(d.ageStage) : '';
      // 标题：有名字用名字；没有(招领恒空/寻宠没填)→ 品种兜底当标题，meta 里就不再重复品种
      let displayName, metaParts;
      if (name) {
        displayName = name;
        metaParts = [d.sex, ageLabel, d.breed];
      } else {
        displayName = d.breed || (statusCls === 'found' ? '待认领的小家伙' : '走失的小家伙');
        metaParts = [d.sex, ageLabel];
      }
      // 真实目击横幅：只在有线索时显示（对齐原型 card-hint-strip · 真实信号高纯度，不假装活跃）
      // 取最新一条（submitClue 往数组末尾追加）→ 播报最近目击
      let hintText = '';
      if (d.clues && d.clues.length) {
        const c = d.clues[d.clues.length - 1];
        const t = (c.text || '').trim();
        if (t) hintText = `🐾 ${t}${c.timeAgo ? ' · ' + c.timeAgo : ''}`;
      }
      this.setData({
        statusCls,
        displayName,
        metaText: metaParts.filter(Boolean).join(' · '),
        locLine: fmt.locLine(d),
        helpersText: fmt.helpersText(d),
        hintText,
        // 照片底色：优先用宠物自己的 photoClass，无则按 id 确定性取一色（6 色多彩，对齐原型）
        photoCls: pickPhotoClass(d),
        imgError: false, // 新数据重置图片错误态
      });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.post.id });
    },
    // 图片加载失败(fileID 失效/网络) → 回退 emoji，避免空白照片框
    onImgError() {
      this.setData({ imgError: true });
    },
    noop() {}, // 转发按钮 catchtap 占位：拦住 tap 不冒泡到卡片，open-type=share 仍触发原生转发
    // 点地点·距离 → 跳到小程序自己的地图页并定位到该宠物（不打开系统地图）；catchtap 不冒泡到卡片
    onLoc() {
      const p = this.data.post;
      if (!(p && p.lat && p.lng)) return;
      const app = getApp();
      app.globalData = app.globalData || {};
      app.globalData.mapFocus = { id: p.id, lat: p.lat, lng: p.lng };
      wx.switchTab({ url: '/pages/map/index' });
    },
  },
});
