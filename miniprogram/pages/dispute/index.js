const app = getApp();
const cloud = require('../../utils/cloud.js');

Page({
  data: { text: '', photos: [], submitting: false, postId: '' },

  onLoad(options) { this.setData({ postId: options.pid || '' }); },

  onInput(e) { this.setData({ text: e.detail.value }); },
  choosePhoto() {
    const left = 3 - this.data.photos.length;
    if (left <= 0) return wx.showToast({ title: '最多 3 张', icon: 'none' });
    wx.chooseMedia({
      count: left, mediaType: ['image'], sizeType: ['compressed'],
      success: res => this.setData({ photos: this.data.photos.concat(res.tempFiles.map(f => f.tempFilePath)) }),
    });
  },
  removePhoto(e) {
    const photos = this.data.photos.slice();
    photos.splice(e.currentTarget.dataset.i, 1);
    this.setData({ photos });
  },

  async submit() {
    const text = (this.data.text || '').trim();
    if (text.length < 10) return wx.showToast({ title: '请详细描述（≥10 字）', icon: 'none' });
    if (!app.globalData.cloudReady) {
      return wx.showModal({ title: '需先接入云环境', content: '配置 CLOUD_ENV 并上传云函数后可提交申诉。', showCancel: false });
    }
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…' });
    try {
      const fileIDs = [];
      for (const p of this.data.photos) {
        const up = await wx.cloud.uploadFile({ cloudPath: `disputes/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`, filePath: p });
        fileIDs.push(up.fileID);
      }
      const res = await cloud.call('submitDispute', { text, photos: fileIDs, postId: this.data.postId });
      wx.hideLoading();
      if (res && res.ok === false) return wx.showModal({ title: '提交未通过', content: res.msg || '请重试', showCancel: false });
      wx.showToast({ title: '已提交，将人工仲裁', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 900);
    } catch (err) {
      wx.hideLoading();
      wx.showModal({ title: '提交失败', content: String(err), showCancel: false });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
