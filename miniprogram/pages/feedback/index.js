const app = getApp();
const cloud = require('../../utils/cloud.js');

const CATS = [
  { k: 'suggestion', label: '💡 功能建议' },
  { k: 'bug', label: '🐛 问题反馈' },
  { k: 'experience', label: '😤 体验吐槽' },
  { k: 'other', label: '💬 其他' },
];

Page({
  data: {
    cats: CATS, cat: 'suggestion',
    text: '', contact: '',
    photos: [],
    submitting: false,
  },

  pickCat(e) { this.setData({ cat: e.currentTarget.dataset.k }); },
  goBack() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/feed/index' }) }); },
  onInput(e) { this.setData({ text: e.detail.value }); },
  onContact(e) { this.setData({ contact: e.detail.value }); },

  choosePhoto() {
    const left = 4 - this.data.photos.length;
    if (left <= 0) { wx.showToast({ title: '最多 4 张', icon: 'none' }); return; }
    wx.chooseMedia({
      count: left, mediaType: ['image'], sizeType: ['compressed'],
      success: res => {
        const paths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ photos: this.data.photos.concat(paths) });
      },
    });
  },
  removePhoto(e) {
    const i = e.currentTarget.dataset.i;
    const photos = this.data.photos.slice();
    photos.splice(i, 1);
    this.setData({ photos });
  },

  submit() {
    const text = (this.data.text || '').trim();
    if (text.length < 5) return wx.showToast({ title: '多写几个字吧（≥5）', icon: 'none' });
    if (!app.globalData.cloudReady) {
      wx.showToast({ title: '已收到，谢谢反馈', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({ submitting: true });
    cloud.call('submitFeedback', {
      cat: this.data.cat,
      text,
      contact: this.data.contact || '',
      photoCount: this.data.photos.length,
    })
      .then(res => {
        if (res && res.ok === false) { wx.showToast({ title: res.msg || '提交失败', icon: 'none' }); return; }
        wx.showToast({ title: '已收到，谢谢反馈', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      })
      .catch(() => wx.showToast({ title: '提交失败，请重试', icon: 'none' }))
      .then(() => this.setData({ submitting: false }));
  },
});
