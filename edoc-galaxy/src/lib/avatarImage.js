/**
 * Center-crops and downsizes an image file to a small square JPEG data URL,
 * entirely client-side (a canvas, no upload service). Keeps avatars small
 * enough to store as a plain string alongside the rest of the user record
 * (authStore.js) — no separate blob storage needed for something this size.
 */
export function resizeImageToDataUrl(file, { size = 160, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith("image/")) {
      reject(new Error("That file isn't an image."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
