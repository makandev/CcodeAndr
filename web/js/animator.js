// ================= Animations-Engine =================
// Nimmt ein Bild und erzeugt daraus animierte Frames auf einem 512x512-Canvas.

export const SIZE = 512;

// Chroma-Key-Farbe für GIF-Transparenz (unwahrscheinlich im Motiv).
const KEY_COLOR = { r: 0, g: 255, b: 1 };
const KEY_CSS = `rgb(${KEY_COLOR.r},${KEY_COLOR.g},${KEY_COLOR.b})`;

/**
 * Animations-Presets. Jede Funktion bekommt den Fortschritt p (0..1, Schleife)
 * und liefert Transform-Werte relativ zur Bildmitte.
 */
export const ANIMATIONS = {
  none:   { label: "Standbild", icon: "🖼️", fn: () => ({}) },
  bounce: { label: "Hüpfen",    icon: "🦘", fn: (p) => ({ y: -60 * Math.abs(Math.sin(p * Math.PI)) }) },
  wobble: { label: "Wackeln",   icon: "🌀", fn: (p) => ({ rot: Math.sin(p * Math.PI * 4) * 12 }) },
  pulse:  { label: "Pulsieren", icon: "💓", fn: (p) => ({ scale: 1 + 0.12 * Math.sin(p * Math.PI * 2) }) },
  spin:   { label: "Drehen",    icon: "🔄", fn: (p) => ({ rot: p * 360 }) },
  float:  { label: "Schweben",  icon: "🎈", fn: (p) => ({ y: Math.sin(p * Math.PI * 2) * 20, rot: Math.sin(p * Math.PI * 2) * 4 }) },
  shake:  { label: "Zittern",   icon: "📳", fn: (p) => ({ x: Math.sin(p * Math.PI * 12) * 10, rot: Math.sin(p * Math.PI * 10) * 3 }) },
  pop:    { label: "Pop",       icon: "✨", fn: (p) => ({ scale: 0.7 + 0.5 * Math.abs(Math.sin(p * Math.PI)) }) },
  rainbow:{ label: "Rainbow",   icon: "🌈", fn: (p) => ({ hue: p * 360 }) },
};

/**
 * Zeichnet einen einzelnen Frame auf den gegebenen Context.
 * @param {boolean} keyed  true = Chroma-Key-Hintergrund (für GIF), false = transparent (Live-Vorschau)
 */
function drawFrame(ctx, img, t, animKey, keyed) {
  const anim = (ANIMATIONS[animKey] || ANIMATIONS.none).fn(t) || {};
  const { x = 0, y = 0, rot = 0, scale = 1, hue = 0 } = anim;

  ctx.clearRect(0, 0, SIZE, SIZE);
  if (keyed) {
    ctx.fillStyle = KEY_CSS;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  ctx.save();
  ctx.filter = hue ? `hue-rotate(${hue}deg)` : "none";
  ctx.translate(SIZE / 2 + x, SIZE / 2 + y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(scale, scale);

  // Bild in ein 440x440-Quadrat mittig einpassen (etwas Rand für Bewegung).
  const box = 440;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.min(box / iw, box / ih);
  const w = iw * s, h = ih * s;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * Live-Vorschau: animiert das Bild direkt auf dem sichtbaren Canvas (transparent).
 * Gibt eine Stop-Funktion zurück.
 */
export function startPreview(canvas, img, animKey, delayMs) {
  const ctx = canvas.getContext("2d");
  let raf, start = null;
  const dur = Math.max(1, framesFor(animKey)) * delayMs;

  function loop(ts) {
    if (start === null) start = ts;
    const p = ((ts - start) % dur) / dur;
    drawFrame(ctx, img, p, animKey, false);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function framesFor(animKey) {
  return animKey === "none" ? 1 : 18;
}

/**
 * Rendert alle Frames und kodiert sie als animiertes GIF (mit Transparenz).
 * @returns {Promise<Blob>}
 */
export function renderGif(img, animKey, frames, delayMs, onProgress) {
  return new Promise((resolve, reject) => {
    if (typeof GIF === "undefined") {
      reject(new Error("GIF-Bibliothek nicht geladen"));
      return;
    }
    const n = animKey === "none" ? 1 : frames;

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: SIZE,
      height: SIZE,
      transparent: (KEY_COLOR.r << 16) | (KEY_COLOR.g << 8) | KEY_COLOR.b,
      workerScript: "js/vendor/gif.worker.js",
    });

    const c = document.createElement("canvas");
    c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext("2d");

    for (let i = 0; i < n; i++) {
      const p = n === 1 ? 0 : i / n;
      drawFrame(ctx, img, p, animKey, true);
      gif.addFrame(ctx, { copy: true, delay: delayMs });
    }

    gif.on("progress", (pr) => onProgress && onProgress(pr));
    gif.on("finished", (blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("GIF-Erstellung abgebrochen")));
    gif.render();
  });
}
