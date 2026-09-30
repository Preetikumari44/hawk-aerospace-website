/**
 * On-device document OCR — 100% client-side, ZERO backend / AWS load.
 *
 * IMPORTANT: this file must stay free of any bundler-resolved OCR imports
 * (`tesseract.js`, `pdfjs-dist`, ML Kit, …). The app shares this module
 * between web (webpack) and native (Metro) — Metro statically resolves every
 * `import`/`require` specifier, so even a lazy `import('tesseract.js')`
 * crashes native bundling when the package isn't installed. Instead, on web
 * the OCR engines are loaded at RUNTIME from a CDN via <script> injection
 * (no npm install, no bundle growth, no AWS involvement). On native the
 * scanner instantly falls back to manual entry.
 *
 * Design for speed:
 *  - CDN scripts load lazily (only when a doc is picked, never upfront).
 *    The worker is created once, warmed during idle, and reused.
 *  - Images are downscaled to ~1200px on a canvas before OCR (2-4x faster).
 *  - OCR runs IN PARALLEL with the Firebase upload — it never blocks submit.
 *  - PDFs: only page 1 is rendered (doc numbers live on page 1).
 *  - Native (Android/iOS): resolves `native-ocr-unavailable` instantly so the
 *    form falls back to manual entry with zero crash risk.
 *
 * Never throws — always resolves { number, ... } or { number: null, reason }.
 */
import { Platform } from 'react-native';
import { extractDocumentNumber, validateDocumentNumber } from './documentNumberExtractor';

// CDN sources only — deliberately NOT npm imports (see header).
const TESSERACT_CDNS = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
];
const PDFJS_CDNS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
];
const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let workerPromise = null;
const scriptCache = {};

function isWeb() {
  return Platform.OS === 'web';
}

/** Inject a <script> once, resolve when loaded. Tries URLs in order. */
function loadScriptOnce(key, urls) {
  if (scriptCache[key]) return scriptCache[key];
  scriptCache[key] = (async () => {
    if (!isWeb() || typeof document === 'undefined') throw new Error('no-dom');
    let lastErr = null;
    for (const src of urls) {
      try {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector(`script[data-ocr="${key}"]`);
          if (existing && existing.getAttribute('src') === src) {
            resolve();
            return;
          }
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.setAttribute('data-ocr', key);
          s.onload = () => resolve();
          s.onerror = () => {
            s.remove();
            reject(new Error(`script-load-failed:${src}`));
          };
          document.head.appendChild(s);
        });
        return true;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('script-load-failed');
  })().catch((err) => {
    delete scriptCache[key];
    throw err;
  });
  return scriptCache[key];
}

function getTesseractGlobal() {
  if (!isWeb() || typeof window === 'undefined') return null;
  return window.Tesseract || null;
}

function getPdfjsGlobal() {
  if (!isWeb() || typeof window === 'undefined') return null;
  return window.pdfjsLib || null;
}

/** Draw a blob onto a canvas bounded by maxDim (returns canvas or null). */
async function blobToCanvas(blob, maxDim = 1600) {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas-encode-failed'))), 'image/jpeg', 0.92),
  );
}

/**
 * Build OCR-friendly variants of the source image (grayscale + autocontrast,
 * thresholded, upscaled). Tiny phone-camera text is the #1 miss cause, so
 * small images are upscaled before the later passes.
 */
async function buildPreprocessedVariants(blob) {
  const variants = [];
  try {
    if (!isWeb() || typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
      return [blob];
    }
    const base = await blobToCanvas(blob, 1800);
    variants.push(await canvasToBlob(base));

    const w = base.width;
    const h = base.height;
    const srcCtx = base.getContext('2d');
    const src = srcCtx.getImageData(0, 0, w, h);

    const gray = new Uint8ClampedArray(w * h);
    let lo = 255;
    let hi = 0;
    for (let i = 0; i < w * h; i++) {
      const r = src.data[i * 4];
      const g = src.data[i * 4 + 1];
      const b = src.data[i * 4 + 2];
      const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      gray[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const span = Math.max(1, hi - lo);

    const paint = (mapFn) => {
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const octx = out.getContext('2d');
      const img = octx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = mapFn(gray[i]);
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      return out;
    };

    // Pass 2: autocontrast grayscale (fixes dull scans).
    variants.push(
      await canvasToBlob(paint((v) => Math.round(((v - lo) / span) * 255))),
    );
    // Pass 3: hard threshold (fixes patterned/colored card backgrounds).
    variants.push(await canvasToBlob(paint((v) => (v > 140 ? 255 : 0))));

    // Pass 4: 1.6x upscale for small-text documents (Aadhaar back, DL).
    if (Math.max(w, h) < 2200) {
      const big = document.createElement('canvas');
      big.width = Math.round(w * 1.6);
      big.height = Math.round(h * 1.6);
      const bctx = big.getContext('2d');
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(base, 0, 0, big.width, big.height);
      variants.push(await canvasToBlob(big));
    }
  } catch {
    // Any canvas failure → fall back to whatever variants succeeded.
  }
  return variants.length ? variants : [blob];
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      await loadScriptOnce('tesseract', TESSERACT_CDNS);
      const Tesseract = getTesseractGlobal();
      if (!Tesseract || !Tesseract.createWorker) throw new Error('tesseract-unavailable');
      const worker = await Tesseract.createWorker('eng');
      try {
        // PSM 6 = uniform text block (ID cards); OEM 1 = LSTM only (most accurate).
        if (worker.setParameters) {
          await worker.setParameters({
            tessedit_pageseg_mode: '6',
            tessedit_ocr_engine_mode: '1',
          });
        }
      } catch {
        // Older CDN builds ignore parameters — plain worker still works.
      }
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function recognizeBlob(worker, blob) {
  const url = URL.createObjectURL(blob);
  try {
    const { data } = await worker.recognize(url);
    return { text: (data && data.text) || '', confidence: (data && data.confidence) ?? null };
  } finally {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
}

/**
 * Multi-pass OCR: tries each preprocessed variant in order and stops early
 * the moment a VALID number for this doc type is found (fast path stays
 * fast); otherwise returns the combined text so the extractor gets every
 * glyph seen across passes.
 */
async function ocrImageBlob(blob, docType) {
  const worker = await getWorker();
  const variants = await buildPreprocessedVariants(blob);
  const texts = [];
  let best = { text: '', confidence: null };
  for (const variant of variants) {
    let res;
    try {
      res = await recognizeBlob(worker, variant);
    } catch {
      continue;
    }
    if (res.text) texts.push(res.text);
    if ((res.text || '').length > (best.text || '').length) best = res;
    const candidate = extractDocumentNumber(res.text, docType);
    if (candidate && validateDocumentNumber(candidate, docType)) {
      return { text: res.text, confidence: res.confidence ?? null, earlyHit: true };
    }
  }
  return { text: texts.join('\n'), confidence: best.confidence ?? null, earlyHit: false };
}

async function getPdfjs() {
  await loadScriptOnce('pdfjs', PDFJS_CDNS);
  const lib = getPdfjsGlobal();
  if (!lib) throw new Error('pdfjs-unavailable');
  try {
    if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  } catch {
    // ignore
  }
  return lib;
}

/** Render PDF page 1 to a JPEG blob for OCR (high scale for small ID text). */
async function renderPdfFirstPage(blob) {
  const pdfjs = await getPdfjs();
  const buf = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  try {
    if (pdf.destroy) pdf.destroy();
  } catch {
    // ignore
  }
  return await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('pdf-render-failed'))), 'image/jpeg', 0.9),
  );
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ocr-timeout')), ms)),
  ]);
}

/**
 * Scan a picked document and extract its number — runs fully on-device.
 * @param {File|Blob|string} fileOrUri web File/Blob or native file uri
 * @param {string} docType DOCUMENT_OPTIONS id (aadhaar/pan/passport/...)
 * @param {{ timeoutMs?: number }} opts
 */
export async function scanDocumentNumber(fileOrUri, docType, opts = {}) {
  const timeoutMs = opts.timeoutMs || 35000;
  try {
    if (isWeb()) {
      const isBlob = typeof Blob !== 'undefined' && fileOrUri instanceof Blob;
      if (!isBlob) return { number: null, reason: 'unsupported-input' };
      const blob = fileOrUri;
      const isPdf =
        blob.type === 'application/pdf' ||
        (blob.name && String(blob.name).toLowerCase().endsWith('.pdf'));
      const ocrResult = await withTimeout(
        (async () => {
          if (isPdf) {
            const pageImg = await renderPdfFirstPage(blob);
            return ocrImageBlob(pageImg, docType);
          }
          return ocrImageBlob(blob, docType);
        })(),
        timeoutMs,
      );
      // Multi-pass text pooled — try combined first, then the longest single
      // chunk, so one bad pass can't hide a good read from another pass.
      let number = extractDocumentNumber(ocrResult.text, docType);
      if (!number && ocrResult.text) {
        const chunks = String(ocrResult.text)
          .split('\n')
          .sort((a, b) => b.length - a.length);
        for (const chunk of chunks.slice(0, 6)) {
          const hit = extractDocumentNumber(chunk, docType);
          if (hit) {
            number = hit;
            break;
          }
        }
      }
      if (!number) return { number: null, reason: 'no-number-found', rawTextLength: (ocrResult.text || '').length };
      return { number, confidence: ocrResult.confidence ?? null, rawTextLength: (ocrResult.text || '').length };
    }
    // Native: no bundler-safe on-device OCR wired yet — instant manual fallback.
    return { number: null, reason: 'native-ocr-unavailable' };
  } catch (err) {
    return { number: null, reason: (err && err.message) || 'ocr-failed' };
  }
}

/** Warm the CDN + worker during idle so the first scan feels instant. */
export function preloadDocumentOcr() {
  try {
    if (!isWeb() || typeof window === 'undefined') return;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    idle(() => {
      getWorker().catch(() => {
        // Offline / CDN blocked — scan will retry on demand and fall back gracefully.
      });
    });
  } catch {
    // ignore
  }
}

export default { scanDocumentNumber, preloadDocumentOcr };
