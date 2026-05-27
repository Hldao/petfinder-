const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

Page({
  data: {
    posts: [],        // 当前筛选后展示的
    filter: 'all',    // all | lost | found
    loading: true,
    fromSeed: false,  // 是否在用本地 seed（提示开发者）
    showPrivacy: false, // 启动隐私协议（首启 · 不可绕过）
    showMp: false,      // 公众号关注 modal（关一次后不再主动弹）
  },

  _all: [], // 全量缓存，筛选在本地做

  onLoad() {
    this.loadFeed();
    this.checkOnboarding();
  },

  // 03 §6 流程：首启隐私 modal → 同意 → 0.25s 公众号 modal
  checkOnboarding() {
    if (!wx.getStorageSync('privacy_ok')) this.setData({ showPrivacy: true });
    else if (!wx.getStorageSync('mp_ok')) this.setData({ showMp: true });
  },
  agreePrivacy() {
    wx.setStorageSync('privacy_ok', 1);
    this.setData({ showPrivacy: false });
    if (!wx.getStorageSync('mp_ok')) setTimeout(() => this.setData({ showMp: true }), 250);
  },
  dismissMp() {
    wx.setStorageSync('mp_ok', 1);
    this.setData({ showMp: false });
  },
  followMp() {
    wx.showToast({ title: '公众号关联待配置', icon: 'none' });
    this.dismissMp();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    this.loadFeed(() => wx.stopPullDownRefresh());
  },

  loadFeed(done) {
    this.setData({ loading: true });
    const finish = (list, fromSeed) => {
      this._all = list || [];
      this.setData({ loading: false, fromSeed });
      this.applyCurrentFilter();
      done && done();
    };

    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => finish((res && res.posts) || [], false))
        .catch(err => {
          console.error('[feed] feedQuery 失败，回退 seed', err);
          finish(seed, true);
        });
    } else {
      finish(seed, true);
    }
  },

  applyFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
    this.applyCurrentFilter();
  },

  applyCurrentFilter() {
    const f = this.data.filter;
    const posts = f === 'all' ? this._all : this._all.filter(d => d.status === f);
    this.setData({ posts });
  },

  onCardTap(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` });
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/index' });
  },
});
