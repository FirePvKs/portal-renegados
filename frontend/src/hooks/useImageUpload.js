import { useState, useCallback } from 'react';
import { uploadToCloudinary } from '../lib/cloudinary.js';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const upload = useCallback(async (file, kind) => {
    setError('');

    if (!file) return null;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WEBP o GIF.');
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`Archivo muy grande (máx ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      return await uploadToCloudinary(file, kind, setProgress);
    } catch (err) {
      setError(err.message || 'Error subiendo imagen');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error, reset: () => setError('') };
}
