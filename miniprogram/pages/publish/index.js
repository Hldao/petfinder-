const app = getApp();
const cloud = require('../../utils/cloud.js');

const BREEDS = {
  cat: ['橘猫', '田园猫', '英短', '美短', '布偶'],
  dog: ['中华田园犬', '金毛', '柯基', '泰迪', '比熊'],
  other: ['兔子', '仓鼠', '龙猫'],
};
const EMOJI = { cat: '🐱', dog: '🐶', other: '🐾' };
const LOCS = ['古城北门', '人民路三月街', '下关泰安路', '喜洲古镇', '海东'];
const TIMES = [
  { label: '刚刚', mins: 5 }, { label: '1 小时前', mins: 60 },
  { label: '今天上午', mins: 300 }, { label: '今天下午', mins: 120 },
  { label: '昨天', mins: 1500 },
];

Page({
  data: {
    mode: 'lost',          // lost | found
    photos: [],            // 本地临时路径
    petType: 'cat',
    breedChips: BREEDS.cat,
    form: { name: '', breed: '', sex: '不确定', loc: '', timeText: '', timeMins: 0, desc: '', currentLocation: '', health: '' },
    locs: LOCS, times: TIMES,
    submitting: false,
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    // 招领默认性别不确定（拾主翻看陌生宠物有应激风险 · §6.6）；寻宠默认 ♂
    const form = Object.assign({}, this.data.form, { sex: mode === 'found' ? '不确定' : '♂' });
    this.setData({ mode, form });
  },

  choosePhoto() {
    const left = 9 - this.data.photos.length;
    if (left <= 0) { wx.showToast({ title: '最多 9 张', icon: 'none' }); return; }
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

  pickType(e) {
    const t = e.currentTarget.dataset.t;
    this.setData({ petType: t, breedChips: BREEDS[t], 'form.breed': '' });
  },
  pickBreed(e) { this.setData({ 'form.breed': e.currentTarget.dataset.b }); },
  pickSex(e) { this.setData({ 'form.sex': e.currentTarget.dataset.s }); },
  pickLoc(e) { this.setData({ 'form.loc': e.currentTarget.dataset.v }); },
  pickTime(e) {
    this.setData({ 'form.timeText': e.currentTarget.dataset.label, 'form.timeMins': Number(e.currentTarget.dataset.mins) });
  },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }); },

  async submit() {
    const { mode, photos, petType, form } = this.data;
    if (photos.length === 0) return wx.showToast({ title: '请至少上传 1 张照片', icon: 'none' });
    if (!form.loc) return wx.showToast({ title: '请选择地点', icon: 'none' });
    if (!form.timeText) return wx.showToast({ title: '请选择时间', icon: 'none' });
    if ((form.desc || '').length < 10) return wx.showToast({ title: '描述至少 10 字', icon: 'none' });

    if (!app.globalData.cloudReady) {
      return wx.showModal({ title: '需先接入云环境', content: '在 miniprogram/config.js 填好 CLOUD_ENV 并上传云函数后即可发布。', showCancel: false });
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…' });
    try {
      // 1. 上传照片到云存储
      const fileIDs = [];
      for (const p of photos) {
        const up = await wx.cloud.uploadFile({
          cloudPath: `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
          filePath: p,
        });
        fileIDs.push(up.fileID);
      }
      // 2. 调 postCreate（云端过内容审核 + 入库 pending_review/approved）
      const res = await cloud.call('postCreate', {
        type: mode, petType, emoji: EMOJI[petType],
        name: mode === 'lost' ? form.name : '',
        breed: form.breed, sex: form.sex,
        loc: form.loc, time: form.timeText, timeMins: form.timeMins,
        desc: form.desc, photos: fileIDs,
        currentLocation: mode === 'found' ? form.currentLocation : '',
        health: mode === 'found' ? form.health : '',
      });
      wx.hideLoading();
      if (!res || res.ok === false) {
        wx.showModal({ title: '发布未通过', content: (res && res.msg) || '请稍后重试', showCancel: false });
        return;
      }
      const tip = res.status === 'approved' ? '发布成功，已展示' : '提交成功，审核通过后展示';
      wx.showToast({ title: tip, icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      wx.hideLoading();
      console.error('[publish] 失败', err);
      wx.showModal({ title: '提交失败', content: String(err), showCancel: false });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
