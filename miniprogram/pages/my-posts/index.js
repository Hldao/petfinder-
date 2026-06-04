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

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除帖子',
      content: '删除后将从所有列表移除，无法恢复。确定删除吗？',
      confirmText: '删除', confirmColor: '#E2492F',
      success: r => {
        if (!r.confirm) return;
        if (!app.globalData.cloudReady) {
          // 离线演示：仅本地移除
          this.removeLocal(id);
          return;
        }
        wx.showLoading({ title: '删除中…' });
        cloud.call('deletePost', { postId: id })
          .then(res => {
            wx.hideLoading();
            if (!res || res.ok === false) {
              wx.showModal({ title: '删除失败', content: (res && res.msg) || '请稍后重试', showCancel: false });
              return;
            }
            this.removeLocal(id);
            wx.showToast({ title: '已删除', icon: 'success' });
          })
          .catch(err => { wx.hideLoading(); console.error('[my-posts] deletePost 失败', err); wx.showToast({ title: '删除失败', icon: 'none' }); });
      },
    });
  },

  // 从当前列表本地移除（避免重新请求）
  removeLocal(id) {
    const keep = arr => arr.filter(p => String(p.id) !== String(id));
    this.setData({ active: keep(this.data.active), done: keep(this.data.done) });
  },
});
