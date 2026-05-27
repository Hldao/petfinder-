// 会话列表 · Phase 3。云端就绪查 chats 集合；否则用本地示例
const seedChats = [
  { id: 'c1', avatar: '🐱', peerName: '陈*', petName: '胖丁', lastMsg: '好像在洋人街口看到一只橘猫', lastTime: '2 小时前', system: false },
  { id: 'mp', avatar: '🐾', peerName: '寻宠·大理服务号', petName: '', lastMsg: '📍 古城北门附近有人捡到一只蓝猫', lastTime: '5 小时前', system: true },
  { id: 'sys', avatar: '系', peerName: '系统通知', petName: '', lastMsg: '陈* 的线索已被标记为有用', lastTime: '昨天', system: true },
];

Page({
  data: { chats: seedChats },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },
  openChat(e) {
    const c = e.currentTarget.dataset.c;
    if (c.system) { wx.showToast({ title: '通知详情待接入', icon: 'none' }); return; }
    wx.navigateTo({
      url: `/pages/chat/index?cid=${c.id}&peer=${encodeURIComponent(c.peerName)}&pet=${encodeURIComponent(c.petName)}&emoji=${encodeURIComponent(c.avatar)}&role=owner`,
    });
  },
});
