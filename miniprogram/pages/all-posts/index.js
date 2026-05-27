const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

Page({
  data: { posts: [], loading: true },

  onLoad() {
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => this.setData({ posts: (res && res.posts) || [], loading: false }))
        .catch(() => this.setData({ posts: seed, loading: false }));
    } else {
      this.setData({ posts: seed, loading: false });
    }
  },

  onCardTap(e) { wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` }); },
});
