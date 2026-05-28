// 极简静态文件服务器 · 用于运营后台本地调试
// 用法：node serve.js  (在 admin/ 目录下)
// 然后浏览器访问 http://localhost:8088/admin.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8088;
const ROOT = __dirname;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/admin.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + p); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('admin server: http://localhost:' + PORT + '/admin.html'));
