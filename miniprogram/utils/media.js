// 云图片 fileID → 可渲染的 https 临时链接
// 为什么需要：在自定义组件(如 pet-card)里 <image src="cloud://..."> 不会被识别为云文件，
// 反而被当成组件目录下的相对路径解析 → 500「Failed to load local image resource」。
// 故统一在页面侧把 fileID 批量换成 getTempFileURL 的临时 https 链接再传给组件渲染。

// 收集 posts 里的云 fileID（firstOnly=true 只取每帖首图，给列表用以控制在 50 个上限内）
function collectIds(posts, firstOnly) {
  const ids = [];
  (posts || []).forEach(p => {
    const ph = (p && p.photos) || [];
    (firstOnly ? ph.slice(0, 1) : ph).forEach(f => {
      if (typeof f === 'string' && f.indexOf('cloud://') === 0) ids.push(f);
    });
  });
  return [...new Set(ids)].slice(0, 50); // getTempFileURL 单次上限 50
}

// 把 posts 的 photos 里的 cloud:// 换成临时链接；非云链接(本地/已是 https)原样保留。
// opts.firstOnly 只解析首图。无云环境 / 无 fileID 时原样回调。
function resolvePhotos(posts, opts, cb) {
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  const app = getApp();
  const ids = collectIds(posts, opts.firstOnly);
  if (!ids.length || !(app.globalData && app.globalData.cloudReady) || !wx.cloud) {
    cb(posts);
    return;
  }
  wx.cloud.getTempFileURL({
    fileList: ids,
    success: res => {
      const map = {};
      (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL; });
      cb((posts || []).map(p => (p && p.photos && p.photos.length)
        ? Object.assign({}, p, { photos: p.photos.map(f => map[f] || f) })
        : p));
    },
    fail: () => cb(posts),
  });
}

module.exports = { resolvePhotos };
