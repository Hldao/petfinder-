const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

const BREEDS = [
  { name: '英短', hot: true }, { name: '橘猫', hot: true }, { name: '布偶', hot: true },
  { name: '中华田园犬' }, { name: '柯基' }, { name: '比熊' }, { name: '金毛' }, { name: '拉布拉多' },
];

const COLORS = [
  { name: '橘色', color: '#FF8C42' },
  { name: '白色', color: '#F0EDE4', border: '#DDD6C0' },
  { name: '黑色', color: '#3D3D3D' },
  { name: '灰色', color: '#9E9E9E' },
  { name: '棕色', color: '#8B5E3C' },
  { name: '奶色', color: '#F5DEB3' },
  { name: '虎斑', color: 'linear-gradient(135deg,#C8894A,#7A5230)' },
];

const PLACES = ['古城', '人民路', '下关', '洱海月', '苍山门', '喜洲'];

Page({
  data: {
    query: '',
    results: [],
    state: 'default', // default | results
    breeds: BREEDS,
    colors: COLORS,
    places: PLACES,
    history: [],
  },
  _all: [],

  onLoad() {
    const history = wx.getStorageSync('search_history') || [];
    this.setData({ history });
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => { this._all = (res && res.posts) || []; })
        .catch(() => { this._all = seed; });
    } else {
      this._all = seed;
    }
  },

  onInput(e) { this.runSearch(e.detail.value); },
  onConfirm(e) { this.runSearch(e.detail.value, true); },
  tapHot(e) { this.runSearch(e.currentTarget.dataset.q, true); },
  clear() { this.setData({ query: '', results: [], state: 'default' }); },

  handleCancel() {
    if (this.data.query) {
      this.runSearch(this.data.query, true);
    } else {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/feed/index' }) });
    }
  },

  clearHistory() {
    wx.setStorageSync('search_history', []);
    this.setData({ history: [] });
  },

  saveHistory(q) {
    if (!q) return;
    let history = wx.getStorageSync('search_history') || [];
    history = [q].concat(history.filter(h => h !== q)).slice(0, 8);
    wx.setStorageSync('search_history', history);
    this.setData({ history });
  },

  runSearch(q, save) {
    q = (q || '').trim();
    if (!q) { this.clear(); return; }
    const ql = q.toLowerCase();
    const results = this._all.filter(d =>
      [d.name, d.breed, d.loc, d.desc, d.color, d.sex].join(' ').toLowerCase().includes(ql)
    );
    this.setData({ query: q, results, state: 'results' });
    if (save) this.saveHistory(q);
  },

  onCardTap(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/index', fail: () => wx.navigateTo({ url: '/pages/publish/index' }) });
  },
});
