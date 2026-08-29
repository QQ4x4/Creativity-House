'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDuration } from '@/lib/student/types';

/** Fallback Bunny library when a lesson omits bunny_library_id. */
const DEFAULT_BUNNY_LIBRARY_ID = '739576';

/**
 * Lesson player — prefers Bunny Stream iframe when `bunnyVideoId` is set,
 * otherwise falls back to the custom HTML5 player (or an unavailable state).
 *
 * Sidebar lesson clicks change `lesson`; remounting via `key` keeps the
 * Bunny iframe / video source in sync with the active lesson.
 */
export default function LessonPlayer({ lesson, labels, isRTL = false }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const bunnyVideoId = lesson?.bunnyVideoId || '';
  const bunnyLibraryId = lesson?.bunnyLibraryId || DEFAULT_BUNNY_LIBRARY_ID;
  const videoUrl = lesson?.videoUrl || '';
  const useBunny = Boolean(bunnyVideoId);

  const bunnyEmbedUrl = useBunny
    ? `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}?autoplay=false&preload=true&responsive=true`
    : '';

  // New lesson → reset transport state and load the new source paused.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, [bunnyLibraryId, bunnyVideoId, videoUrl]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      const played = video.play();
      if (played?.catch) played.catch(() => setHasError(true));
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    containerRef.current?.requestFullscreen?.();
  }, []);

  const onKeyDown = (event) => {
    if (useBunny) return;
    // Let the control buttons handle their own Enter/Space.
    if (event.target !== containerRef.current) return;

    if (event.key === ' ' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      togglePlay();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekBy(isRTL ? -5 : 5);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekBy(isRTL ? 5 : -5);
    } else if (event.key.toLowerCase() === 'm') {
      event.preventDefault();
      toggleMute();
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFullscreen();
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showHtml5 = !useBunny && videoUrl && !hasError;
  const showUnavailable = !useBunny && (!videoUrl || hasError);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={lesson?.title || labels.videoPlayer}
      className="group relative w-full overflow-hidden rounded-3xl border border-purple-500/20 bg-black shadow-2xl shadow-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
    >
      <div className="relative aspect-video w-full bg-gradient-to-br from-plum-950 to-slate-950">
        {useBunny ? (
          <iframe
            key={`${bunnyLibraryId}-${bunnyVideoId}`}
            src={bunnyEmbedUrl}
            title={lesson?.title || labels.videoPlayer}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen={true}
            className="absolute top-0 left-0 h-full w-full border-0"
          />
        ) : showHtml5 ? (
          <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            playsInline
            preload="metadata"
            controlsList="nodownload"
            className="h-full w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              setDuration(Number.isFinite(video.duration) ? video.duration : 0);
              setIsMuted(video.muted);
              setVolume(video.volume);
            }}
            onEnded={() => setIsPlaying(false)}
            onError={() => setHasError(true)}
          >
            {labels.videoUnsupported}
          </video>
        ) : showUnavailable ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-semibold text-gray-200">{labels.videoUnavailable}</p>
            <p className="text-xs text-gray-400">{labels.videoUnavailableHint}</p>
          </div>
        ) : null}

        {/* Lesson title overlay — fades out while playing so it never blocks the frame */}
        {!useBunny ? (
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 sm:p-5 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'
            }`}
          >
            {lesson?.moduleName ? (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-300/90">
                {lesson.moduleName}
              </p>
            ) : null}
            <p className="mt-0.5 line-clamp-2 text-sm font-bold text-white sm:text-base">
              {lesson?.title}
            </p>
          </div>
        ) : null}

        {/* Center play affordance */}
        {!useBunny && !isPlaying && videoUrl && !hasError ? (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={labels.play}
            className="absolute inset-0 flex items-center justify-center transition-colors duration-300 hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60"
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-plum-600/80 shadow-[0_0_28px_rgba(212,175,55,0.45)] backdrop-blur-sm transition-transform duration-300 hover:scale-110">
              <Play className="ms-0.5 h-7 w-7 text-white" aria-hidden />
            </span>
          </button>
        ) : null}
      </div>

      {/* Custom control bar — HTML5 only; Bunny Stream provides its own chrome */}
      {!useBunny ? (
        <div className="border-t border-white/10 bg-[#120a1c]/95 px-3 py-3 backdrop-blur-md sm:px-4">
          <div className="relative flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              disabled={!duration}
              onChange={(event) => {
                const next = Number(event.target.value);
                setCurrentTime(next);
                if (videoRef.current) videoRef.current.currentTime = next;
              }}
              aria-label={labels.seek}
              dir="ltr"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-gold-400 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #d4af37 ${progressPercentage}%, rgba(255,255,255,0.15) ${progressPercentage}%)`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? labels.pause : labels.play}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={() => seekBy(-10)}
                aria-label={labels.rewind10}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-300 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? labels.unmute : labels.mute}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-300 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVolume(next);
                  setIsMuted(next === 0);
                  if (videoRef.current) {
                    videoRef.current.volume = next;
                    videoRef.current.muted = next === 0;
                  }
                }}
                aria-label={labels.volume}
                dir="ltr"
                className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-gold-400 sm:block"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium tabular-nums text-gray-300" dir="ltr">
                {formatDuration(currentTime)} / {formatDuration(duration || lesson?.durationSeconds)}
              </span>

              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-300 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
