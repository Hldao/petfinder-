// 黑名单 · MVP 用本地 storage（拉黑动作在 chat ⋯ 菜单写入）
// 存储元素：{ name, time }（兼容旧版纯 name 字符串）
function normalize(raw) {
  return (raw || []).map(it => (typeof it === 'string' ? { name: it, time: '' } : it));
}

Page({
  data: { blocked: [] },

  onShow() {
    this.setData({ blocked: normalize(wx.getStorageSync('blocked')) });
  },

  unblock(e) {
    const name = e.currentTarget.dataset.name;
    const next = (wx.getStorageSync('blocked') || []).filter(
      it => (typeof it === 'string' ? it : it.name) !== name
    );
    wx.setStorageSync('blocked', next);
    this.setData({ blocked: normalize(next) });
    wx.showToast({ title: '已解除对「' + name + '」的拉黑', icon: 'none' });
  },

  goBack() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/index' }) }); },
});
