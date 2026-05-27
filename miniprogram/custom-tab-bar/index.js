Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/feed/index', text: '首页', icon: '🏠' },
      { pagePath: '/pages/map/index', text: '地图', icon: '🗺️' },
      { pagePath: '/pages/messages/index', text: '消息', icon: '💬' },
      { pagePath: '/pages/profile/index', text: '我的', icon: '👤' },
    ],
  },
  methods: {
    switchTab(e) {
      wx.switchTab({ url: e.currentTarget.dataset.path });
    },
    onPublish() {
      // 中央 FAB → 发布（publish 不是 tab，用 navigateTo）
      wx.navigateTo({ url: '/pages/publish/index' });
    },
  },
});
