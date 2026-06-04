const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');
const fmt = require('../../utils/format.js');
const chatUtil = require('../../utils/chat.js');
const media = require('../../utils/media.js');

// 前端关键词预筛（与 chat 同源）· 后端 contentSafety 是第二层
const BAD = /微信|wechat|wx\s*[:：]|\bqq\b|加我|私聊|联系方式|二维码|1[3-9]\d{9}/i;

Page({
  data: {
    post: null,
    statusCls: 'lost',
    isLost: true,
    locLabel: '走失地点',
    timeLabel: '走失时间',
    notFound: false,
    isOwner: false,
    showClue: false,
    clueText: '',
  },

  onLoad(options) {
    const id = options.id; // 字符串：兼容种子(数字)与云端(_id 字符串)
    const eq = p => String(p.id) === String(id);
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' })
        .then(res => {
          const post = ((res && res.posts) || []).find(eq);
          // 云 fileID 换临时 https 链接再渲染 hero / 预览（详情需全部图）
          if (post) media.resolvePhotos([post], resolved => this.render(resolved[0]));
          else this.render(post);
        })
        .catch(() => this.render(seed.find(eq)));
    } else {
      this.render(seed.find(eq));
    }
  },

  render(post) {
    if (!post) { this.setData({ notFound: true }); return; }
    post.ageStageLabel = fmt.ageStageLabel(post.ageStage); // 副标题年龄段中文（之前没算→空）
    const isLost = post.status !== 'found';
    this.setData({
      post,
      isLost,
      statusCls: isLost ? 'lost' : 'found',
      locLabel: isLost ? '走失地点' : '发现地点',
      timeLabel: isLost ? '走失时间' : '发现时间',
    });
    wx.setNavigationBarTitle({ title: post.statusLabel + ' · ' + post.name });

    // 是否本人帖子 → 切换 owner 视角操作栏（不让自己看到「私聊自己」）
    if (app.globalData.cloudReady && post.poster_id) {
      chatUtil.ensureOpenid().then(id => {
        this.setData({ isOwner: !!id && id === post.poster_id });
      });
    }
  },

  // 点 hero 照片 → 全屏预览（可放大看特征 · 找宠物刚需）
  previewPhoto(e) {
    const photos = (this.data.post && this.data.post.photos) || [];
    if (!photos.length) return;
    wx.previewImage({ current: e.currentTarget.dataset.src, urls: photos });
  },

  // 距离条点击 → 唤起地图导航（对齐原型 openMapNavigation）
  onOpenMap() {
    const p = this.data.post;
    if (p && p.lat && p.lng) {
      wx.openLocation({ latitude: p.lat, longitude: p.lng, name: p.loc || '位置', scale: 16 });
    } else {
      wx.showToast({ title: '该帖未设精确位置', icon: 'none' });
    }
  },

  // owner 视角 → 去「我的发布」管理
  onManage() {
    wx.navigateTo({ url: '/pages/my-posts/index' });
  },

  async onContact() {
    // 详情页主 CTA → 直接进 chat（无门槛 · r16 信息架构）
    const p = this.data.post;
    const role = this.data.isLost ? 'finder' : 'owner'; // 寻宠帖→我是拾主/路人；招领帖→我是失主
    const q = s => encodeURIComponent(s);
    const peerId = p.poster_id || ''; // 帖子发布者 = 私聊对方
    let cid = '';
    if (app.globalData.cloudReady) {
      const myId = await chatUtil.ensureOpenid();
      if (myId && peerId && myId === peerId) {
        wx.showToast({ title: '这是你发布的帖子', icon: 'none' });
        return; // 不和自己私聊
      }
      if (myId && peerId) cid = chatUtil.makeChatId(p.id, myId, peerId);
    }
    wx.navigateTo({
      url: `/pages/chat/index?peer=${q('发布者')}&pet=${q(p.name || '')}&emoji=${q(p.emoji)}&role=${role}&pid=${p.id}&cid=${q(cid)}&peerId=${q(peerId)}`,
    });
  },

  onShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    wx.showToast({ title: '点右上角分享', icon: 'none' });
  },

  // ===== 留一条公开线索（r17）=====
  openClue() { this.setData({ showClue: true }); },
  closeClue() { this.setData({ showClue: false }); },
  noop() {},
  onClueInput(e) { this.setData({ clueText: e.detail.value }); },

  submitClue() {
    const text = (this.data.clueText || '').trim();
    if (text.length < 2) { wx.showToast({ title: '请说一下你看到的', icon: 'none' }); return; }
    if (BAD.test(text)) {
      wx.showModal({ title: '线索未发布', content: '内容含敏感信息（如微信号/电话），请改用站内方式。', showCancel: false });
      return;
    }
    const p = this.data.post;
    const addLocal = clue => {
      const clues = [clue].concat((p && p.clues) || []); // 新线索置顶
      this.setData({ 'post.clues': clues, showClue: false, clueText: '' });
      wx.showToast({ title: '线索已发布', icon: 'success' });
    };
    const localClue = { name: '热心人', loc: '', timeAgo: '刚刚', text };

    if (app.globalData.cloudReady && p && p.id) {
      wx.showLoading({ title: '发布中…' });
      cloud.call('submitClue', { postId: p.id, text })
        .then(res => {
          wx.hideLoading();
          if (!res || res.ok === false) {
            wx.showModal({ title: '线索未发布', content: (res && res.msg) || '请稍后重试', showCancel: false });
            return;
          }
          addLocal(res.clue || localClue);
        })
        .catch(err => { wx.hideLoading(); console.error('[detail] submitClue 失败', err); wx.showToast({ title: '发布失败', icon: 'none' }); });
    } else {
      addLocal(localClue); // 离线演示
    }
  },

  onShareAppMessage() {
    const p = this.data.post || {};
    return {
      title: `${p.statusLabel || ''} · ${p.name || '宠物'} · ${p.loc || ''}`,
      path: `/pages/detail/index?id=${p.id}`,
    };
  },
});
