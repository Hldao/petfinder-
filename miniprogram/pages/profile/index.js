Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },
  onMyPosts() {
    wx.navigateTo({ url: '/pages/my-posts/index' });
  },
  onMenu(e) {
    const label = e.currentTarget.dataset.label;
    if (label === '清除我的数据') return this.onClearData();
    wx.showToast({ title: label + ' 待接入', icon: 'none' });
  },
  // 03 §6.3 + 06 反例库：小程序无账号概念，是「清除数据」非「注销」· 列明范围 + 30 天冷却
  onClearData() {
    wx.showModal({
      title: '清除我的数据',
      content: '将清除你的位置、聊天记录、发布的帖子。提交后有 30 天冷却期（期间可撤销），期满彻底删除。',
      confirmText: '确认清除',
      confirmColor: '#E04E4E',
      success: res => {
        if (res.confirm) wx.showToast({ title: '已提交（30 天冷却）', icon: 'none' });
      },
    });
  },
});
