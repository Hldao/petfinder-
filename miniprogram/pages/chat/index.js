const app = getApp();
const cloud = require('../../utils/cloud.js');

// Quick Reply 角色化 · r129 文案优化（去指令感 / 软化结尾 / 更口语）
const QUICK = {
  finder: [
    { label: '📍 我看到 ta 了', text: '刚在附近看到 ta 了～' },
    { label: '🏠 ta 在我这', text: 'ta 在我这边，你方便的时候过来接就好 🐾' },
    { label: '📷 想看张照片', text: '方便发张照片吗？我想先确认下 🙏' },
    { label: '🐾 ta 长啥样？', text: 'ta 有什么明显的特征呀？' },
    { label: '🤝 约个时间见？', text: '我们约个时间见个面呗？' },
  ],
  owner: [
    { label: '📍 这就过去', text: '这就过去，在哪儿方便见面～' },
    { label: '📷 想看张照片', text: '方便发张照片吗？我想先确认下 🙏' },
    { label: '🐾 ta 长啥样？', text: 'ta 有什么明显的特征呀？' },
    { label: '🤝 约个时间见？', text: '我们约个时间见个面呗？' },
  ],
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
    cid: '', pid: '',
    quickExpanded: false,
  },

  toggleQuick() {
    this.setData({ quickExpanded: !this.data.quickExpanded });
  },

  onLoad(options) {
    const peerName = decodeURIComponent(options.peer || '发布者');
    const petName = decodeURIComponent(options.pet || '');
    const emoji = decodeURIComponent(options.emoji || '🐾');
    const role = options.role === 'owner' ? 'owner' : 'finder';
    const cid = options.cid || '';
    const messages = SEED_MSGS[cid] ? SEED_MSGS[cid].slice() : [];
    this.setData({
      peerName, petName, emoji, cid, pid: options.pid || '',
      quick: QUICK[role], messages,
    });
    wx.setNavigationBarTitle({ title: peerName });
    this.scrollBottom();

    // 实时消息（03 §4.6：MVP 用 db.watch · 不自建 WebSocket）
    if (app.globalData.cloudReady && cid) this.setupWatch(cid);
  },

  setupWatch(cid) {
    try {
      const db = wx.cloud.database();
      this._watcher = db.collection('messages').where({ chatId: cid }).watch({
        onChange: snapshot => {
          if (snapshot.type === 'init') return; // 初始快照跳过，避免与已显示重复
          const my = app.globalData.openid;
          const adds = (snapshot.docChanges || []).filter(c =>
            c.dataType === 'add' && c.doc && c.doc.sender_id !== my && c.doc.status !== 'blocked');
          if (!adds.length) return;
          const newMsgs = adds.map(c => ({ mine: false, content: c.doc.content, time: now() }));
          this.setData({ messages: this.data.messages.concat(newMsgs) });
          this.scrollBottom();
        },
        onError: e => console.error('[chat] watch error', e),
      });
    } catch (e) {
      console.error('[chat] setupWatch fail', e);
    }
  },

  onUnload() {
    if (this._watcher) { try { this._watcher.close(); } catch (e) {} }
  },

  onInput(e) { this.setData({ input: e.detail.value }); },
  pickQuick(e) { this.setData({ input: e.currentTarget.dataset.text }); },

  // ⋯ 菜单（r22：完成归还 + 举报）
  onMore() {
    wx.showActionSheet({
      itemList: ['✓ 完成归还', '⚠ 举报对方', '🚫 拉黑此人'],
      success: r => {
        if (r.tapIndex === 0) this.confirmReturn();
        else if (r.tapIndex === 1) wx.showToast({ title: '举报已记录，将人工核查', icon: 'none' });
        else if (r.tapIndex === 2) this.blockPeer();
      },
    });
  },
  blockPeer() {
    const name = this.data.peerName;
    const blocked = wx.getStorageSync('blocked') || [];
    if (!blocked.includes(name)) { blocked.push(name); wx.setStorageSync('blocked', blocked); }
    wx.showToast({ title: '已拉黑', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 600);
  },
  // 归还闭环：一个按钮 + 24h 冷却（02 §3 · 06 第1条归还极简）· 不依赖对方主动确认
  confirmReturn() {
    wx.showModal({
      title: '确认完成归还？',
      content: '确认后进入 24 小时确认期（期间可撤回），期满归还完成。这是防冒领的最后一道保障。',
      confirmText: '确认归还',
      success: res => {
        if (!res.confirm) return;
        const go = () => wx.redirectTo({ url: `/pages/return-success/index?pet=${encodeURIComponent(this.data.petName)}` });
        if (app.globalData.cloudReady && this.data.pid) {
          cloud.call('confirmReturn', { postId: this.data.pid }).then(go).catch(go);
        } else go();
      },
    });
  },

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
