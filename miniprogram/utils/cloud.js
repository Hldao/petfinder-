// 云函数调用统一封装 · 客户端永不直接写库（00 架构原则 1），写操作都走这里
function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) return reject(new Error('cloud-not-available'));
    wx.cloud.callFunction({ name, data })
      .then(res => resolve(res.result))
      .catch(reject);
  });
}

module.exports = { call };
