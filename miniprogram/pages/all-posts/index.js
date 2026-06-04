const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');
const media = require('../../utils/media.js');

Page({
  data: { posts: [], loading: true },

  onLoad() {
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        // 云 fileID 换临时 https 链接再渲染（组件内 <image cloud://> 无法渲染）
        .then(res => media.resolvePhotos((res && res.posts) || [], { firstOnly: true }, posts => this.setData({ posts, loading: false })))
        .catch(() => this.setData({ posts: seed, loading: false }));
    } else {
      this.setData({ posts: seed, loading: false });
    }
  },

  onCardTap(e) { wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` }); },
});
