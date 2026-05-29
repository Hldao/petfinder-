Page({
  data: { pet: '', helpers: 12 },
  onLoad(options) {
    this.setData({ pet: decodeURIComponent(options.pet || '') });
  },
  goHome() {
    wx.switchTab({ url: '/pages/feed/index' });
  },
  writeThanks() {
    wx.redirectTo({ url: `/pages/thanks-edit/index?pet=${encodeURIComponent(this.data.pet)}` });
  },
  shareStory() {
    wx.showShareMenu();
    wx.showToast({ title: '点右上角分享', icon: 'none' });
  },
  onShareAppMessage() {
    return { title: 'ta 顺利回家了 · 大理寻宠社区', path: '/pages/feed/index' };
  },
  undo() {
    wx.showModal({
      title: '撤回归还？',
      content: '若是误操作或冒领，可在 24 小时内撤回，状态退回继续寻找。',
      confirmText: '撤回',
      success: res => { if (res.confirm) wx.navigateBack(); },
    });
  },
});
