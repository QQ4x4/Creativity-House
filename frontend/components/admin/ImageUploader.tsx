'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { uploadAdminImage } from '@/lib/admin/api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

interface ImageUploaderProps {
  /** Current image URL from the form (upload or pasted link). */
  value?: string | null;
  /** Called with the permanent public URL after a successful upload. */
  onUploaded: (url: string) => void;
  /** Optional short label shown above the dropzone. */
  label?: string;
  /** Preview variant — cover is wide; avatar is a square thumb inside the zone. */
  variant?: 'cover' | 'avatar';
  className?: string;
  disabled?: boolean;
}

/**
 * Admin drag-and-drop image upload. Files go to POST /v1/admin/upload-image and
 * the returned permanent URL is written back into the parent form field.
 */
export function ImageUploader({
  value,
  onUploaded,
  label = 'Upload image',
  variant = 'cover',
  className,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file || disabled || uploading) return;

      setUploading(true);
      try {
        const result = await uploadAdminImage(file);
        if (!result?.url) {
          throw new Error('Upload succeeded but no URL was returned.');
        }
        onUploaded(result.url);
        toast.success('Image uploaded.');
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Image upload failed.';
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [disabled, onUploaded, uploading]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled: disabled || uploading,
  });

  const rejectionMessage =
    fileRejections[0]?.errors?.[0]?.message ||
    (fileRejections.length > 0 ? 'That file is not an allowed image (max 5 MB).' : null);

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      ) : null}

      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-4 py-6 text-center transition-colors',
          isDragActive
            ? 'border-plum-500 bg-plum-50/80 dark:border-gold-400/60 dark:bg-gold-400/10'
            : 'border-gray-300 bg-gray-50/80 hover:border-gray-400 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/25',
          (disabled || uploading) && 'cursor-not-allowed opacity-70',
          variant === 'avatar' ? 'min-h-[140px]' : 'min-h-[160px]'
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
            <Loader2 className="h-7 w-7 animate-spin text-plum-600 dark:text-gold-300" aria-hidden />
            <p className="text-sm font-medium">Uploading…</p>
          </div>
        ) : value ? (
          <div className="flex w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded preview"
              className={cn(
                'object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10',
                variant === 'avatar'
                  ? 'h-20 w-20 rounded-full'
                  : 'h-28 w-full max-w-sm rounded-xl'
              )}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Drop a new image to replace, or click to browse
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10">
              <ImageIcon className="h-5 w-5 text-plum-600 dark:text-gold-300" aria-hidden />
            </span>
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select from PC'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">JPEG, PNG, WebP or SVG · max 5 MB</p>
          </div>
        )}
      </div>

      {rejectionMessage ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {rejectionMessage}
        </p>
      ) : null}
    </div>
  );
}
