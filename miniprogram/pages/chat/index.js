const app = getApp();
const cloud = require('../../utils/cloud.js');

// Quick Reply 角色化（03 §4.3）：拾主联系失主 / 失主回复拾主
const QUICK = {
  finder: ['📍 我看到了', '📸 我拍到了', '🏠 我先收着 ta', '🕐 约个时间见面', '🙏 谢谢你们'],
  owner: ['🙏 太感谢了', '🕐 我们约个时间', '❓ 方便视频确认一下吗', '📍 在哪方便见面'],
};

// 前端关键词预筛（03 §4.4）· 后端 msgSecCheck 是第二层
const BAD = /微信|wechat|wx\s*[:：]|\bqq\b|加我|私聊|联系方式|二维码|1[3-9]\d{9}/i;

// 离线示例消息
const SEED_MSGS = {
  c1: [
    { mine: false, content: '你好，我好像在洋人街口看到一只橘猫钻进绿化带', time: '14:20' },
    { mine: true, content: '太谢谢了！是不是脖子有蓝色项圈？', time: '14:22' },
    { mine: false, content: '有点远没看清，我现在还在附近，要不你过来看看？', time: '14:23' },
  ],
};

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

Page({
  data: {
    peerName: '发布者', petName: '', emoji: '🐾',
    messages: [], input: '', quick: [], scrollId: '',
    cid: '',
  },

  onLoad(options) {
    const peerName = decodeURIComponent(options.peer || '发布者');
    const petName = decodeURIComponent(options.pet || '');
    const emoji = decodeURIComponent(options.emoji || '🐾');
    const role = options.role === 'owner' ? 'owner' : 'finder';
    const cid = options.cid || '';
    const messages = SEED_MSGS[cid] ? SEED_MSGS[cid].slice() : [];
    this.setData({
      peerName, petName, emoji, cid,
      quick: QUICK[role], messages,
    });
    wx.setNavigationBarTitle({ title: peerName });
    this.scrollBottom();
  },

  onInput(e) { this.setData({ input: e.detail.value }); },
  pickQuick(e) { this.setData({ input: e.currentTarget.dataset.t }); },

  scrollBottom() {
    const n = this.data.messages.length;
    if (n) this.setData({ scrollId: 'msg-' + (n - 1) });
  },

  send() {
    const text = (this.data.input || '').trim();
    if (!text) return;
    if (BAD.test(text)) {
      wx.showModal({
        title: '消息未发送',
        content: '消息含敏感内容（如微信号/电话/引导平台外联系），请使用站内消息沟通。',
        showCancel: false,
      });
      return;
    }
    const messages = this.data.messages.concat({ mine: true, content: text, time: now() });
    this.setData({ messages, input: '' });
    this.scrollBottom();

    // 云端就绪：每条过 msgSecCheck + 入库（03 §4.7）
    if (app.globalData.cloudReady && this.data.cid) {
      cloud.call('sendMessage', { chatId: this.data.cid, content: text })
        .then(res => {
          if (res && res.status === 'blocked') {
            wx.showToast({ title: '该消息被审核拦截', icon: 'none' });
          }
        })
        .catch(err => console.error('[chat] sendMessage 失败', err));
    }
  },
});
