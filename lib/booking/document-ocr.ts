"use client";

// On-device document OCR — TypeScript port of
// User_Frontend/src/utils/documentOcr.js, web-only. Engines load at RUNTIME
// from CDN via <script> injection (no npm install, no bundle growth).
// Images are downscaled + multi-pass preprocessed; PDFs render page 1.
// Never throws — resolves { number, ... } or { number: null, reason }.

import { extractDocumentNumber, validateDocumentNumber } from "./document-number-extractor";

const TESSERACT_CDNS = [
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js",
];
const PDFJS_CDNS = ["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"];
const PDF_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

type TesseractWorker = {
  recognize: (url: string) => Promise<{ data?: { text?: string; confidence?: number } }>;
  setParameters?: (p: Record<string, string>) => Promise<void>;
  terminate?: () => Promise<void>;
};

let workerPromise: Promise<TesseractWorker> | null = null;
const scriptCache: Record<string, Promise<boolean>> = {};

function loadScriptOnce(key: string, urls: string[]): Promise<boolean> {
  const cached = scriptCache[key];
  if (cached !== undefined) return cached;
  scriptCache[key] = (async () => {
    if (typeof document === "undefined") throw new Error("no-dom");
    let lastErr: unknown = null;
    for (const src of urls) {
      try {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[data-ocr="${key}"]`);
          if (existing && existing.getAttribute("src") === src) {
            resolve();
            return;
          }
          const s = document.createElement("script");
          s.src = src;
          s.async = true;
          s.setAttribute("data-ocr", key);
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
    throw lastErr || new Error("script-load-failed");
  })().catch((err: unknown) => {
    delete scriptCache[key];
    throw err;
  });
  return scriptCache[key];
}

function getTesseractGlobal(): {
  createWorker?: (lang: string) => Promise<TesseractWorker>;
} | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Tesseract?: { createWorker?: (lang: string) => Promise<TesseractWorker> } })
    .Tesseract ?? null;
}

async function blobToCanvas(blob: Blob, maxDim = 1600): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-unavailable");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas-encode-failed"))), "image/jpeg", 0.92),
  );
}

async function buildPreprocessedVariants(blob: Blob): Promise<Blob[]> {
  const variants: Blob[] = [];
  try {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") return [blob];
    const base = await blobToCanvas(blob, 1800);
    variants.push(await canvasToBlob(base));

    const w = base.width;
    const h = base.height;
    const srcCtx = base.getContext("2d");
    if (!srcCtx) return variants.length ? variants : [blob];
    const src = srcCtx.getImageData(0, 0, w, h);

    const gray = new Uint8ClampedArray(w * h);
    let lo = 255;
    let hi = 0;
    for (let i = 0; i < w * h; i++) {
      const v = Math.round(0.299 * src.data[i * 4] + 0.587 * src.data[i * 4 + 1] + 0.114 * src.data[i * 4 + 2]);
      gray[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const span = Math.max(1, hi - lo);

    const paint = (mapFn: (v: number) => number): HTMLCanvasElement => {
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const octx = out.getContext("2d");
      if (!octx) throw new Error("canvas-unavailable");
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

    variants.push(await canvasToBlob(paint((v) => Math.round(((v - lo) / span) * 255))));
    variants.push(await canvasToBlob(paint((v) => (v > 140 ? 255 : 0))));

    if (Math.max(w, h) < 2200) {
      const big = document.createElement("canvas");
      big.width = Math.round(w * 1.6);
      big.height = Math.round(h * 1.6);
      const bctx = big.getContext("2d");
      if (bctx) {
        bctx.imageSmoothingEnabled = true;
        bctx.drawImage(base, 0, 0, big.width, big.height);
        variants.push(await canvasToBlob(big));
      }
    }
  } catch {
    // Any canvas failure → fall back to whatever variants succeeded.
  }
  return variants.length ? variants : [blob];
}

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      await loadScriptOnce("tesseract", TESSERACT_CDNS);
      const Tesseract = getTesseractGlobal();
      if (!Tesseract || !Tesseract.createWorker) throw new Error("tesseract-unavailable");
      const worker = await Tesseract.createWorker("eng");
      try {
        if (worker.setParameters) {
          await worker.setParameters({
            tessedit_pageseg_mode: "6",
            tessedit_ocr_engine_mode: "1",
          });
        }
      } catch {
        // Older CDN builds ignore parameters — plain worker still works.
      }
      return worker;
    })().catch((err: unknown) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function recognizeBlob(
  worker: TesseractWorker,
  blob: Blob,
): Promise<{ text: string; confidence: number | null }> {
  const url = URL.createObjectURL(blob);
  try {
    const { data } = await worker.recognize(url);
    return { text: (data && data.text) || "", confidence: (data && data.confidence) ?? null };
  } finally {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
}

async function ocrImageBlob(
  blob: Blob,
  docType: string,
): Promise<{ text: string; confidence: number | null; earlyHit: boolean }> {
  const worker = await getWorker();
  const variants = await buildPreprocessedVariants(blob);
  const texts: string[] = [];
  let best = { text: "", confidence: null as number | null };
  for (const variant of variants) {
    let res;
    try {
      res = await recognizeBlob(worker, variant);
    } catch {
      continue;
    }
    if (res.text) texts.push(res.text);
    if ((res.text || "").length > (best.text || "").length) best = res;
    const candidate = extractDocumentNumber(res.text, docType);
    if (candidate && validateDocumentNumber(candidate, docType)) {
      return { text: res.text, confidence: res.confidence ?? null, earlyHit: true };
    }
  }
  return { text: texts.join("\n"), confidence: best.confidence ?? null, earlyHit: false };
}

async function renderPdfFirstPage(blob: Blob): Promise<Blob> {
  await loadScriptOnce("pdfjs", PDFJS_CDNS);
  const lib = (
    window as unknown as {
      pdfjsLib?: {
        getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> };
        GlobalWorkerOptions?: { workerSrc: string };
      };
    }
  ).pdfjsLib;
  if (!lib) throw new Error("pdfjs-unavailable");
  try {
    if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  } catch {
    // ignore
  }
  const buf = await blob.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  try {
    if (pdf.destroy) pdf.destroy();
  } catch {
    // ignore
  }
  return await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("pdf-render-failed"))), "image/jpeg", 0.9),
  );
}

interface PdfDoc {
  getPage: (n: number) => Promise<PdfPage>;
  destroy?: () => void;
}
interface PdfPage {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D | null; viewport: unknown }) => { promise: Promise<void> };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("ocr-timeout")), ms)),
  ]);
}

export interface ScanResult {
  number: string | null;
  confidence?: number | null;
  rawTextLength?: number;
  reason?: string;
}

export async function scanDocumentNumber(
  file: File | Blob,
  docType: string,
  opts: { timeoutMs?: number } = {},
): Promise<ScanResult> {
  const timeoutMs = opts.timeoutMs || 35000;
  try {
    if (typeof Blob !== "undefined" && !(file instanceof Blob)) {
      return { number: null, reason: "unsupported-input" };
    }
    const blob = file as Blob & { name?: string; type: string };
    const name = typeof (file as File).name === "string" ? (file as File).name : "";
    const isPdf = blob.type === "application/pdf" || String(name).toLowerCase().endsWith(".pdf");
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
    let number = extractDocumentNumber(ocrResult.text, docType);
    if (!number && ocrResult.text) {
      const chunks = String(ocrResult.text)
        .split("\n")
        .sort((a, b) => b.length - a.length);
      for (const chunk of chunks.slice(0, 6)) {
        const hit = extractDocumentNumber(chunk, docType);
        if (hit) {
          number = hit;
          break;
        }
      }
    }
    if (!number)
      return { number: null, reason: "no-number-found", rawTextLength: (ocrResult.text || "").length };
    return { number, confidence: ocrResult.confidence ?? null, rawTextLength: (ocrResult.text || "").length };
  } catch (err) {
    return { number: null, reason: (err as Error)?.message || "ocr-failed" };
  }
}

export function preloadDocumentOcr(): void {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => void;
    };
    const idle = w.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => {
      getWorker().catch(() => {
        // Offline / CDN blocked — scan retries on demand and falls back gracefully.
      });
    });
  } catch {
    // ignore
  }
}
