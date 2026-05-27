Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },
  onMyPosts() {
    wx.showToast({ title: '我的发布 Phase 2 接入', icon: 'none' });
  },
  onMenu(e) {
    wx.showToast({ title: e.currentTarget.dataset.label + ' 待接入', icon: 'none' });
  },
});
