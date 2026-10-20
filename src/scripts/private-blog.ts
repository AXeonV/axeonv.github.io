import { SITE_TITLE } from '../consts';
import { privateBlogText } from '../lib/private-blog-text';
import { decryptPrivate, derivePrivateKey, rememberPrivateKey, recallPrivateKey, forgetPrivateKey,
 type PrivateCatalog, type PrivatePost, type PrivatePostSummary, type Ciphertext } from '../lib/private-blog-crypto';

async function loadJson<T>(url: string): Promise<T> {
 const response = await fetch(url, { cache: 'no-store' });
 if (!response.ok) throw new Error('Content unavailable');
 return response.json();
}

function initPrivateBlog(root: HTMLElement) {
 const locale = root.dataset.locale === 'en' ? 'en' : 'zh';
 const text = privateBlogText[locale];
 const postId = root.dataset.postId;
 const row = root.querySelector<HTMLElement>('[data-private-row]')!;
 const toggle = root.querySelector<HTMLButtonElement>('[data-private-toggle]');
 const shackle = root.querySelector<SVGPathElement>('[data-private-shackle]');
 const lock = root.querySelector<HTMLButtonElement>('[data-private-lock]');
 const form = root.querySelector<HTMLFormElement>('[data-private-form]')!;
 const input = form.querySelector<HTMLInputElement>('input')!;
 const submit = form.querySelector<HTMLButtonElement>('button')!;
 const status = root.querySelector<HTMLElement>('[data-private-status]')!;
 const content = root.querySelector<HTMLElement>('[data-private-content]')!;
 const cardTemplate = root.querySelector<HTMLTemplateElement>('[data-private-card]');
 let unlocked = false;
 let catalog: PrivateCatalog | undefined;
 let operation = 0;

 function showStatus(message = '', error = false) {
  status.textContent = message;
  status.hidden = !message;
  status.toggleAttribute('data-error', error);
 }
 function busy(value: boolean) {
  input.disabled = submit.disabled = value;
  if (toggle) toggle.disabled = value;
  if (lock) lock.disabled = value;
  root.setAttribute('aria-busy', String(value));
 }
 function setUnlocked(value: boolean) {
  unlocked = value;
  shackle?.setAttribute('d', value ? 'M8 10V6a4 4 0 0 1 8 0' : 'M8 10V6a4 4 0 0 1 8 0v4');
  input.value = '';
  form.hidden = value || !postId;
  row.hidden = value && !!postId;
  if (lock) lock.hidden = !value;
  content.hidden = !value;
  toggle?.setAttribute('aria-expanded', String(value));
  showStatus();
 }
 function reset() {
  operation++;
  forgetPrivateKey();
  setUnlocked(false);
  if (postId) {
   root.querySelector('[data-private-title]')!.textContent = '';
   root.querySelector('[data-private-meta]')!.replaceChildren();
   root.querySelector('[data-private-body]')!.replaceChildren();
   document.title = `Blog | ${SITE_TITLE}`;
  } else content.replaceChildren();
 }
 async function getCatalog() {
  if (!catalog) {
   const value = await loadJson<PrivateCatalog>('/private-blog/index.json');
   if (value.version !== 1) throw new Error('Unsupported content version');
   catalog = value;
  }
  return catalog;
 }
 async function display(key: CryptoKey, entries: PrivatePostSummary[], token: number) {
  if (postId) {
   if (!entries.some(entry => entry.id === postId)) throw new Error('Unknown article');
   const payload = await loadJson<Ciphertext>(`/private-blog/${postId}.json`);
   const post = await decryptPrivate<PrivatePost>(payload, key, postId);
   if (token !== operation) return;
   root.querySelector('[data-private-title]')!.textContent = post.title;
   const date = document.createElement('time');
   date.dateTime = post.date;
   date.textContent = new Date(`${post.date}T00:00:00Z`).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
   root.querySelector('[data-private-meta]')!.replaceChildren(document.createTextNode(`${post.author} · `), date);
   // The HTML was rendered locally and is authenticated by AES-GCM before insertion.
   root.querySelector('[data-private-body]')!.innerHTML = post.html;
   document.title = `${post.title} | ${SITE_TITLE}`;
  } else {
   const fragment = document.createDocumentFragment();
   for (const post of entries) {
    const card = cardTemplate!.content.cloneNode(true) as DocumentFragment;
    const link = card.querySelector<HTMLAnchorElement>('a')!;
    link.href = `/${locale}/blog/${post.id}/`;
    card.querySelector('h2')!.textContent = post.title;
    card.querySelector('p')!.textContent = post.description;
    fragment.append(card);
   }
   if (token !== operation) return;
   content.replaceChildren(fragment);
  }
  setUnlocked(true);
 }

 toggle?.addEventListener('click', () => {
  if (unlocked) {
   content.hidden = !content.hidden;
   toggle.setAttribute('aria-expanded', String(!content.hidden));
  } else {
   form.hidden = !form.hidden;
   toggle.setAttribute('aria-expanded', String(!form.hidden));
   if (!form.hidden) input.focus();
  }
 });
 lock?.addEventListener('click', () => { reset(); toggle?.focus(); });
 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!crypto.subtle) { showStatus(text.unsupported, true); return; }
  const token = ++operation;
  busy(true);
  showStatus(text.working);
  let authenticated = false;
  let loaded = false;
  try {
   const data = await getCatalog();
   loaded = true;
   const key = await derivePrivateKey(input.value, data);
   const entries = await decryptPrivate<PrivatePostSummary[]>(data.index, key, 'index');
   authenticated = true;
   await display(key, entries, token);
   if (token === operation) await rememberPrivateKey(key, data.kdf.salt);
  } catch {
   showStatus(loaded && !authenticated ? text.badPassword : text.loadError, true);
   input.value = '';
  } finally {
   busy(false);
   if (!unlocked) input.focus();
  }
 });

 async function restore() {
  if (!crypto.subtle) return;
  const token = ++operation;
  busy(true);
  try {
   const data = await getCatalog();
   const key = await recallPrivateKey(data.kdf.salt);
   if (!key) { if (unlocked) reset(); return; }
   const entries = await decryptPrivate<PrivatePostSummary[]>(data.index, key, 'index');
   await display(key, entries, token);
  } catch { reset(); }
  finally { busy(false); }
 }
 void restore();
 // A cached page must also respect a later lock when reached with Back/Forward.
 window.addEventListener('pageshow', event => { if (event.persisted) void restore(); });
}

export function initPrivateBlogs() {
 document.querySelectorAll<HTMLElement>('[data-private-blog]').forEach(initPrivateBlog);
}
