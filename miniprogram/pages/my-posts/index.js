const app = getApp();
const cloud = require('../../utils/cloud.js');

Page({
  data: { active: [], done: [], loading: true, needCloud: false },

  onLoad() { this.load(); },

  load() {
    if (!app.globalData.cloudReady) {
      this.setData({ loading: false, needCloud: true });
      return;
    }
    cloud.call('myPosts', {})
      .then(res => this.split((res && res.posts) || []))
      .catch(() => this.setData({ loading: false }));
  },

  split(posts) {
    this.setData({
      loading: false,
      done: posts.filter(p => p.lifecycle === 'returned'),
      active: posts.filter(p => p.lifecycle !== 'returned'),
    });
  },

  onCardTap(e) { wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` }); },
});
