// V-Code Edu — optional on-device AI (WebLLM + WebGPU). Runs entirely in the browser:
// after a one-time model download (cached by the browser), it works WITHOUT Internet.
// Requires a WebGPU-capable browser (recent Chrome / Edge on desktop). Quality is lower than cloud models.
import { WEBLLM_URL } from '../config.js';
import { kv } from '../core/idb.js';

const PREFERRED_MODELS = [
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'gemma-2-2b-it-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
];

let engine = null;
let loading = null;
let modelId = null;
const listeners = new Set();
let status = { state: 'idle', progress: 0, text: '' }; // idle | loading | ready | error | unsupported

function setStatus(s) {
  status = { ...status, ...s };
  listeners.forEach((fn) => fn(status));
}

export function onLocalStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function localStatus() {
  return status;
}

export function isWebGPUAvailable() {
  return typeof navigator !== 'undefined' && Boolean(navigator.gpu);
}

/** Whether the user previously downloaded a model on this device. */
export async function wasDownloaded() {
  return Boolean(await kv.get('local-ai:model', null));
}

export async function loadLocalModel() {
  if (engine) return engine;
  if (!isWebGPUAvailable()) {
    setStatus({ state: 'unsupported', text: 'Trình duyệt này chưa hỗ trợ WebGPU (cần Chrome/Edge bản mới trên máy tính).' });
    throw new Error(status.text);
  }
  if (!loading) {
    loading = (async () => {
      setStatus({ state: 'loading', progress: 0, text: 'Đang tải thư viện WebLLM…' });
      const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
      const available = (webllm.prebuiltAppConfig?.model_list || []).map((m) => m.model_id);
      const saved = await kv.get('local-ai:model', null);
      modelId = [saved, ...PREFERRED_MODELS].find((id) => id && available.includes(id)) || available.find((id) => /0\.5B|1B|1\.5B/i.test(id)) || available[0];
      if (!modelId) throw new Error('Không tìm thấy mô hình phù hợp trong WebLLM.');
      engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (p) => setStatus({ state: 'loading', progress: Math.round((p.progress || 0) * 100), text: p.text || 'Đang tải mô hình…' }),
      });
      await kv.set('local-ai:model', modelId);
      setStatus({ state: 'ready', progress: 100, text: `Sẵn sàng: ${modelId}` });
      return engine;
    })().catch((err) => {
      loading = null;
      engine = null;
      setStatus({ state: 'error', text: `Không tải được AI trên trình duyệt: ${err?.message || err}` });
      throw err;
    });
  }
  return loading;
}

export function localModelName() {
  return modelId;
}

/** Stream a reply from the on-device model. Yields text chunks. */
export async function* streamLocal({ messages, system, signal }) {
  const eng = await loadLocalModel();
  const chunks = await eng.chat.completions.create({
    messages: [{ role: 'system', content: system }, ...messages.slice(-12)],
    stream: true,
    temperature: 0.5,
    max_tokens: 1024,
  });
  for await (const chunk of chunks) {
    if (signal?.aborted) {
      try { await eng.interruptGenerate(); } catch { /* noop */ }
      return;
    }
    const text = chunk?.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}
