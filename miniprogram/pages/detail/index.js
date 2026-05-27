const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');
const fmt = require('../../utils/format.js');

Page({
  data: {
    post: null,
    statusCls: 'lost',
    isLost: true,
    locLabel: '走失地点',
    timeLabel: '走失时间',
    emoTime: '',
    longterm: false,
    notFound: false,
  },

  onLoad(options) {
    const id = Number(options.id);
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => this.render(((res && res.posts) || []).find(p => p.id === id)))
        .catch(() => this.render(seed.find(p => p.id === id)));
    } else {
      this.render(seed.find(p => p.id === id));
    }
  },

  render(post) {
    if (!post) { this.setData({ notFound: true }); return; }
    const isLost = post.status !== 'found';
    this.setData({
      post,
      isLost,
      statusCls: isLost ? 'lost' : 'found',
      locLabel: isLost ? '走失地点' : '发现地点',
      timeLabel: isLost ? '走失时间' : '发现时间',
      emoTime: fmt.emotionalTime(post),
      longterm: fmt.isLongterm(post),
    });
    wx.setNavigationBarTitle({ title: post.statusLabel + ' · ' + post.name });
  },

  onContact() {
    // 详情页主 CTA → 直接进 chat（无门槛 · r16 信息架构）· Phase 1 接入
    wx.showToast({ title: '私聊 Phase 1 接入', icon: 'none' });
  },
});
