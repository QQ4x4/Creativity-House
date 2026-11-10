'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminTestimonialDto } from '@/lib/admin/types';

export function TestimonialPreviewModal({
  open,
  testimonial,
  onOpenChange,
}: {
  open: boolean;
  testimonial: AdminTestimonialDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const embed = testimonial?.embed_url;
  const autoplaySrc = embed
    ? embed.includes('autoplay=')
      ? embed.replace(/autoplay=(false|true)/, 'autoplay=true')
      : `${embed}${embed.includes('?') ? '&' : '?'}autoplay=true`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {testimonial?.person_name_en || testimonial?.video_title || 'Preview'}
          </DialogTitle>
          <DialogDescription>
            {testimonial?.person_role_en || testimonial?.caption_en || 'Bunny video preview'}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          {autoplaySrc ? (
            <iframe
              title={testimonial?.video_title || 'Testimonial preview'}
              src={autoplaySrc}
              className="h-full w-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/70">
              No embed URL available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
