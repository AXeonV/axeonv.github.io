export const privateBlogText = {
 zh: {
  space: '隐藏空间', post: '隐藏文章', password: '密码', unlock: '解锁', lock: '锁定',
  hint: '输入密码', working: '正在解锁…', badPassword: '密码不正确，请重试。',
  loadError: '内容加载失败，请稍后重试。', unsupported: '当前浏览器不支持解密，请使用 HTTPS 页面或更新浏览器。',
  noScript: '请启用 JavaScript 后解锁。',
 },
 en: {
  space: 'Hidden space', post: 'Private post', password: 'Password', unlock: 'Unlock', lock: 'Lock',
  hint: 'Enter password', working: 'Unlocking…', badPassword: 'Incorrect password. Please try again.',
  loadError: 'Could not load the content. Please try again.', unsupported: 'Decryption is unavailable. Use HTTPS or update your browser.',
  noScript: 'Enable JavaScript to unlock this space.',
 },
} as const;
