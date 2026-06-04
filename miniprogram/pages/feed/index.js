const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');
const fmt = require('../../utils/format.js');
const media = require('../../utils/media.js');

Page({
  data: {
    posts: [],        // 当前筛选后展示的
    filter: 'all',    // all | lost | found
    sortMode: 'time', // time | distance
    showSort: false,
    statBarHide: false, // 希望叙事条 5s 后柔和折叠（教育只说一次）
    loading: true,
    fromSeed: false,  // 是否在用本地 seed（提示开发者）
    showPrivacy: false, // 启动隐私协议（首启 · 不可绕过）
    showMp: false,      // 公众号关注 modal（关一次后不再主动弹）
    privacyChecked: true, // r42701ed 默认勾选
  },

  _all: [], // 全量缓存，筛选在本地做

  onLoad() {
    this.loadFeed();
    this.checkOnboarding();
    // 希望叙事条 5s 后柔和折叠（教育只说一次 · 不长期占注意力）
    this._statTimer = setTimeout(() => this.setData({ statBarHide: true }), 5000);
  },
  onUnload() { if (this._statTimer) clearTimeout(this._statTimer); },

  // 排序 sheet
  openSort() { this.setData({ showSort: true }); },
  closeSort() { this.setData({ showSort: false }); },
  noop() {},
  pickSort(e) {
    this.setData({ sortMode: e.currentTarget.dataset.mode, showSort: false });
    this.applyCurrentFilter();
  },

  // 03 §6 流程：首启隐私 modal → 同意 → 0.25s 公众号 modal
  checkOnboarding() {
    if (!wx.getStorageSync('privacy_ok')) this.setData({ showPrivacy: true });
    else if (!wx.getStorageSync('mp_ok')) this.setData({ showMp: true });
  },
  togglePrivacyCheck() {
    this.setData({ privacyChecked: !this.data.privacyChecked });
  },
  agreePrivacy() {
    // r7b3d4a4 · 未勾选时禁止同意
    if (!this.data.privacyChecked) {
      wx.showToast({ title: '请先勾选已阅读', icon: 'none' });
      return;
    }
    wx.setStorageSync('privacy_ok', 1);
    this.setData({ showPrivacy: false });
    if (!wx.getStorageSync('mp_ok')) setTimeout(() => this.setData({ showMp: true }), 250);
  },
  declinePrivacy() {
    // r f4a9461 · 暂不使用 = 真实退出
    wx.exitMiniProgram && wx.exitMiniProgram({ fail: () => {
      wx.showModal({ title: '已退出', content: '请手动关闭小程序', showCancel: false });
    }});
  },
  openUserAgreement() {
    wx.showModal({ title: '用户协议', content: '完整内容详见运营页面（占位）。', showCancel: false });
  },
  openPrivacyPolicy() {
    wx.showModal({ title: '隐私政策', content: '完整内容详见运营页面（占位）。', showCancel: false });
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
    // 从详情页返回时重新拉取，让新发布的线索/帖子反映到卡片（首次进入由 onLoad 负责，避免双载）
    if (this._didFirstLoad) this.loadFeed();
    this._didFirstLoad = true;
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
        .then(res => {
          // 云 fileID 在组件里 <image> 无法直接渲染 → 先换临时 https 链接（列表只需首图）
          media.resolvePhotos((res && res.posts) || [], { firstOnly: true }, posts => {
            finish(posts, false);
            this.fillDistances();
          });
        })
        .catch(err => {
          console.error('[feed] feedQuery 失败，回退 seed', err);
          finish(seed, true);
        });
    } else {
      finish(seed, true);
    }
  },

  // 真实帖入库时 distanceKm=0 → 用当前定位现场算「距你」（诚实数据，非捏造）
  // 仅补无距离的帖；种子帖自带演示距离不动。定位失败/拒绝则静默跳过（卡片省略距离）
  // 一次会话最多尝试一次：开发者工具未开"位置模拟"时 getLocation 会超时，避免每次刷新都报
  fillDistances() {
    if (this._locTried) return;
    this._locTried = true;
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        const { latitude, longitude } = res;
        this._all = this._all.map(p => {
          if (p.lat && p.lng && !(p.distanceKm > 0)) {
            const km = fmt.haversineKm(latitude, longitude, p.lat, p.lng);
            return Object.assign({}, p, { distanceKm: Math.round(km * 10) / 10 });
          }
          return p;
        });
        this.applyCurrentFilter();
      },
      fail: () => {},
    });
  },

  applyFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
    this.applyCurrentFilter();
  },

  applyCurrentFilter() {
    const f = this.data.filter;
    let posts = f === 'all' ? this._all.slice() : this._all.filter(d => d.status === f);
    if (this.data.sortMode === 'distance') {
      posts = posts.slice().sort((a, b) => (a.distanceKm || 99999) - (b.distanceKm || 99999));
    }
    this.setData({ posts });
  },

  onCardTap(e) {
    wx.navigateTo({ url: `/pages/detail/index?id=${e.detail.id}` });
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/index' });
  },
});
