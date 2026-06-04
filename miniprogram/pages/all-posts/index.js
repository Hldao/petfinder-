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

  onShareAppMessage(e) {
    const d = (e.target && e.target.dataset) || {};
    if (d.id) {
      return {
        title: `${d.status || ''} · ${d.name || '宠物'} · 大理${d.loc || ''} 帮 ta 回家 🐾`,
        path: `/pages/detail/index?id=${d.id}`,
        imageUrl: d.img || '',
      };
    }
    return { title: '寻宠·大理 · 帮走失的小朋友回家 🐾', path: '/pages/feed/index' };
  },
});
