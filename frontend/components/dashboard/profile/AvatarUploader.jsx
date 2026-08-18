'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Avatar viewer + click/drag upload zone.
 * Shows a local object-URL preview immediately, then keeps whatever URL the
 * server returns. Falls back to the user's initial when there is no image.
 */
export default function AvatarUploader({
  avatarUrl,
  initial = 'U',
  labels,
  onUpload,
  isUploading = false,
  onValidationError,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Release the object URL when the preview is replaced or unmounted.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file) => {
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      onValidationError?.(labels.avatarTypeError);
      return;
    }

    if (file.size > MAX_BYTES) {
      onValidationError?.(labels.avatarSizeError);
      return;
    }

    setImageFailed(false);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    onUpload?.(file);
  };

  const displayUrl = preview || (imageFailed ? null : avatarUrl);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-purple-500/30 bg-gradient-to-br from-plum-700 to-plum-950 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={labels.avatarAlt}
              width="96"
              height="96"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-gold-300">
              {initial}
            </span>
          )}
        </div>

        {isUploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#120a1c]/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-gold-300" aria-hidden />
          </span>
        ) : null}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer?.files?.[0]);
        }}
        className={`flex-1 rounded-2xl border border-dashed p-4 text-center transition-all duration-300 sm:text-start ${
          isDragging
            ? 'border-gold-400/70 bg-gold-400/10'
            : 'border-gray-300 bg-gray-50 hover:border-plum-400 dark:border-purple-500/25 dark:bg-black/20 dark:hover:border-purple-400/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
          aria-label={labels.uploadAvatar}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition-all duration-300 hover:border-plum-400 hover:bg-plum-50 hover:text-plum-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-100 dark:hover:border-gold-400/50 dark:hover:bg-gold-400/10 dark:hover:text-gold-200"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-4 w-4" aria-hidden />
          )}
          {labels.uploadAvatar}
        </button>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 sm:justify-start">
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {labels.avatarHint}
        </p>
      </div>
    </div>
  );
}
