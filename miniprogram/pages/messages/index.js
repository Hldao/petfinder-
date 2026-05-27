const ALL_MESSAGES = [
  {
    id: 'sys1', type: 'system',
    avatar: '📣', avatarStyle: 'sys',
    peerName: '寻宠 · 大理', mpTag: true,
    context: '关键消息推送',
    lastMsg: '📍 古城北门附近有人捡到一只蓝猫，是你家胖丁吗？',
    lastTime: '18:02', unread: 1,
    petId: 1, role: 'owner',
  },
  {
    id: 'dm1', type: 'dm',
    avatar: '🐱', avatarStyle: 'orange',
    peerName: '客栈老板娘',
    context: '关于 · 橘猫 招领',
    lastMsg: '好的我现在过来，您能视频先确认一下吗？',
    lastTime: '17:24', unread: 2,
    chatId: 'c1', role: 'owner',
  },
  {
    id: 'r1', type: 'reply',
    avatar: '🐱', avatarStyle: 'blue',
    peerName: '陈*',
    context: '胖丁 寻宠',
    lastMsg: '下午在洋人街又看到那只猫了，往复兴路跑了',
    lastTime: '16:38', unread: 1,
    petId: 1, role: 'owner',
  },
  {
    id: 'r2', type: 'reply',
    avatar: '🐶', avatarStyle: 'mint',
    peerName: '林*',
    context: '小白 招领',
    lastMsg: '这只狗好像是我邻居家的，我帮你问问',
    lastTime: '15:10', unread: 0,
    petId: 2, role: 'owner',
  },
  {
    id: 'dm2', type: 'dm',
    avatar: '🐱', avatarStyle: 'blue',
    peerName: '陈*',
    context: '关于 · 胖丁 寻宠',
    lastMsg: '可以帮你留意，ta 有什么明显特征吗？',
    lastTime: '14:50', unread: 0,
    chatId: 'c2', role: 'owner',
  },
  {
    id: 'dm3', type: 'dm',
    avatar: '🐶', avatarStyle: 'cream',
    peerName: '王*',
    context: '关于 · 小黑 已归还',
    lastMsg: '辛苦你了，已经把小黑接回家。回头一定请你喝茶',
    lastTime: '05-24', unread: 0,
    chatId: 'c3', role: 'finder',
  },
];

function filterByTab(tab) {
  if (tab === 'all') return ALL_MESSAGES;
  if (tab === 'replies') return ALL_MESSAGES.filter(m => m.type === 'reply');
  if (tab === 'dm') return ALL_MESSAGES.filter(m => m.type === 'dm' || m.type === 'system');
  return ALL_MESSAGES;
}

function hasUnread(list) {
  return list.some(m => m.unread > 0);
}

Page({
  data: {
    currentTab: 'all',
    displayMessages: filterByTab('all'),
    hasUnread: hasUnread(ALL_MESSAGES),
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    const list = filterByTab(tab);
    this.setData({ currentTab: tab, displayMessages: list });
  },

  openMsg(e) {
    const msg = e.currentTarget.dataset.msg;

    // 消除未读
    const updated = ALL_MESSAGES.map(m => m.id === msg.id ? { ...m, unread: 0 } : m);
    Object.assign(ALL_MESSAGES, updated.reduce((acc, m, i) => { acc[i] = m; return acc; }, {}));
    const list = filterByTab(this.data.currentTab);
    this.setData({ displayMessages: list, hasUnread: hasUnread(ALL_MESSAGES) });

    if (msg.type === 'reply' || msg.type === 'system') {
      wx.navigateTo({ url: `/pages/detail/index?id=${msg.petId}&role=${msg.role || 'owner'}` });
      return;
    }
    if (msg.type === 'dm') {
      wx.navigateTo({
        url: `/pages/chat/index?cid=${msg.chatId}&peer=${encodeURIComponent(msg.peerName)}&pet=${encodeURIComponent(msg.context)}&emoji=${encodeURIComponent(msg.avatar)}&role=${msg.role || 'finder'}`,
      });
    }
  },
});
