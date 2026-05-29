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
    const id = options.id; // 字符串：兼容种子(数字)与云端(_id 字符串)
    const eq = p => String(p.id) === String(id);
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => this.render(((res && res.posts) || []).find(eq)))
        .catch(() => this.render(seed.find(eq)));
    } else {
      this.render(seed.find(eq));
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
    // 详情页主 CTA → 直接进 chat（无门槛 · r16 信息架构）
    const p = this.data.post;
    const role = this.data.isLost ? 'finder' : 'owner'; // 寻宠帖→我是拾主/路人；招领帖→我是失主
    const q = s => encodeURIComponent(s);
    wx.navigateTo({
      url: `/pages/chat/index?peer=${q('发布者')}&pet=${q(p.name || '')}&emoji=${q(p.emoji)}&role=${role}&pid=${p.id}`,
    });
  },

  onShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    wx.showToast({ title: '点右上角分享', icon: 'none' });
  },

  onShareAppMessage() {
    const p = this.data.post || {};
    return {
      title: `${p.statusLabel || ''} · ${p.name || '宠物'} · ${p.loc || ''}`,
      path: `/pages/detail/index?id=${p.id}`,
    };
  },
});
