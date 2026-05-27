// 云函数 contentSafety · 统一内容审核（贯穿所有 UGC 入口 · 03 §三）
// 文本走 msgSecCheck，图片走 imgSecCheck。
// 返回 { pass: true | false | null }
//   true  = 通过；false = 命中敏感（risky）；null = 审核接口不可用（交人工 pending_review）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

async function checkText(text) {
  if (!text) return 'pass';
  try {
    await cloud.openapi.security.msgSecCheck({ content: text });
    return 'pass';
  } catch (e) {
    if (e && e.errCode === 87014) return 'risky';
    throw e; // 其他错误 → 上层归为「不可用」
  }
}

async function checkImage(fileID) {
  const dl = await cloud.downloadFile({ fileID });
  try {
    await cloud.openapi.security.imgSecCheck({ media: { contentType: 'image/jpeg', value: dl.fileContent } });
    return 'pass';
  } catch (e) {
    if (e && e.errCode === 87014) return 'risky';
    throw e;
  }
}

exports.main = async (event = {}) => {
  const { text = '', images = [] } = event;
  try {
    if ((await checkText(text)) === 'risky') return { pass: false, reason: 'text' };
    for (const f of images) {
      if ((await checkImage(f)) === 'risky') return { pass: false, reason: 'image' };
    }
    return { pass: true };
  } catch (e) {
    // 接口不可用（如开发期未开通 / 配额）→ 交人工审核
    return { pass: null, error: String((e && e.errMsg) || e) };
  }
};
