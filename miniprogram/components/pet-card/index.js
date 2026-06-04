const fmt = require('../../utils/format.js');

Component({
  properties: {
    post: { type: Object, value: {} },
  },
  data: {
    locLine: '', helpersText: '', statusCls: 'lost', metaText: '', photoCls: '',
  },
  observers: {
    post(d) {
      if (!d || !d.id) return;
      const statusCls = d.status === 'found' ? 'found' : 'lost';
      this.setData({
        statusCls,
        metaText: fmt.petMeta(d),
        locLine: fmt.locLine(d),
        helpersText: fmt.helpersText(d),
        // 照片底色：优先用宠物自己的 photoClass（6 色），无则退回按状态 2 色
        photoCls: d.photoClass || statusCls,
      });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.post.id });
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
