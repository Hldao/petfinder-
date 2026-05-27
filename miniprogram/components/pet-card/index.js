const fmt = require('../../utils/format.js');

Component({
  properties: {
    post: { type: Object, value: {} },
  },
  data: {
    locLine: '', emoTime: '', longterm: false, helpersText: '', statusCls: 'lost',
  },
  observers: {
    post(d) {
      if (!d || !d.id) return;
      this.setData({
        statusCls: d.status === 'found' ? 'found' : 'lost',
        locLine: fmt.locLine(d),
        emoTime: fmt.emotionalTime(d),
        longterm: fmt.isLongterm(d),
        helpersText: fmt.helpersText(d),
      });
    },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.post.id });
    },
  },
});
