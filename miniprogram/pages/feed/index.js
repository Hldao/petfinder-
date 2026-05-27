const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

Page({
  data: {
    posts: [],        // 当前筛选后展示的
    filter: 'all',    // all | lost | found
    loading: true,
    fromSeed: false,  // 是否在用本地 seed（提示开发者）
  },

  _all: [], // 全量缓存，筛选在本地做

  onLoad() {
    this.loadFeed();
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
    wx.showToast({ title: '搜索页 Phase 1 接入', icon: 'none' });
  },
});
