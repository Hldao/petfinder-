const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

Page({
  data: {
    latitude: 25.61, longitude: 100.20, scale: 12, // 大理中心
    markers: [],
  },
  _pids: [],

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.load();
  },

  load() {
    const build = posts => this.buildMarkers(posts);
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' }).then(r => build((r && r.posts) || [])).catch(() => build(seed));
    } else {
      build(seed);
    }
  },

  buildMarkers(posts) {
    const withGeo = posts.filter(p => p.lat && p.lng);
    this._pids = withGeo.map(p => p.id);
    const markers = withGeo.map((p, i) => ({
      id: i, latitude: p.lat, longitude: p.lng, width: 32, height: 32,
      callout: {
        content: `${p.statusLabel} · ${p.name}`, color: '#1F1F1F', fontSize: 12,
        borderRadius: 8, padding: 6, bgColor: '#FFFFFF', display: 'ALWAYS',
      },
    }));
    this.setData({ markers });
  },

  onMarkerTap(e) {
    const pid = this._pids[e.detail.markerId];
    if (pid != null) wx.navigateTo({ url: `/pages/detail/index?id=${pid}` });
  },
});
