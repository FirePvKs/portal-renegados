import { useRef } from 'react';
import { useImageUpload } from '../hooks/useImageUpload.js';

export default function ImageUpload({ kind, onUploaded, children, className = '' }) {
  const inputRef = useRef(null);
  const { upload, uploading, progress, error } = useImageUpload();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, kind);
    if (result) onUploaded(result);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={`${className} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {uploading ? (
          <span className="font-mono text-xs">Subiendo {progress}%</span>
        ) : children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
      />
      {error && (
        <p className="text-xs text-blood mt-1 font-mono">{error}</p>
      )}
    </div>
  );
}
