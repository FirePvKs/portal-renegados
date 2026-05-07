import imageCompression from 'browser-image-compression';
import { api } from './api.js';

export async function uploadToCloudinary(file, kind, onProgress) {
  const compressOptions = {
    maxSizeMB: kind === 'banner' || kind === 'card' ? 1.5 : 0.8,
    maxWidthOrHeight: kind === 'banner' || kind === 'card' ? 2000 : 1200,
    useWebWorker: true,
    fileType: 'image/jpeg'
  };

  let compressed;
  try {
    compressed = await imageCompression(file, compressOptions);
  } catch (err) {
    console.warn('Compresión falló, usando original:', err);
    compressed = file;
  }

  const { signature, timestamp, folder, apiKey, cloudName } = await api.getUploadSignature(kind);

  const formData = new FormData();
  formData.append('file', compressed);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, public_id: data.public_id });
      } else {
        let msg = 'Error subiendo imagen';
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Error de red')));
    xhr.send(formData);
  });
}

export function cldUrl(url, opts = {}) {
  if (!url || !url.includes('/upload/')) return url;

  const transforms = [];
  if (opts.w) transforms.push(`w_${opts.w}`);
  if (opts.h) transforms.push(`h_${opts.h}`);
  if (opts.crop) transforms.push(`c_${opts.crop}`);
  else if (opts.w || opts.h) transforms.push('c_fill');
  transforms.push('f_auto');
  transforms.push(`q_${opts.quality || 'auto'}`);

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}

export const cldPresets = {
  avatarSmall: (url) => cldUrl(url, { w: 80, h: 80 }),
  avatarMedium: (url) => cldUrl(url, { w: 200, h: 200 }),
  avatarLarge: (url) => cldUrl(url, { w: 400, h: 400 }),
  bannerCard: (url) => cldUrl(url, { w: 600, h: 200 }),
  bannerFull: (url) => cldUrl(url, { w: 1600, h: 400 }),
  itemThumb: (url) => cldUrl(url, { w: 300, h: 300 }),
  itemFull: (url) => cldUrl(url, { w: 1000 })
};
