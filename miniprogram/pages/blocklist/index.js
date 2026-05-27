// 黑名单 · MVP 用本地 storage（拉黑动作在 chat ⋯ 菜单写入）
Page({
  data: { blocked: [] },

  onShow() {
    this.setData({ blocked: wx.getStorageSync('blocked') || [] });
  },

  unblock(e) {
    const name = e.currentTarget.dataset.name;
    const blocked = (wx.getStorageSync('blocked') || []).filter(n => n !== name);
    wx.setStorageSync('blocked', blocked);
    this.setData({ blocked });
    wx.showToast({ title: '已移出黑名单', icon: 'none' });
  },
});
