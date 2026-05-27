Page({
  data: { pet: '' },
  onLoad(options) {
    this.setData({ pet: decodeURIComponent(options.pet || '') });
  },
  goHome() {
    wx.switchTab({ url: '/pages/feed/index' });
  },
  writeThanks() {
    wx.redirectTo({ url: `/pages/thanks-edit/index?pet=${encodeURIComponent(this.data.pet)}` });
  },
  undo() {
    // 24h 冷却期内可撤回（02 §3 · canceled）
    wx.showModal({
      title: '撤回归还？',
      content: '若是误操作或冒领，可在 24 小时内撤回，状态退回继续寻找。',
      confirmText: '撤回',
      success: res => { if (res.confirm) wx.navigateBack(); },
    });
  },
});
