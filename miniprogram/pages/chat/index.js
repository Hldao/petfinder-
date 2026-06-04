const app = getApp();
const cloud = require('../../utils/cloud.js');
const chatUtil = require('../../utils/chat.js');

// Quick Reply 角色化 · r129 文案优化（去指令感 / 软化结尾 / 更口语）
const QUICK = {
  finder: [
    { label: '📍 我看到 ta 了', text: '刚在附近看到 ta 了～', cls: 'primary' },
    { label: '🏠 ta 在我这', text: 'ta 在我这边，你方便的时候过来接就好 🐾', cls: 'action' },
    { label: '📷 想看张照片', text: '方便发张照片吗？我想先确认下 🙏', cls: '' },
    { label: '🐾 ta 长啥样？', text: 'ta 有什么明显的特征呀？', cls: '' },
    { label: '🤝 约个时间见？', text: '我们约个时间见个面呗？', cls: 'action' },
  ],
  owner: [
    { label: '📍 这就过去', text: '这就过去，在哪儿方便见面～', cls: 'primary' },
    { label: '📷 想看张照片', text: '方便发张照片吗？我想先确认下 🙏', cls: '' },
    { label: '🐾 ta 长啥样？', text: 'ta 有什么明显的特征呀？', cls: '' },
    { label: '🤝 约个时间见？', text: '我们约个时间见个面呗？', cls: 'action' },
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
    cid: '', pid: '', peerId: '', myId: '',
    quickExpanded: false,
    meetHintShow: true,
  },

  toggleQuick() {
    this.setData({ quickExpanded: !this.data.quickExpanded });
  },

  closeMeetHint() {
    this.setData({ meetHintShow: false });
  },
  onMeetGuide() {
    wx.showModal({
      title: '大理 · 安全见面建议',
      content: '① 约古城北门、人民路等人多的地方，白天见面\n② 见面时留意宠物对认领人的反应（认得主人会亲近）\n③ 可请对方出示疫苗本 / 购买凭证核对\n④ 全程在站内沟通，不轻易转账',
      showCancel: false,
      confirmText: '我记下了',
    });
  },

  onLoad(options) {
    const peerName = decodeURIComponent(options.peer || '发布者');
    const petName = decodeURIComponent(options.pet || '');
    const emoji = decodeURIComponent(options.emoji || '🐾');
    const role = options.role === 'owner' ? 'owner' : 'finder';
    const cid = decodeURIComponent(options.cid || '');
    const peerId = decodeURIComponent(options.peerId || '');
    // 云端未就绪 / 无会话标识 → 用本地示例消息（离线演示）
    const messages = (app.globalData.cloudReady && cid) ? [] : (SEED_MSGS[cid] ? SEED_MSGS[cid].slice() : []);
    this.setData({
      peerName, petName, emoji, cid, peerId, pid: options.pid || '',
      quick: QUICK[role], messages,
    });
    wx.setNavigationBarTitle({ title: peerName });
    this.scrollBottom();

    // 云端真实会话：拉历史 + 轻量轮询看对方新消息
    // （messages 集合"仅创建者可读写" → db.watch 收不到对方消息，故走云函数 + 轮询）
    if (app.globalData.cloudReady && cid) {
      chatUtil.ensureOpenid().then(id => {
        this.setData({ myId: id });
        this.loadHistory();
      });
    }
  },

  // 拉云端历史（以云端为准；保留本地末尾"发送中"的乐观消息避免闪烁）
  loadHistory() {
    const cid = this.data.cid;
    if (!cid) return;
    cloud.call('chatMessages', { chatId: cid })
      .then(res => {
        const cloudMsgs = ((res && res.messages) || []).map(m => ({
          mine: m.mine, content: m.content,
          type: m.type || 'text', lat: m.lat, lng: m.lng,
          time: chatUtil.fmtTime(m.ts),
        }));
        const cloudKeys = new Set(cloudMsgs.map(m => (m.mine ? '1|' : '0|') + m.content));
        // 本地自己刚发、云端还没回灌到的，临时保留在末尾
        const pending = this.data.messages.filter(m => m.mine && !cloudKeys.has('1|' + m.content));
        this.setData({ messages: cloudMsgs.concat(pending) });
        this.scrollBottom();
      })
      .catch(e => console.error('[chat] loadHistory 失败', e));
  },

  startPolling() {
    this.stopPolling();
    this._poll = setInterval(() => this.loadHistory(), 5000);
  },
  stopPolling() {
    if (this._poll) { clearInterval(this._poll); this._poll = null; }
  },

  onShow() {
    if (this.data.cid && app.globalData.cloudReady) {
      this.loadHistory();
      this.startPolling();
    }
  },
  onHide() { this.stopPolling(); },
  onUnload() { this.stopPolling(); },

  onInput(e) { this.setData({ input: e.detail.value }); },
  pickQuick(e) { this.setData({ input: e.currentTarget.dataset.text }); },

  // 乐观追加一条消息并滚到底
  appendMsg(m) {
    this.setData({ messages: this.data.messages.concat(m) });
    this.scrollBottom();
  },

  // 📷 发图片：选图 → 传云存储 → sendMessage(type=image, content=fileID)
  // （图片确认是反冒领核心 · 哲学第2条：靠宠物反应 + 照片确认，不靠身份信号）
  chooseImg() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sizeType: ['compressed'],
      success: res => {
        const tempPath = res.tempFiles[0].tempFilePath;
        // 离线 / 无会话：本地直接显示演示
        if (!(app.globalData.cloudReady && this.data.cid)) {
          this.appendMsg({ mine: true, type: 'image', content: tempPath, time: now() });
          return;
        }
        wx.showLoading({ title: '发送中…' });
        wx.cloud.uploadFile({
          cloudPath: `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
          filePath: tempPath,
        }).then(up => {
          wx.hideLoading();
          const fileID = up.fileID;
          this.appendMsg({ mine: true, type: 'image', content: fileID, time: now() });
          cloud.call('sendMessage', {
            chatId: this.data.cid, content: fileID, type: 'image',
            postId: this.data.pid, peerId: this.data.peerId,
          }).then(() => this.loadHistory()).catch(err => console.error('[chat] 发图失败', err));
        }).catch(err => {
          wx.hideLoading();
          console.error('[chat] 图片上传失败', err);
          wx.showToast({ title: '图片上传失败', icon: 'none' });
        });
      },
    });
  },

  // 📍 发定位：选点 → sendMessage(type=location, content=地名 + lat/lng)
  sendLoc() {
    wx.chooseLocation({
      success: res => {
        const name = res.name || res.address || '位置';
        const lat = res.latitude, lng = res.longitude;
        this.appendMsg({ mine: true, type: 'location', content: name, lat, lng, time: now() });
        if (app.globalData.cloudReady && this.data.cid) {
          cloud.call('sendMessage', {
            chatId: this.data.cid, content: name, type: 'location', lat, lng,
            postId: this.data.pid, peerId: this.data.peerId,
          }).then(() => this.loadHistory()).catch(err => console.error('[chat] 发定位失败', err));
        }
      },
      fail: () => {}, // 用户取消选点
    });
  },

  // 点图片 → 全屏预览（可放大看特征），左右滑动浏览本会话所有图片
  previewImg(e) {
    const src = e.currentTarget.dataset.src;
    const urls = this.data.messages.filter(m => m.type === 'image').map(m => m.content);
    wx.previewImage({ current: src, urls: urls.length ? urls : [src] });
  },

  // 点定位气泡 → 唤起地图查看 / 导航
  openMsgLoc(e) {
    const d = e.currentTarget.dataset;
    if (d.lat && d.lng) {
      wx.openLocation({ latitude: Number(d.lat), longitude: Number(d.lng), name: d.name || '位置', scale: 16 });
    }
  },

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
    const exists = blocked.some(it => (typeof it === 'string' ? it : it.name) === name);
    if (!exists) {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      const time = `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
      blocked.push({ name, time });
      wx.setStorageSync('blocked', blocked);
    }
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
    // 乐观追加：立即显示自己这条
    const messages = this.data.messages.concat({ mine: true, content: text, time: now() });
    this.setData({ messages, input: '' });
    this.scrollBottom();

    // 云端就绪：每条过 msgSecCheck + 入库（03 §4.7）
    if (app.globalData.cloudReady && this.data.cid) {
      cloud.call('sendMessage', {
        chatId: this.data.cid, content: text,
        postId: this.data.pid, peerId: this.data.peerId,
      })
        .then(res => {
          if (res && res.status === 'blocked') {
            wx.showToast({ title: '该消息被审核拦截', icon: 'none' });
          }
          this.loadHistory(); // 入库后回灌：乐观消息换成云端版本 + 同步时间
        })
        .catch(err => console.error('[chat] sendMessage 失败', err));
    }
  },
});
