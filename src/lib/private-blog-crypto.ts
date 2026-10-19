export interface Ciphertext { iv: string; data: string; }
export interface PrivateCatalog {
 version: number;
 kdf: { salt: string; iterations: number };
 index: Ciphertext;
}
export interface PrivatePostSummary {
 id: string; title: string; description: string;
}
export interface PrivatePost { title: string; author: string; date: string; html: string; }

const PRIVATE_BLOG_SESSION = 'alex-private-blog-key-v1';
const encoder = new TextEncoder();
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
 return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}
export async function derivePrivateKey(password: string, catalog: PrivateCatalog): Promise<CryptoKey> {
 const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
 return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromBase64(catalog.kdf.salt), iterations: catalog.kdf.iterations, hash: 'SHA-256' }, material,
  { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
export async function decryptPrivate<T>(payload: Ciphertext, key: CryptoKey, id: string): Promise<T> {
 const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv), additionalData: encoder.encode(`alex-private-blog:v1:${id}`), tagLength: 128 }, key, fromBase64(payload.data));
 return JSON.parse(new TextDecoder().decode(plaintext));
}
export async function rememberPrivateKey(key: CryptoKey, salt: string) {
 const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
 try { sessionStorage.setItem(PRIVATE_BLOG_SESSION, JSON.stringify({ salt, key: btoa(String.fromCharCode(...raw)) })); } catch { /* Unlock still works when storage is disabled. */ }
}
export async function recallPrivateKey(salt: string): Promise<CryptoKey | null> {
 try {
  const saved = JSON.parse(sessionStorage.getItem(PRIVATE_BLOG_SESSION) ?? 'null');
  if (!saved || saved.salt !== salt) return null;
  return await crypto.subtle.importKey('raw', fromBase64(saved.key), { name: 'AES-GCM' }, false, ['decrypt']);
 } catch { return null; }
}
export function forgetPrivateKey() {
 try { sessionStorage.removeItem(PRIVATE_BLOG_SESSION); } catch {}
}
