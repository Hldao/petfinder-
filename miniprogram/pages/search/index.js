const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

Page({
  data: {
    query: '',
    results: [],
    state: 'default', // default | results
    hots: ['古城北门', '人民路', '下关', '英短', '布偶', '金毛', '柯基', '田园猫'],
  },
  _all: [],

  onLoad() {
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => { this._all = (res && res.posts) || []; })
        .catch(() => { this._all = seed; });
    } else {
      this._all = seed;
    }
  },

  onInput(e) { this.runSearch(e.detail.value); },
  tapHot(e) { this.runSearch(e.currentTarget.dataset.q); },
  clear() { this.setData({ query: '', results: [], state: 'default' }); },

  runSearch(q) {
    q = (q || '').trim();
    if (!q) { this.clear(); return; }
    const ql = q.toLowerCase();
    const results = this._all.filter(d =>
      [d.name, d.breed, d.loc, d.desc, d.color, d.sex].join(' ').toLowerCase().includes(ql)
    );
    this.setData({ query: q, results, state: 'results' });
  },

  onCardTap(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` });
  },
});
