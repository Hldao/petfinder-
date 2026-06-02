const app = getApp();
const cloud = require('../../utils/cloud.js');
const seed = require('../../utils/seed.js');

// 对齐原型 .map-pin 配色：寻宠=杏橘 / 招领=薄荷
const PIN_FILL = { lost: '#FF8552', found: '#5BB89F' };
const LABEL_COLOR = { lost: '#E66A38', found: '#3F9079' };

Page({
  data: {
    latitude: 25.61, longitude: 100.20, scale: 12, // 大理中心
    markers: [],
    // 底部面板（对齐原型 map-bottom-sheet）
    sheetCards: [],
    sheetFilter: '',     // '' | 'lost' | 'found'
    sheetExpanded: false,
    sheetCount: 0,
  },
  _pids: [],
  _allPosts: [],
  _canvas: null,
  _dpr: 2,
  _iconCache: {}, // `${status}|${emoji}` -> tempFilePath

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

  // ============ 底部面板 ============
  buildSheet() {
    const f = this.data.sheetFilter;
    const cards = this._allPosts
      .filter(p => !f || (p.status === f))
      .map(p => {
        const st = p.status === 'found' ? 'found' : 'lost';
        return {
          id: p.id,
          emoji: p.emoji || '🐾',
          name: p.name || p.breed || '宠物',
          statusLabel: p.statusLabel || (st === 'found' ? '招领' : '寻宠'),
          statusCls: st,
          loc: p.loc || '',
          distText: p.distanceKm ? ` · 距你 ${p.distanceKm} km` : '',
        };
      });
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

  // ============ 地图标记 ============
  async buildMarkers(posts) {
    const withGeo = posts.filter(p => p.lat && p.lng);
    this._pids = withGeo.map(p => p.id);
    const markers = [];
    for (let i = 0; i < withGeo.length; i++) {
      const p = withGeo[i];
      const st = p.status === 'found' ? 'found' : 'lost';
      let iconPath = '';
      try { iconPath = await this.getPinIcon(st, p.emoji || '🐾'); } catch (e) {}
      const m = {
        id: i, latitude: p.lat, longitude: p.lng,
        width: 36, height: 47,
        anchor: { x: 0.5, y: 1 },
        callout: {
          content: p.name || p.statusLabel || '',
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
    const pid = this._pids[e.detail.markerId];
    if (pid != null) wx.navigateTo({ url: `/pages/detail/index?id=${pid}` });
  },
});
