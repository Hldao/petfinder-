const app = getApp();
const cloud = require('../../utils/cloud.js');

Page({
  data: { text: '', photo: '', pet: '', submitting: false },

  onLoad(options) { this.setData({ pet: decodeURIComponent(options.pet || '') }); },

  onInput(e) { this.setData({ text: e.detail.value }); },
  choosePhoto() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sizeType: ['compressed'],
      success: res => this.setData({ photo: res.tempFiles[0].tempFilePath }),
    });
  },
  removePhoto() { this.setData({ photo: '' }); },
  skip() { wx.switchTab({ url: '/pages/feed/index' }); },

  async submit() {
    const text = (this.data.text || '').trim();
    if (text.length < 5) return wx.showToast({ title: '写几句心里话吧', icon: 'none' });
    if (!app.globalData.cloudReady) {
      wx.showToast({ title: '感谢信已记下 🐾', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/feed/index' }), 900);
      return;
    }
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…' });
    try {
      let photoID = '';
      if (this.data.photo) {
        const up = await wx.cloud.uploadFile({ cloudPath: `thanks/${Date.now()}.jpg`, filePath: this.data.photo });
        photoID = up.fileID;
      }
      const res = await cloud.call('submitThanks', { text, photo: photoID, pet: this.data.pet });
      wx.hideLoading();
      if (res && res.ok === false) return wx.showModal({ title: '提交未通过', content: res.msg || '请重试', showCancel: false });
      wx.showToast({ title: '感谢信已送出 🐾', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/feed/index' }), 900);
    } catch (err) {
      wx.hideLoading();
      wx.showModal({ title: '提交失败', content: String(err), showCancel: false });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
