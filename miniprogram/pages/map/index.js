const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

// 对齐原型 .map-pin 配色：寻宠=杏橘 / 招领=薄荷
const PIN_FILL = { lost: '#FF8552', found: '#5BB89F' };
const LABEL_COLOR = { lost: '#E66A38', found: '#3F9079' };

function petName(p) { return p.name || p.breed || '宠物'; }
function statusCls(p) { return p.status === 'found' ? 'found' : 'lost'; }
function distText(p) { return p.distanceKm ? ` · 距你 ${p.distanceKm} km` : ''; }

Page({
  data: {
    latitude: 25.61, longitude: 100.20, scale: 12, // 大理中心
    showLoc: false,
    markers: [],
    // 底部面板
    sheetCards: [],
    sheetFilter: '',
    sheetExpanded: false,
    sheetCount: 0,
    // 浮层
    showHint: true,
    searchOpen: false,
    searchKw: '',
    searchResults: [],
    selected: null,
  },
  _pids: [],
  _geoPosts: [],
  _allPosts: [],
  _canvas: null,
  _dpr: 2,
  _iconCache: {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.load();
  },

  load() {
    const handle = posts => {
      this._allPosts = posts || [];
      this.buildMarkers(this._allPosts);
      this.buildSheet();
    };
    if (app.globalData.cloudReady) {
      cloud.call('feedQuery', { filter: 'all' }).then(r => handle((r && r.posts) || [])).catch(() => handle(seed));
    } else {
      handle(seed);
    }
  },

  // ============ 浮层交互 ============
  dismissHint() { this.setData({ showHint: false }); },
  onMapTap() { this.setData({ selected: null, searchOpen: false }); },

  locateMe() {
    wx.getLocation({
      type: 'gcj02',
      success: res => this.setData({ latitude: res.latitude, longitude: res.longitude, scale: 14, showLoc: true }),
      fail: () => wx.showToast({ title: '无法获取定位，请检查授权', icon: 'none' }),
    });
  },

  toggleSearch() {
    const open = !this.data.searchOpen;
    this.setData({ searchOpen: open, selected: null });
    if (!open) this.setData({ searchKw: '', searchResults: [] });
  },
  onSearchInput(e) {
    const kw = (e.detail.value || '').trim().toLowerCase();
    const results = !kw ? [] : this._allPosts
      .filter(p => `${petName(p)} ${p.breed || ''} ${p.loc || ''} ${p.desc || ''}`.toLowerCase().includes(kw))
      .slice(0, 20)
      .map(p => ({ id: p.id, emoji: p.emoji || '🐾', name: petName(p), loc: p.loc || '', statusCls: statusCls(p) }));
    this.setData({ searchKw: e.detail.value, searchResults: results });
  },
  onResultTap(e) {
    const id = e.currentTarget.dataset.id;
    const p = this._allPosts.find(x => String(x.id) === String(id));
    this.setData({ searchOpen: false, searchKw: '', searchResults: [] });
    if (p && p.lat && p.lng) {
      this.setData({ latitude: p.lat, longitude: p.lng, scale: 15, selected: this.makeSelected(p) });
    } else if (id != null) {
      wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
    }
  },

  toggleFilter() { this.setData({ sheetExpanded: true, selected: null }); },

  // ============ 底部面板 ============
  buildSheet() {
    const f = this.data.sheetFilter;
    const cards = this._allPosts
      .filter(p => !f || (p.status === f))
      .map(p => ({
        id: p.id, emoji: p.emoji || '🐾', name: petName(p),
        statusLabel: p.statusLabel || (statusCls(p) === 'found' ? '招领' : '寻宠'),
        statusCls: statusCls(p), loc: p.loc || '', distText: distText(p),
      }));
    this.setData({ sheetCards: cards, sheetCount: cards.length });
  },
  toggleSheet() { this.setData({ sheetExpanded: !this.data.sheetExpanded }); },
  applySheetFilter(e) {
    this.setData({ sheetFilter: e.currentTarget.dataset.sf }, () => this.buildSheet());
  },
  onSheetCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id != null) wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },

  // ============ 迷你详情卡（点针弹出）============
  makeSelected(p) {
    const st = statusCls(p);
    return {
      id: p.id, emoji: p.emoji || '🐾', statusCls: st,
      name: petName(p),
      breed: [p.breed, p.sex].filter(Boolean).join(' · '),
      statusLabel: p.statusLabel || (st === 'found' ? '招领' : '寻宠'),
      loc: p.loc || '', distText: distText(p), desc: p.desc || '',
    };
  },
  closeSelected() { this.setData({ selected: null }); },
  onSelectedContact() {
    const s = this.data.selected;
    if (!s) return;
    const role = s.statusCls === 'lost' ? 'finder' : 'owner';
    const q = encodeURIComponent;
    wx.navigateTo({ url: `/pages/chat/index?peer=${q('发布者')}&pet=${q(s.name)}&emoji=${q(s.emoji)}&role=${role}&pid=${s.id}` });
  },
  onSelectedDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id != null) wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },

  // ============ 地图标记 ============
  async buildMarkers(posts) {
    const withGeo = posts.filter(p => p.lat && p.lng);
    this._geoPosts = withGeo;
    this._pids = withGeo.map(p => p.id);
    const markers = [];
    for (let i = 0; i < withGeo.length; i++) {
      const p = withGeo[i];
      const st = statusCls(p);
      let iconPath = '';
      try { iconPath = await this.getPinIcon(st, p.emoji || '🐾'); } catch (e) {}
      const m = {
        id: i, latitude: p.lat, longitude: p.lng,
        width: 36, height: 47,
        anchor: { x: 0.5, y: 1 },
        callout: {
          content: petName(p),
          color: LABEL_COLOR[st], fontSize: 11, fontWeight: 'bold',
          borderRadius: 6, padding: 5, bgColor: '#FFFFFF',
          display: 'ALWAYS', textAlign: 'center',
        },
      };
      if (iconPath) m.iconPath = iconPath;
      markers.push(m);
    }
    this.setData({ markers });
  },

  _getCanvas() {
    if (this._canvas) return Promise.resolve(this._canvas);
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this)
        .select('#pinCanvas').fields({ node: true, size: true })
        .exec(res => {
          if (!res || !res[0] || !res[0].node) return reject(new Error('no canvas'));
          this._canvas = res[0].node;
          try { this._dpr = wx.getSystemInfoSync().pixelRatio || 2; } catch (e) { this._dpr = 2; }
          resolve(this._canvas);
        });
    });
  },

  async getPinIcon(status, emoji) {
    const key = status + '|' + emoji;
    if (this._iconCache[key]) return this._iconCache[key];

    const canvas = await this._getCanvas();
    const dpr = this._dpr;
    const W = 40, H = 52, r = 14, cx = W / 2, cy = r + 4;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.beginPath();
    ctx.moveTo(cx, H - 2);
    ctx.quadraticCurveTo(cx - r, cy + r * 0.55, cx - r, cy);
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.quadraticCurveTo(cx + r, cy + r * 0.55, cx, H - 2);
    ctx.closePath();
    ctx.fillStyle = PIN_FILL[status];
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();

    ctx.font = '17px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy + 1);

    const path = await new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        x: 0, y: 0, width: canvas.width, height: canvas.height,
        destWidth: canvas.width, destHeight: canvas.height,
        success: r2 => resolve(r2.tempFilePath),
        fail: reject,
      });
    });
    this._iconCache[key] = path;
    return path;
  },

  onMarkerTap(e) {
    const i = e.detail.markerId;
    const p = this._geoPosts[i];
    if (p) this.setData({ selected: this.makeSelected(p), searchOpen: false });
  },
});
