'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronsUpDown, Clock, Loader2, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fetchBunnyVideos } from '@/lib/admin/api';
import type { BunnyVideo } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

interface BunnyVideoPickerProps {
  selectedGuid: string;
  onSelect: (video: BunnyVideo) => void;
  disabled?: boolean;
}

/**
 * Searchable Bunny Stream library picker.
 *
 * Search is sent to Laravel (which forwards it to Bunny) rather than filtered
 * client-side, so libraries larger than one page stay searchable. cmdk's own
 * filtering is disabled for the same reason.
 */
export function BunnyVideoPicker({ selectedGuid, onSelect, disabled }: BunnyVideoPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [videos, setVideos] = useState<BunnyVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  // Guards against an earlier request resolving after a later one.
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    const requestId = ++requestRef.current;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchBunnyVideos(debouncedSearch);
        if (cancelled || requestId !== requestRef.current) return;

        setIsConfigured(result.configured);
        setVideos(result.videos);

        if (!result.configured) {
          setError(result.message ?? 'Bunny Stream is not configured on this environment.');
        }
      } catch (caught) {
        if (cancelled || requestId !== requestRef.current) return;
        setVideos([]);
        setError(
          caught instanceof Error ? caught.message : 'Could not load the Bunny video library.'
        );
      } finally {
        if (!cancelled && requestId === requestRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  const selectedVideo = useMemo(
    () => videos.find((video) => video.guid === selectedGuid) ?? null,
    [videos, selectedGuid]
  );

  const triggerLabel = selectedVideo?.title || (selectedGuid ? selectedGuid : 'Search the library…');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-plum-500 dark:text-gold-400" aria-hidden />
            <span className={cn('truncate', !selectedGuid && 'text-gray-400')}>{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(30rem,calc(100vw-2rem))] p-0" align="start">
        {/* shouldFilter=false — the server already applied the search. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search Bunny videos…"
            value={search}
            onValueChange={setSearch}
          />

          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading library…
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 px-3 py-6 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {error}
                  {!isConfigured ? (
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      Set BUNNY_STREAM_API_KEY on the backend, or paste a video ID manually below.
                    </span>
                  ) : null}
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>No videos matched that search.</CommandEmpty>
                <CommandGroup heading={`${videos.length} video${videos.length === 1 ? '' : 's'}`}>
                  {videos.map((video) => (
                    <CommandItem
                      key={video.guid}
                      value={video.guid}
                      onSelect={() => {
                        onSelect(video);
                        setOpen(false);
                      }}
                    >
                      <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-white/10">
                        {video.thumbnail_url ? (
                          // Bunny CDN host is dynamic per pull zone.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Video className="h-4 w-4 text-gray-400" aria-hidden />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{video.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDuration(video.duration)}
                          {!video.is_ready ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              · still encoding
                            </span>
                          ) : null}
                        </p>
                      </div>

                      {video.guid === selectedGuid ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
