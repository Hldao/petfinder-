const app = getApp();
const cloud = require('../../utils/cloud.js');

const CATS = [
  { k: 'suggestion', label: '功能建议' },
  { k: 'bug', label: '问题反馈' },
  { k: 'other', label: '其他' },
];

Page({
  data: { cats: CATS, cat: 'suggestion', text: '', submitting: false },

  pickCat(e) { this.setData({ cat: e.currentTarget.dataset.k }); },
  onInput(e) { this.setData({ text: e.detail.value }); },

  submit() {
    const text = (this.data.text || '').trim();
    if (text.length < 5) return wx.showToast({ title: '多写几个字吧（≥5）', icon: 'none' });
    if (!app.globalData.cloudReady) {
      wx.showToast({ title: '已收到，谢谢反馈', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({ submitting: true });
    cloud.call('submitFeedback', { cat: this.data.cat, text })
      .then(res => {
        if (res && res.ok === false) { wx.showToast({ title: res.msg || '提交失败', icon: 'none' }); return; }
        wx.showToast({ title: '已收到，谢谢反馈', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      })
      .catch(() => wx.showToast({ title: '提交失败，请重试', icon: 'none' }))
      .then(() => this.setData({ submitting: false }));
  },
});
