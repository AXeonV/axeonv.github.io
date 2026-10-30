import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { markdownToHtml } from 'satteri';
import { satteriKatex } from 'satteri-katex';

const root = fileURLToPath(new URL('../', import.meta.url));
const configPath = resolve(root, '.private-blog/sources.json');
const output = resolve(root, 'public/private-blog');
const routesPath = resolve(root, 'src/data/private-blog-routes.json');
const iterations = 600_000;
const context = (id) => Buffer.from(`alex-private-blog:v1:${id}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const idFor = (title) => sha256(`private-blog\0${title}`);
const deriveKey = (password, salt, rounds = iterations) => pbkdf2Sync(password, salt, rounds, 32, 'sha256');

function encrypt(value, key, id) {
 const iv = randomBytes(12);
 const cipher = createCipheriv('aes-256-gcm', key, iv);
 cipher.setAAD(context(id));
 const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final(), cipher.getAuthTag()]);
 return { iv: iv.toString('base64'), data: data.toString('base64') };
}

function decrypt(payload, key, id) {
 const data = Buffer.from(payload.data, 'base64');
 const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
 cipher.setAAD(context(id));
 cipher.setAuthTag(data.subarray(-16));
 return JSON.parse(Buffer.concat([cipher.update(data.subarray(0, -16)), cipher.final()]).toString('utf8'));
}

async function readPassword() {
 if (process.env.BLOG_PASSWORD) return process.env.BLOG_PASSWORD;
 if (!process.stdin.isTTY) throw new Error('Set BLOG_PASSWORD or run in an interactive terminal.');
 let muted = false;
 const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
 const terminal = createInterface({ input: process.stdin, output, terminal: true });
 process.stdout.write('Blog password (hidden): ');
 muted = true;
 try { return await terminal.question(''); }
 finally { terminal.close(); process.stdout.write('\n'); }
}

function sourceDate(modified) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
 }).formatToParts(modified).map(part => [part.type, part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}

function renderMarkdown(markdown) {
 // Keep Markdown formatting, but never turn source HTML into executable markup.
 return markdownToHtml(markdown, {
  features: { math: true, smartPunctuation: false, frontmatter: false },
  mdastPlugins: [
   { name: 'literal-html', html(node, ctx) { ctx.replaceNode(node, { type: 'text', value: node.value }); } },
   satteriKatex(),
  ],
 }).html;
}

const summaryFor = ({ id, title, description }) => ({ id, title, description });
const articleFor = ({ title, author, date, markdown }) => ({
 title, author, date, sourceHash: sha256(markdown), html: renderMarkdown(markdown),
});

async function readSources() {
 const { posts } = JSON.parse(await readFile(configPath, 'utf8'));
 return Promise.all(posts.map(async source => {
  const id = source.id ?? idFor(source.title);
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Article IDs must be SHA-256 hashes.');
  const [markdown, file] = await Promise.all([readFile(source.source, 'utf8'), stat(source.source)]);
  return {
   id, title: source.title, description: source.description,
   author: source.author, date: sourceDate(file.mtime), markdown,
  };
 }));
}

async function check(sources, password) {
 if (renderMarkdown('<script>alert(1)</script>').includes('<script>')) throw new Error('Source HTML must stay inert.');
 const catalog = JSON.parse(await readFile(resolve(output, 'index.json'), 'utf8'));
 const key = deriveKey(password, Buffer.from(catalog.kdf.salt, 'base64'), catalog.kdf.iterations);
 const index = decrypt(catalog.index, key, 'index');
 if (JSON.stringify(index) !== JSON.stringify(sources.map(summaryFor))) throw new Error('Index metadata mismatch.');
 for (const source of sources) {
  const payload = JSON.parse(await readFile(resolve(output, `${source.id}.json`), 'utf8'));
  const article = decrypt(payload, key, source.id);
  for (const [field, expected] of Object.entries(articleFor(source))) {
   if (article[field] !== expected) throw new Error(`Source mismatch: ${source.id} / ${field}`);
  }
  const tampered = { ...payload, data: Buffer.from(payload.data, 'base64') };
  tampered.data[0] ^= 1;
  try { decrypt({ ...tampered, data: tampered.data.toString('base64') }, key, source.id); throw new Error('Tampered ciphertext accepted.'); }
  catch (error) { if (error.message === 'Tampered ciphertext accepted.') throw error; }
 }
 try { decrypt(catalog.index, deriveKey(`${password}x`, Buffer.from(catalog.kdf.salt, 'base64')), 'index'); throw new Error('Wrong password accepted.'); }
 catch (error) { if (error.message === 'Wrong password accepted.') throw error; }
 console.log(`Verified ${sources.length} source fingerprints, rendered articles, modification dates, and authenticated encryption.`);
}

const password = await readPassword();
if (!password) throw new Error('Password cannot be empty.');
const sources = await readSources();
if (new Set(sources.map(post => post.id)).size !== sources.length) throw new Error('Duplicate article IDs.');
if (process.argv.includes('--check')) {
 await check(sources, password);
} else {
 const salt = randomBytes(16);
 const key = deriveKey(password, salt);
 const index = sources.map(summaryFor);
 const encryptedPosts = sources.map(post => [post.id, encrypt(articleFor(post), key, post.id)]);
 await mkdir(output, { recursive: true });
 for (const [id, payload] of encryptedPosts) await writeFile(resolve(output, `${id}.json`), JSON.stringify(payload));
 await writeFile(resolve(output, 'index.json'), JSON.stringify({ version: 1, kdf: { iterations, salt: salt.toString('base64') }, index: encrypt(index, key, 'index') }));
 await writeFile(routesPath, JSON.stringify({ ids: sources.map(post => post.id) }, null, 2) + '\n');
 await check(sources, password);
 console.log('Encrypted articles ready. Rebuild the site to publish updates.');
}
