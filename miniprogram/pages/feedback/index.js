// 意见反馈 · 对齐 prototype v10 r131 (list + FAB row + sheet)
// 业务逻辑保留：submit / pickCat / choosePhoto / removePhoto / onInput / onContact
// r131 扩展：openSheet / closeSheet / goBack / showSheet 状态 / feedbackList 分组

const app = getApp();
const cloud = require('../../utils/cloud.js');

const CATS = [
  { k: 'suggestion', label: '💡 功能建议' },
  { k: 'bug', label: '🐛 问题反馈' },
  { k: 'experience', label: '😤 体验吐槽' },
  { k: 'other', label: '💬 其他' },
];

const CAT_LABEL = {
  suggestion: '功能建议',
  bug: '问题反馈',
  experience: '体验吐槽',
  other: '其他',
};

Page({
  data: {
    cats: CATS, cat: 'suggestion',
    text: '', contact: '',
    photos: [],
    submitting: false,
    showSheet: false,
    feedbackList: [],
    pending: [],
    replied: [],
    catLabel: CAT_LABEL,
  },

  onLoad() {
    this.loadFeedback();
  },

  onShow() {
    this.loadFeedback();
  },

  // r122 历史反馈分组（待回复 / 已回复）· MVP 暂用空列表 · TODO 接 myFeedback cloud fn
  loadFeedback() {
    const list = this.data.feedbackList || [];
    const sorted = list.slice().reverse();
    const pending = sorted.filter(f => !f.reply);
    const replied = sorted.filter(f => f.reply);
    this.setData({ pending, replied });
  },

  // 业务：分类 / textarea / contact / photo（保留）
  pickCat(e) { this.setData({ cat: e.currentTarget.dataset.k }); },
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

  // r131 sheet 显隐
  openSheet() {
    this.setData({
      showSheet: true,
      cat: 'suggestion',
      text: '',
      contact: '',
      photos: [],
    });
  },
  closeSheet() { this.setData({ showSheet: false }); },
  stopProp() {},
  goBack() { wx.navigateBack(); },

  // 业务：提交（保留）
  submit() {
    const text = (this.data.text || '').trim();
    if (text.length < 5) return wx.showToast({ title: '多写几个字吧（≥5）', icon: 'none' });
    if (!app.globalData.cloudReady) {
      wx.showToast({ title: '已收到，谢谢反馈', icon: 'success' });
      setTimeout(() => {
        this.setData({ showSheet: false });
        wx.navigateBack();
      }, 800);
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
        setTimeout(() => this.setData({ showSheet: false }), 800);
      })
      .catch(() => wx.showToast({ title: '提交失败，请重试', icon: 'none' }))
      .then(() => this.setData({ submitting: false }));
  },
});
