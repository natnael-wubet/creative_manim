import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  DashboardSpeed01Icon,
  ExternalLinkIcon,
  FullscreenIcon,
  Loading03Icon,
  PauseIcon,
  PictureInPicture01Icon,
  PlayIcon,
  ReloadIcon,
  RepeatIcon,
  RepeatOffIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/base-ui/button";
import { projectApi } from "@/lib/project";

const RATES = [0.25, 0.5, 1, 1.5, 2] as const;
const SEEK_STEP = 5;
const IDLE_HIDE_MS = 2600;

const STORAGE_KEY = "manimPlayer";

interface Preferences {
  volume: number;
  muted: boolean;
  rate: number;
  loop: boolean;
}

function loadPreferences(): Preferences {
  const fallback: Preferences = { volume: 1, muted: false, rate: 1, loop: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<Preferences>;
    return {
      volume: typeof saved.volume === "number" ? saved.volume : fallback.volume,
      muted: typeof saved.muted === "boolean" ? saved.muted : fallback.muted,
      rate: RATES.includes(saved.rate as (typeof RATES)[number])
        ? (saved.rate as number)
        : fallback.rate,
      loop: typeof saved.loop === "boolean" ? saved.loop : fallback.loop,
    };
  } catch {
    return fallback;
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

const MEDIA_ERRORS: Record<number, string> = {
  1: "Loading the video was aborted.",
  2: "The network dropped while loading the video.",
  3: "The video file is corrupt or uses an unsupported codec.",
  4: "The video could not be loaded.",
};

interface VideoPlayerProps {
  /** Absolute path to a rendered file. */
  path: string;
  onReveal: (path: string) => void;
}

function VideoPlayer({ path, onReveal }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const dragging = useRef(false);

  const [src, setSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [rateOpen, setRateOpen] = useState(false);

  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  // The backend mints a fresh token per call, so re-rendering reloads the source.
  useEffect(() => {
    let active = true;
    setSrc(null);
    setLoadError(null);
    setMediaError(null);
    setRetry(0);

    projectApi
      .media(path)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, [path, retry]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = prefs.volume;
    video.muted = prefs.muted;
    video.playbackRate = prefs.rate;
    video.loop = prefs.loop;
  }, [prefs, src]);

  const savePrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // A blocked storage quota only costs persistence, not playback.
      }
      return next;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setMediaError(4));
    else video.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clamp(video.currentTime + delta, 0, duration || video.duration || 0);
  }, [duration]);

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = clamp(seconds, 0, duration || video.duration || 0);
      setTime(video.currentTime);
    },
    [duration],
  );

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.requestFullscreen().catch(() => undefined);
  }, []);

  const togglePictureInPicture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void video.requestPictureInPicture().catch(() => undefined);
  }, []);

  // Controls fade out during playback, but never while paused, focused, or while
  // the pointer is somewhere they need to be.
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, IDLE_HIDE_MS);
  }, []);

  useEffect(() => {
    revealControls();
    return () => window.clearTimeout(hideTimer.current);
  }, [revealControls, playing]);

  useEffect(() => {
    const onFullscreen = () => revealControls();
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, [revealControls]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Leave the Ace editor and any form field alone.
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (target?.isContentEditable) return;

    const video = videoRef.current;
    if (!video) return;

    switch (event.key) {
      case " ":
      case "k":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekBy(-SEEK_STEP);
        break;
      case "ArrowRight":
        event.preventDefault();
        seekBy(SEEK_STEP);
        break;
      case "ArrowUp":
        event.preventDefault();
        savePrefs({ volume: clamp(video.volume + 0.1, 0, 1), muted: false });
        break;
      case "ArrowDown":
        event.preventDefault();
        savePrefs({ volume: clamp(video.volume - 0.1, 0, 1) });
        break;
      case "m":
        savePrefs({ muted: !prefs.muted });
        break;
      case "f":
        toggleFullscreen();
        break;
      case "i":
        togglePictureInPicture();
        break;
      case "Home":
        event.preventDefault();
        seekTo(0);
        break;
      case "End":
        event.preventDefault();
        seekTo(duration);
        break;
      default:
        if (/^[0-9]$/.test(event.key)) {
          event.preventDefault();
          seekTo((Number(event.key) / 10) * (duration || 0));
        }
    }
  };

  const timeFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track || !duration) return 0;
    const bounds = track.getBoundingClientRect();
    return clamp((clientX - bounds.left) / bounds.width, 0, 1) * duration;
  };

  const onTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    setScrub(timeFromPointer(event.clientX));
  };

  const onTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const at = timeFromPointer(event.clientX);
    setHover(at);
    if (dragging.current) setScrub(at);
  };

  const onTrackPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    seekTo(scrub ?? timeFromPointer(event.clientX));
    setScrub(null);
  };

  const onTrackKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      seekBy(-SEEK_STEP);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      seekBy(SEEK_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      seekTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekTo(duration);
    }
  };

  if (loadError || mediaError) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <HugeiconsIcon icon={Alert02Icon} className="size-6 text-destructive" />
        <p className="max-w-sm text-sm text-muted-foreground">
          {loadError ?? MEDIA_ERRORS[mediaError ?? 4]}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadError(null);
              setMediaError(null);
              setRetry((n) => n + 1);
            }}
          >
            <HugeiconsIcon icon={ReloadIcon} className="size-4" />
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onReveal(path)}>
            <HugeiconsIcon icon={ExternalLinkIcon} className="size-4" />
            Reveal file
          </Button>
        </div>
      </div>
    );
  }

  const progress = duration ? ((scrub ?? time) / duration) * 100 : 0;
  const bufferProgress = duration ? (buffered / duration) * 100 : 0;
  const shown = scrub ?? time;
  // Only fade the chrome while playback is running; a paused or ended frame
  // must keep its controls on screen or there is no way to press play again.
  const idle = playing && !controlsVisible;

  return (
    <div
      ref={frameRef}
      role="group"
      aria-label="Render preview"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={revealControls}
      onFocus={revealControls}
      onDoubleClick={toggleFullscreen}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
        setHover(null);
      }}
      className="group relative aspect-video w-full select-none overflow-hidden rounded-lg bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <video
        key={src ?? path}
        ref={videoRef}
        src={src ?? undefined}
        preload="metadata"
        playsInline
        className="size-full object-contain"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => {
          if (!dragging.current) setTime(event.currentTarget.currentTime);
          const ranges = event.currentTarget.buffered;
          if (ranges.length) setBuffered(ranges.end(ranges.length - 1));
        }}
        onProgress={(event) => {
          const ranges = event.currentTarget.buffered;
          if (ranges.length) setBuffered(ranges.end(ranges.length - 1));
        }}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onEnded={() => setEnded(true)}
        onError={() => setMediaError(videoRef.current?.error?.code ?? 4)}
      />

      {waiting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <HugeiconsIcon icon={Loading03Icon} className="size-7 animate-spin text-white/80" />
        </div>
      )}

      {!playing && !waiting && (
        <button
          type="button"
          aria-label={ended ? "Replay the video" : "Play the video"}
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition-transform hover:scale-105">
            <HugeiconsIcon
              icon={PlayIcon}
              className="size-6 translate-x-0.5"
            />
          </span>
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-200 ${
          idle ? "opacity-0" : "opacity-100"
        } group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        <div
          ref={trackRef}
          role="slider"
          tabIndex={-1}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(shown)}
          aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onTrackKeyDown}
          className="group/track relative flex h-4 cursor-pointer touch-none items-center"
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/track:h-2.5">
            <div
              className="h-full rounded-full bg-white/30"
              style={{ width: `${Math.min(bufferProgress, 100)}%` }}
            />
          </div>
          <div
            className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-white transition-all group-hover/track:h-2.5"
            style={{ width: `${clamp(progress, 0, 100)}%` }}
          />
          <div
            className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-white shadow transition-transform group-hover/track:scale-125"
            style={{ left: `${clamp(progress, 0, 100)}%` }}
          />

          {hover !== null && duration > 0 && (
            <span
              className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white"
              style={{ left: `${clamp((hover / duration) * 100, 2, 98)}%` }}
            >
              {formatTime(hover)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-white">
          <PlayerButton
            label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
            icon={playing ? PauseIcon : PlayIcon}
          />
          <PlayerButton
            label={`Back ${SEEK_STEP} seconds`}
            onClick={() => seekBy(-SEEK_STEP)}
            icon={ArrowLeft01Icon}
          />
          <PlayerButton
            label={`Forward ${SEEK_STEP} seconds`}
            onClick={() => seekBy(SEEK_STEP)}
            icon={ArrowRight01Icon}
          />

          <div className="group/volume flex items-center">
            <PlayerButton
              label={prefs.muted ? "Unmute" : "Mute"}
              onClick={() => savePrefs({ muted: !prefs.muted })}
              icon={prefs.muted || prefs.volume === 0 ? VolumeMuteIcon : VolumeHighIcon}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={prefs.muted ? 0 : prefs.volume}
              aria-label="Volume"
              onChange={(event) =>
                savePrefs({ volume: Number(event.target.value), muted: false })
              }
              className="h-1 w-0 cursor-pointer accent-white opacity-0 transition-all duration-200 group-hover/volume:mr-2 group-hover/volume:w-16 group-hover/volume:opacity-100 focus:mr-2 focus:w-16 focus:opacity-100"
            />
          </div>

          <span className="ml-1 font-mono text-[11px] tabular-nums text-white/85">
            {formatTime(shown)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <PlayerButton
                label="Playback speed"
                aria-pressed={rateOpen}
                onClick={() => setRateOpen((open) => !open)}
                icon={DashboardSpeed01Icon}
                trailing={`${prefs.rate}×`}
              />
              {rateOpen && (
                <div
                  role="menu"
                  aria-label="Playback speed"
                  onPointerLeave={() => setRateOpen(false)}
                  className="absolute bottom-10 right-0 z-30 w-28 overflow-hidden rounded-lg border border-white/15 bg-black/85 p-1 shadow-xl backdrop-blur"
                >
                  {RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      role="menuitemradio"
                      aria-checked={prefs.rate === rate}
                      onClick={() => {
                        savePrefs({ rate });
                        setRateOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                        prefs.rate === rate ? "text-white" : "text-white/70"
                      }`}
                    >
                      <span>{rate}×</span>
                      {prefs.rate === rate && <span aria-hidden>•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <PlayerButton
              label={prefs.loop ? "Disable loop" : "Loop the video"}
              aria-pressed={prefs.loop}
              onClick={() => savePrefs({ loop: !prefs.loop })}
              icon={prefs.loop ? RepeatIcon : RepeatOffIcon}
            />
            <PlayerButton
              label="Picture in picture"
              onClick={togglePictureInPicture}
              icon={PictureInPicture01Icon}
            />
            <PlayerButton
              label="Reveal the file"
              onClick={() => onReveal(path)}
              icon={ExternalLinkIcon}
            />
            <PlayerButton label="Fullscreen" onClick={toggleFullscreen} icon={FullscreenIcon} />
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute left-3 top-3 rounded bg-black/55 px-2 py-1 font-mono text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
        space play · ←/→ seek · ↑/↓ volume · m mute · f fullscreen · 0-9 jump
      </p>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

interface PlayerButtonProps {
  label: string;
  onClick: () => void;
  /** The tuple shape every `@hugeicons/core-free-icons` icon is declared with. */
  icon: readonly (readonly [string, { readonly [key: string]: string | number }])[];
  trailing?: string;
  "aria-pressed"?: boolean;
}

function PlayerButton({
  label,
  onClick,
  icon: Icon,
  trailing,
  "aria-pressed": ariaPressed,
}: PlayerButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={ariaPressed}
      onClick={onClick}
      className="flex h-8 items-center gap-1 rounded-md px-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
    >
      <HugeiconsIcon icon={Icon} className="size-4" />
      {trailing && <span className="font-mono text-[10px] tabular-nums">{trailing}</span>}
    </button>
  );
}

export default VideoPlayer;
