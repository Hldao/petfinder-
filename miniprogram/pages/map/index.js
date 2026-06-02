const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

// 对齐原型 .map-pin 配色：寻宠=杏橘 / 招领=薄荷
const PIN_FILL = { lost: '#FF8552', found: '#5BB89F' };
const LABEL_COLOR = { lost: '#E66A38', found: '#3F9079' };

function petName(p) { return p.name || p.breed || '宠物'; }
function statusCls(p) { return p.status === 'found' ? 'found' : 'lost'; }
// 地图语境用「丢失/招领」（对齐原型 sheet/filter），与 feed 的「寻宠」区分
const MAP_LABEL = { lost: '丢失', found: '招领' };
// 距离文案：<1km → 约 N 米；否则 约 N 公里（对齐原型 renderSheetCards）
function distStr(km) {
  if (!km) return '';
  return km < 1 ? `约 ${Math.round(km * 1000)} 米` : `约 ${km} 公里`;
}
function sheetDist(p) { return p.distanceKm ? ` · ${distStr(p.distanceKm)}` : ''; }

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
    sheetH: 240,        // 面板当前高度(px) · 可拖动
    dragging: false,
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

  onLoad() {
    let wh = 667;
    try { wh = wx.getSystemInfoSync().windowHeight || 667; } catch (e) {}
    this._minH = 240;                                   // 收起高度(px)
    this._maxH = Math.max(360, Math.round(wh * 0.62));  // 展开高度(px)
    this.setData({ sheetH: this._minH });
    // 精度提示 5s 自动消失（对齐原型 r90 · 教育只说一次）
    this._hintTimer = setTimeout(() => this.setData({ showHint: false }), 5000);
  },
  onUnload() { if (this._hintTimer) clearTimeout(this._hintTimer); },

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
      fail: () => {
        // 开发者工具未设模拟定位 / 真机未授权 → 优雅回到大理中心，不卡住
        this.setData({ latitude: 25.61, longitude: 100.20, scale: 12 });
        wx.showToast({ title: '定位不可用，已回到大理中心', icon: 'none' });
      },
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
        statusLabel: MAP_LABEL[statusCls(p)],
        statusCls: statusCls(p), loc: p.loc || '', distText: sheetDist(p),
      }));
    this.setData({ sheetCards: cards, sheetCount: cards.length });
  },
  toggleSheet() {
    const expanded = !this.data.sheetExpanded;
    this.setData({ sheetExpanded: expanded, sheetH: expanded ? this._maxH : this._minH });
  },
  // 拖动抽屉
  onDragStart(e) {
    this._sy = e.touches[0].clientY;
    this._sh = this.data.sheetH;
    this.setData({ dragging: true });
  },
  onDragMove(e) {
    const dy = this._sy - e.touches[0].clientY; // 上滑为正
    let h = this._sh + dy;
    if (h < this._minH) h = this._minH;
    if (h > this._maxH) h = this._maxH;
    this.setData({ sheetH: h });
  },
  onDragEnd() {
    const mid = (this._minH + this._maxH) / 2;
    const expanded = this.data.sheetH > mid;
    this.setData({ sheetH: expanded ? this._maxH : this._minH, dragging: false, sheetExpanded: expanded });
  },
  applySheetFilter(e) {
    this.setData({ sheetFilter: e.currentTarget.dataset.sf }, () => this.buildSheet());
  },
  onSheetCardTap(e) {
    const id = e.currentTarget.dataset.id;
    const p = this._allPosts.find(x => String(x.id) === String(id));
    if (!p) return;
    // 点宠物卡 → 下方弹出迷你详情卡（对齐原型）；有坐标则把地图定位过去
    if (p.lat && p.lng) this.setData({ latitude: p.lat, longitude: p.lng, scale: 15 });
    this.setData({ selected: this.makeSelected(p) });
  },

  // ============ 迷你详情卡（点针弹出）============
  makeSelected(p) {
    const st = statusCls(p);
    return {
      id: p.id, emoji: p.emoji || '🐾', statusCls: st,
      name: petName(p),
      breed: [p.breed, p.sex].filter(Boolean).join(' · '),
      statusLabel: MAP_LABEL[st],
      loc: p.loc || '', distText: p.distanceKm ? ` · 距你 ${distStr(p.distanceKm)}` : '', desc: p.desc || '',
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

    // 同坐标（如都在「古城北门」）的针展开成小圆环 · 仅改显示摆位，不动库数据
    const disp = withGeo.map(p => ({ lat: p.lat, lng: p.lng }));
    const groups = {};
    withGeo.forEach((p, idx) => {
      const key = Number(p.lat).toFixed(5) + '|' + Number(p.lng).toFixed(5);
      (groups[key] = groups[key] || []).push(idx);
    });
    Object.keys(groups).forEach(k => {
      const idxs = groups[k];
      if (idxs.length < 2) return;
      const R = 0.00045; // 约 50m 展开半径（仍在 500m 模糊范围内）
      idxs.forEach((idx, j) => {
        const ang = (2 * Math.PI * j) / idxs.length;
        disp[idx] = {
          lat: withGeo[idx].lat + R * Math.cos(ang),
          lng: withGeo[idx].lng + R * Math.sin(ang),
        };
      });
    });

    const markers = [];
    for (let i = 0; i < withGeo.length; i++) {
      const p = withGeo[i];
      const st = statusCls(p);
      let iconPath = '';
      try { iconPath = await this.getPinIcon(st, p.emoji || '🐾'); } catch (e) {}
      const m = {
        id: i, latitude: disp[i].lat, longitude: disp[i].lng,
        width: 36, height: 47,
        anchor: { x: 0.5, y: 1 },
        // 点针弹出跟随针的自定义气泡（对齐原型 pin-popup）· 内容见 wxml slot cover-view
        customCallout: { display: 'BYCLICK', anchorX: 0, anchorY: -6 },
        statusCls: st,
        calloutName: petName(p),
        calloutTag: MAP_LABEL[st],
        calloutDist: p.distanceKm ? '距你 ' + distStr(p.distanceKm) : (p.loc || ''),
      };
      if (iconPath) m.iconPath = iconPath;
      markers.push(m);
    }
    this.setData({ markers });
  },

  _getCanvas() {
    if (this._canvas) return Promise.resolve(this._canvas);
    // 首次进页面 canvas 可能还没渲染好 → 重试至多 8 次（每次 80ms）
    const tryGet = attempt => new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this)
        .select('#pinCanvas').fields({ node: true, size: true })
        .exec(res => {
          if (res && res[0] && res[0].node) {
            this._canvas = res[0].node;
            try { this._dpr = wx.getSystemInfoSync().pixelRatio || 2; } catch (e) { this._dpr = 2; }
            resolve(this._canvas);
          } else if (attempt < 8) {
            setTimeout(() => tryGet(attempt + 1).then(resolve, reject), 80);
          } else {
            reject(new Error('no canvas'));
          }
        });
    });
    return tryGet(0);
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
    // customCallout(BYCLICK) 会自动弹出跟随针的气泡；这里仅收起其它浮层 + 定位过去
    const i = e.detail.markerId;
    const p = this._geoPosts[i];
    this.setData({ selected: null, searchOpen: false });
    if (p && p.lat && p.lng) this.setData({ latitude: p.lat, longitude: p.lng });
  },
  // 点气泡 → 进详情
  onCalloutTap(e) {
    const i = e.detail.markerId;
    const p = this._geoPosts[i];
    if (p) wx.navigateTo({ url: `/pages/detail/index?id=${p.id}` });
  },
});
