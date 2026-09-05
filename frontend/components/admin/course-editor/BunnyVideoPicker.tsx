'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  FolderOpen,
  Loader2,
  Search,
  Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fetchBunnyVideos } from '@/lib/admin/api';
import type { BunnyCollection, BunnyVideo } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

const ALL_TAB = '__all__';
const UNCATEGORIZED_TAB = '__none__';

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
 * Large-icons media library for Bunny Stream.
 *
 * Opens as its own dialog (not a cramped popover) with collection tabs and a
 * scrollable card grid. Search filters the loaded grid client-side. Wheel
 * scrolling is confined to the grid via `overscroll-contain` so the outer
 * lesson modal does not steal the wheel events.
 */
export function BunnyVideoPicker({ selectedGuid, onSelect, disabled }: BunnyVideoPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [videos, setVideos] = useState<BunnyVideo[]>([]);
  const [collections, setCollections] = useState<BunnyCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  const requestRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const requestId = ++requestRef.current;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load the full library once; tabs + search filter locally.
        const result = await fetchBunnyVideos('');
        if (cancelled || requestId !== requestRef.current) return;

        setIsConfigured(result.configured);
        setVideos(result.videos);
        setCollections(result.collections);

        if (!result.configured) {
          setError(result.message ?? 'Bunny Stream is not configured on this environment.');
        }
      } catch (caught) {
        if (cancelled || requestId !== requestRef.current) return;
        setVideos([]);
        setCollections([]);
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
  }, [open]);

  // Reset filters when the library closes so the next open starts clean.
  useEffect(() => {
    if (open) return;
    setSearch('');
    setActiveTab(ALL_TAB);
  }, [open]);

  const selectedVideo = useMemo(
    () => videos.find((video) => video.guid === selectedGuid) ?? null,
    [videos, selectedGuid]
  );

  const hasUncategorized = useMemo(
    () => videos.some((video) => !video.collection_id),
    [videos]
  );

  const filteredVideos = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return videos.filter((video) => {
      if (activeTab === UNCATEGORIZED_TAB && video.collection_id) return false;
      if (
        activeTab !== ALL_TAB &&
        activeTab !== UNCATEGORIZED_TAB &&
        video.collection_id !== activeTab
      ) {
        return false;
      }

      if (!needle) return true;
      return video.title.toLowerCase().includes(needle);
    });
  }, [videos, activeTab, search]);

  const triggerLabel =
    selectedVideo?.title || (selectedGuid ? selectedGuid : 'Browse Bunny library…');

  const handlePick = (video: BunnyVideo) => {
    onSelect(video);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="w-full justify-between font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Video className="h-4 w-4 shrink-0 text-plum-500 dark:text-gold-400" aria-hidden />
          <span className={cn('truncate', !selectedGuid && 'text-gray-400')}>{triggerLabel}</span>
        </span>
        <FolderOpen className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* overflow-hidden: scroll lives only on the grid below, not the shell. */}
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <div className="shrink-0 space-y-4 border-b border-gray-200 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>Bunny media library</DialogTitle>
              <DialogDescription>
                Pick a video to fill the lesson title and duration. Use collection tabs to browse.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter videos by title…"
                className="ps-9"
                aria-label="Filter videos"
                autoFocus
              />
            </div>

            <div
              role="tablist"
              aria-label="Collections"
              className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <CollectionTab
                active={activeTab === ALL_TAB}
                onClick={() => setActiveTab(ALL_TAB)}
                label="All"
                count={videos.length}
              />
              {collections.map((collection) => (
                <CollectionTab
                  key={collection.guid}
                  active={activeTab === collection.guid}
                  onClick={() => setActiveTab(collection.guid)}
                  label={collection.name}
                  count={
                    videos.filter((video) => video.collection_id === collection.guid).length ||
                    collection.video_count
                  }
                />
              ))}
              {hasUncategorized ? (
                <CollectionTab
                  active={activeTab === UNCATEGORIZED_TAB}
                  onClick={() => setActiveTab(UNCATEGORIZED_TAB)}
                  label="Uncategorized"
                  count={videos.filter((video) => !video.collection_id).length}
                />
              ) : null}
            </div>
          </div>

          {/* CRITICAL: overscroll-contain keeps the mouse wheel on this pane. */}
          <div className="overflow-y-auto overscroll-contain max-h-[60vh] px-6 pb-4 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Loading library…
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {error}
                  {!isConfigured ? (
                    <span className="mt-1 block text-xs opacity-80">
                      Set BUNNY_STREAM_API_KEY on the backend, or paste a video ID manually.
                    </span>
                  ) : null}
                </span>
              </div>
            ) : filteredVideos.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                No videos matched.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {filteredVideos.map((video) => {
                  const isSelected = video.guid === selectedGuid;

                  return (
                    <button
                      key={video.guid}
                      type="button"
                      onClick={() => handlePick(video)}
                      className={cn(
                        'group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-start transition-all duration-200',
                        'hover:border-plum-400 hover:shadow-md dark:bg-white/[0.03]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                        isSelected
                          ? 'border-plum-500 ring-2 ring-plum-400/40 dark:border-gold-400 dark:ring-gold-400/30'
                          : 'border-gray-200 dark:border-white/10'
                      )}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-white/10">
                        {video.thumbnail_url ? (
                          // Bunny CDN host is dynamic per pull zone.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" aria-hidden />
                          </div>
                        )}

                        <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDuration(video.duration)}
                        </span>

                        {isSelected ? (
                          <span className="absolute start-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-plum-600 text-white dark:bg-gold-500 dark:text-gray-900">
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                          {video.title}
                        </p>
                        {!video.is_ready ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Still encoding</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CollectionTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
        active
          ? 'border-plum-500 bg-plum-50 text-plum-800 dark:border-gold-400/50 dark:bg-gold-400/15 dark:text-gold-200'
          : 'border-gray-200 bg-white text-gray-600 hover:border-plum-300 hover:text-plum-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-gold-400/30 dark:hover:text-gold-200'
      )}
    >
      <span className="max-w-[12rem] truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          active
            ? 'bg-plum-200/80 text-plum-900 dark:bg-gold-400/25 dark:text-gold-100'
            : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
        )}
      >
        {count}
      </span>
    </button>
  );
}
