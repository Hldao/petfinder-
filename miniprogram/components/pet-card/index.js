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
  },
});
