const config = require('./config.js');

App({
  globalData: {
    cloudReady: false, // CLOUD_ENV 填好后才为 true；否则全程用本地 seed 数据
    openid: '',
  },

  onLaunch() {
    const env = config.CLOUD_ENV;
    const envConfigured = env && env !== 'REPLACE_WITH_YOUR_ENV_ID';

    if (!wx.cloud || !envConfigured) {
      // 未配置云环境 → 走本地 seed 数据（Phase 0 离线可跑）
      console.warn('[app] CloudBase 未配置，使用本地 seed 数据。填好 config.js 的 CLOUD_ENV 后接入云端。');
      return;
    }

    wx.cloud.init({ env, traceUser: true });
    this.globalData.cloudReady = true;

    // 登录：code → openid（云函数 login，对应 03 接口 POST /users/login）
    wx.cloud.callFunction({ name: 'login' })
      .then(res => { this.globalData.openid = (res.result && res.result.openid) || ''; })
      .catch(err => console.error('[app] login 失败', err));
  },
});
