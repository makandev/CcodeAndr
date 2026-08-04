// ================= Zusatz-Funktion: Hintergrund entfernen =================
// Läuft im Browser (WASM), kostenlos, ohne Server. Wird bei Bedarf nachgeladen.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = src;
  });
}

let _bgRemovalMod = null;
export async function removeBackground(img) {
  if (!_bgRemovalMod) {
    _bgRemovalMod = await import(
      "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm"
    );
  }
  const { removeBackground: rb } = _bgRemovalMod;

  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 512;
  c.height = img.naturalHeight || 512;
  c.getContext("2d").drawImage(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));

  const outBlob = await rb(blob);
  const urlObj = URL.createObjectURL(outBlob);
  const out = await loadImage(urlObj);
  URL.revokeObjectURL(urlObj);
  return out;
}
