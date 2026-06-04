const fmt = require('../../utils/format.js');

Component({
  properties: {
    post: { type: Object, value: {} },
  },
  data: {
    locLine: '', helpersText: '', statusCls: 'lost', metaText: '', photoCls: '',
    displayName: '', imgError: false,
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
      this.setData({
        statusCls,
        displayName,
        metaText: metaParts.filter(Boolean).join(' · '),
        locLine: fmt.locLine(d),
        helpersText: fmt.helpersText(d),
        // 照片底色：优先用宠物自己的 photoClass（6 色），无则退回按状态 2 色
        photoCls: d.photoClass || statusCls,
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
    // 点地点·距离 → 唤起地图导航（对齐原型 loc-link openMapNavigation）；catchtap 不冒泡到卡片
    onLoc() {
      const p = this.data.post;
      if (p && p.lat && p.lng) {
        wx.openLocation({ latitude: p.lat, longitude: p.lng, name: p.loc || '位置', scale: 16 });
      }
    },
  },
});
