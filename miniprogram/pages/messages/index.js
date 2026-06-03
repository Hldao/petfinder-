const cloud = require('../../utils/cloud.js');
const chatUtil = require('../../utils/chat.js');
const app = getApp();

// 离线 / 云端不可用时的示例消息（真实 > 看起来繁荣：云端就绪时只显示真实会话）
const ALL_MESSAGES = [
  {
    id: 'sys1', type: 'system',
    avatar: '📣', avatarStyle: 'sys',
    peerName: '寻宠 · 大理', mpTag: true,
    context: '关键消息推送',
    prefix: '📍 ',
    lastMsg: '古城北门附近有人捡到一只蓝猫，是你家胖丁吗？',
    lastTime: '18:02', unread: 1,
    petId: 1, role: 'owner',
  },
  {
    id: 'dm1', type: 'dm',
    avatar: '🐱', avatarStyle: 'orange',
    peerName: '客栈老板娘',
    context: '关于 · 橘猫 招领',
    prefix: 'ta：',
    lastMsg: '好的我现在过来，您能视频先确认一下吗？',
    lastTime: '17:24', unread: 2,
    chatId: 'c1', role: 'owner',
  },
  {
    id: 'r1', type: 'reply',
    avatar: '🐱', avatarStyle: 'blue',
    peerName: '陈*',
    context: '胖丁 寻宠',
    prefix: 'ta：',
    lastMsg: '下午在洋人街又看到那只猫了，往复兴路跑了',
    lastTime: '16:38', unread: 1,
    petId: 1, role: 'owner',
  },
  {
    id: 'r2', type: 'reply',
    avatar: '🐶', avatarStyle: 'mint',
    peerName: '林*',
    context: '小白 招领',
    prefix: 'ta：',
    lastMsg: '这只狗好像是我邻居家的，我帮你问问',
    lastTime: '15:10', unread: 0,
    petId: 2, role: 'owner',
  },
  {
    id: 'dm2', type: 'dm',
    avatar: '🐱', avatarStyle: 'blue',
    peerName: '陈*',
    context: '关于 · 胖丁 寻宠',
    prefix: '我：',
    lastMsg: '橘色短毛，颈右侧白色心形斑，叫果儿会回头',
    lastTime: '14:50', unread: 0,
    chatId: 'c2', role: 'owner',
  },
  {
    id: 'dm3', type: 'dm',
    avatar: '🐶', avatarStyle: 'cream',
    peerName: '王*',
    context: '关于 · 小黑 已归还',
    prefix: 'ta：',
    lastMsg: '辛苦你了，已经把小黑接回家。回头一定请你喝茶',
    lastTime: '05-24', unread: 0,
    chatId: 'c3', role: 'finder',
  },
];

function filterByTab(list, tab) {
  if (tab === 'replies') return list.filter(m => m.type === 'reply');
  if (tab === 'dm') return list.filter(m => m.type === 'dm' || m.type === 'system');
  return list;
}

function hasUnread(list) {
  return list.some(m => m.unread > 0);
}

// chatList 云端会话 → 列表渲染字段
// 不收集真实昵称（反例库「发布者信息卡=信任剧场」）→ 对方名用角色占位
function mapChats(chats) {
  return chats.map(c => ({
    id: c.chatId,
    type: 'dm',
    avatar: c.emoji,
    avatarStyle: c.type === 'found' ? 'orange' : 'blue',
    peerName: c.role === 'owner' ? '热心人' : '发布者',
    petName: c.petName,
    context: '关于 · ' + c.petName + ' ' + c.statusLabel,
    prefix: c.lastMine ? '我：' : 'ta：',
    lastMsg: c.lastMsg,
    lastTime: chatUtil.fmtTime(c.lastTs),
    unread: 0, // MVP 暂不做未读计数（需已读位点）
    chatId: c.chatId, pid: c.postId, peerId: c.peerId, role: c.role,
  }));
}

Page({
  data: {
    currentTab: 'all',
    displayMessages: [],
    hasUnread: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.refresh();
  },

  refresh() {
    if (app.globalData.cloudReady) {
      cloud.call('chatList', {})
        .then(res => {
          this._source = mapChats((res && res.chats) || []);
          this.applyTab();
        })
        .catch(err => {
          console.error('[messages] chatList 失败', err);
          this._source = [];
          this.applyTab();
        });
    } else {
      this._source = ALL_MESSAGES.slice();
      this.applyTab();
    }
  },

  applyTab() {
    const src = this._source || [];
    this.setData({
      displayMessages: filterByTab(src, this.data.currentTab),
      hasUnread: hasUnread(src),
    });
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab }, () => this.applyTab());
  },

  openMsg(e) {
    const msg = e.currentTarget.dataset.msg;

    // 帖子回复 / 系统通知 → 跳详情
    if (msg.type === 'reply' || msg.type === 'system') {
      wx.navigateTo({ url: `/pages/detail/index?id=${msg.petId}&role=${msg.role || 'owner'}` });
      return;
    }

    // 私信 → 进真实会话（带 cid / pid / peerId）
    const q = s => encodeURIComponent(s || '');
    wx.navigateTo({
      url: `/pages/chat/index?cid=${q(msg.chatId)}&pid=${q(msg.pid || '')}&peerId=${q(msg.peerId || '')}` +
        `&peer=${q(msg.peerName)}&pet=${q(msg.petName || msg.context)}&emoji=${q(msg.avatar)}&role=${msg.role || 'finder'}`,
    });
  },
});
