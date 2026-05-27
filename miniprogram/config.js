// 全局配置 · 上线前唯一需要手填的地方
// 1. project.config.json 的 "appid": "touristappid" 改成你的小程序 AppID
// 2. 下面 CLOUD_ENV 改成你的 CloudBase 环境 ID
// 在 CLOUD_ENV 仍是占位符时，app 自动用本地 seed 数据跑（见 utils/seed.js），
// 方便在还没建好云环境时就能在开发者工具里看到完整 UI。
module.exports = {
  CLOUD_ENV: 'REPLACE_WITH_YOUR_ENV_ID',
};
