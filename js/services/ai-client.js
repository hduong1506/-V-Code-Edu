// V-Code Edu — client for the backend AI gateway (Server-Sent Events). API keys never touch the browser.
import { getApiBase } from '../config.js';
import { getIdToken } from './auth.js';
import { appState } from '../core/store.js';

export class AIError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 56000;
const MAX_MESSAGE_CHARS = 12000;

/** Keep the most recent messages within the gateway's limits (long conversations stay usable). */
export function trimHistory(messages) {
  const clean = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content && !m.error)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_CHARS) }));
  const out = [];
  let total = 0;
  for (let i = clean.length - 1; i >= 0 && out.length < MAX_MESSAGES; i--) {
    total += clean[i].content.length;
    if (total > MAX_TOTAL_CHARS && out.length) break;
    out.unshift(clean[i]);
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

let providersCache = null;
export const NO_BACKEND_MESSAGE = 'Trang này đang chạy trên hosting tĩnh (ví dụ GitHub Pages) nên chưa có máy chủ AI. '
  + 'Hãy triển khai thư mục backend/ (Render, Railway…) rồi nhập địa chỉ ở Tài khoản → Giao diện & AI → Máy chủ V-Code, '
  + 'hoặc chọn "AI trên trình duyệt" (cần trình duyệt hỗ trợ WebGPU).';

function requireBackend() {
  if (!getApiBase()) throw new AIError('no_backend', NO_BACKEND_MESSAGE);
}

export async function fetchProviders({ force = false } = {}) {
  requireBackend();
  if (!force && providersCache && Date.now() - providersCache.at < 30000) return providersCache.data;
  const res = await fetch(`${getApiBase()}/api/ai/providers`, { cache: 'no-store' });
  if (!res.ok) throw new AIError('backend', `Máy chủ AI phản hồi lỗi ${res.status}`);
  const data = await res.json();
  providersCache = { at: Date.now(), data };
  return data;
}

export async function fetchUsage() {
  if (!getApiBase()) return null;
  const res = await fetch(`${getApiBase()}/api/ai/usage`, { headers: await authHeaders(), cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Stream a chat completion from the backend.
 * Yields { type: 'meta'|'delta'|'done'|'error', data }.
 */
export async function* streamChat({ messages, mode = 'tutor', provider = 'auto', context, signal }) {
  requireBackend();
  if (!appState.get().online && !/^(localhost|127\.|192\.168\.|10\.)/.test(new URL(getApiBase()).hostname)) {
    throw new AIError('offline', 'Bạn đang ngoại tuyến nên không dùng được AI đám mây. Hãy chọn "AI trên trình duyệt" hoặc máy chủ AI cục bộ trong cài đặt.');
  }
  let res;
  try {
    res = await fetch(`${getApiBase()}/api/ai/chat`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ messages: trimHistory(messages), mode, provider, context: context || undefined }),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new AIError('network', `Không kết nối được máy chủ AI (${getApiBase()}). Hãy kiểm tra backend đã chạy chưa hoặc cấu hình địa chỉ máy chủ trong Tài khoản → Cài đặt.`);
  }
  if (!res.ok) {
    let detail = null;
    try { detail = (await res.json())?.detail; } catch { /* not json */ }
    if (res.status === 405 || (res.status === 404 && !detail)) {
      throw new AIError('no_backend', `Địa chỉ ${getApiBase()} không phải máy chủ AI của V-Code (lỗi ${res.status}). ${NO_BACKEND_MESSAGE}`);
    }
    const code = detail?.code || (res.status === 429 ? 'rate_limited' : res.status === 401 ? 'unauthorized' : 'http_error');
    const message = detail?.message || (typeof detail === 'string' ? detail : `Máy chủ AI trả về lỗi ${res.status}.`);
    throw new AIError(code, message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, '');
        let event = 'message';
        const dataLines = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        if (!dataLines.length) continue;
        let data;
        try { data = JSON.parse(dataLines.join('\n')); } catch { data = { text: dataLines.join('\n') }; }
        yield { type: event, data };
        if (event === 'done' || event === 'error') return;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
  }
}
