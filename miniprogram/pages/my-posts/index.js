const app = getApp();
const cloud = require('../../utils/cloud.js');
const media = require('../../utils/media.js');

Page({
  data: { active: [], done: [], loading: true, needCloud: false, tab: 'active' },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  goPublish() {
    wx.switchTab({ url: '/pages/publish/index', fail: () => wx.navigateTo({ url: '/pages/publish/index' }) });
  },

  onLoad() { this.load(); },

  load() {
    if (!app.globalData.cloudReady) {
      this.setData({ loading: false, needCloud: true });
      return;
    }
    cloud.call('myPosts', {})
      // 云 fileID 换临时 https 链接再传 pet-card（组件内 <image cloud://> 无法渲染）
      .then(res => media.resolvePhotos((res && res.posts) || [], { firstOnly: true }, posts => this.split(posts)))
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
