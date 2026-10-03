"use client";

import { Music, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./music-player.module.css";

type PlaybackStatus =
  "ready" | "loading" | "playing" | "paused" | "muted" | "error";
const PREFERENCE_KEY = "pigment-music-enabled-v1";

export default function MusicPlayer() {
  const [status, setStatus] = useState<PlaybackStatus>("ready");
  const toggleRef = useRef<(() => void) | null>(null);
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const hasError = status === "error";

  useEffect(() => {
    let isDisposed = false;
    let isEnabled = true;
    let hasStarted = false;
    let playbackStatus: PlaybackStatus = "ready";
    let requestId = 0;
    let context: AudioContext | null = null;
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let bufferPromise: Promise<AudioBuffer> | null = null;
    const abortController = new AbortController();

    try {
      isEnabled = localStorage.getItem(PREFERENCE_KEY) !== "false";
    } catch {}
    if (!isEnabled) playbackStatus = "muted";
    Promise.resolve().then(() => {
      if (!isDisposed) setStatus(playbackStatus);
    });

    function updateStatus(next: PlaybackStatus): void {
      playbackStatus = next;
      if (!isDisposed) setStatus(next);
    }

    function rememberPreference(): void {
      try {
        localStorage.setItem(PREFERENCE_KEY, String(isEnabled));
      } catch {}
    }

    function prepareContext(): AudioContext {
      if (context) return context;
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass)
        throw new Error("Audio isn’t supported in this browser.");
      context = new AudioContextClass();
      gain = context.createGain();
      gain.gain.value = 0.18;
      gain.connect(context.destination);
      context.addEventListener("statechange", handleContextState);
      return context;
    }

    function handleContextState(): void {
      if (isDisposed || playbackStatus === "loading" || !isEnabled) return;
      if (context?.state === "running" && source) updateStatus("playing");
      else if (hasStarted) updateStatus("paused");
    }

    function loadBuffer(audioContext: AudioContext): Promise<AudioBuffer> {
      if (bufferPromise) return bufferPromise;
      /*
        Fetch and decode only after a real interaction. A single decoded
        buffer loops in Web Audio without file-player gaps at the seam.
      */
      bufferPromise = fetch("/audio/childrens-march.wav", {
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Music couldn’t be loaded.");
          const bytes = await response.arrayBuffer();
          return audioContext.decodeAudioData(bytes);
        })
        .catch((reason) => {
          bufferPromise = null;
          throw reason;
        });
      return bufferPromise;
    }

    async function startMusic(): Promise<void> {
      if (
        isDisposed ||
        !isEnabled ||
        document.hidden ||
        playbackStatus === "loading" ||
        playbackStatus === "playing"
      )
        return;
      const request = ++requestId;
      updateStatus("loading");
      try {
        const audioContext = prepareContext();
        /*
          Resume immediately inside the trusted gesture, before network work.
          Later visibility resumes reuse this same context and looping source.
        */
        const resume = audioContext.resume();
        const [buffer] = await Promise.all([loadBuffer(audioContext), resume]);
        if (
          isDisposed ||
          request !== requestId ||
          !isEnabled ||
          document.hidden
        )
          return;
        if (audioContext.state !== "running") {
          updateStatus("paused");
          return;
        }
        if (!source) {
          source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.loopStart = 0;
          source.loopEnd = buffer.duration;
          source.connect(gain!);
          source.start();
          hasStarted = true;
        }
        updateStatus("playing");
      } catch {
        if (!isDisposed && request === requestId && isEnabled)
          updateStatus("error");
      }
    }

    function toggleMusic(): void {
      if (playbackStatus === "playing" || playbackStatus === "loading") {
        isEnabled = false;
        requestId++;
        rememberPreference();
        updateStatus("muted");
        void context?.suspend().catch(() => {});
      } else {
        isEnabled = true;
        rememberPreference();
        void startMusic();
      }
    }

    function handleInteraction(event: Event): void {
      if (
        !event.isTrusted ||
        (event.target instanceof Element &&
          event.target.closest("[data-music-toggle]"))
      )
        return;
      if (event instanceof KeyboardEvent && event.repeat) return;
      void startMusic();
    }

    function handleVisibility(): void {
      if (document.hidden) {
        requestId++;
        if (isEnabled) updateStatus("paused");
        void context?.suspend().catch(() => {});
      } else if (isEnabled && hasStarted) {
        void startMusic();
      }
    }

    toggleRef.current = toggleMusic;
    document.addEventListener("pointerdown", handleInteraction, {
      capture: true,
    });
    document.addEventListener("keydown", handleInteraction, { capture: true });
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      isDisposed = true;
      requestId++;
      toggleRef.current = null;
      abortController.abort();
      document.removeEventListener("pointerdown", handleInteraction, {
        capture: true,
      });
      document.removeEventListener("keydown", handleInteraction, {
        capture: true,
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      if (context) {
        context.removeEventListener("statechange", handleContextState);
        source?.stop();
        void context.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className={styles.player}>
      <button
        className={styles.toggle}
        data-music-toggle
        aria-label={
          isPlaying || isLoading
            ? "Mute music"
            : hasError
              ? "Retry music"
              : "Play music"
        }
        aria-pressed={isPlaying}
        onClick={() => toggleRef.current?.()}
        title={
          hasError ? "Music couldn’t load. Tap to retry." : "Background music"
        }
      >
        {isPlaying || isLoading ? (
          <Music aria-hidden="true" size={22} />
        ) : (
          <VolumeX aria-hidden="true" size={22} />
        )}
        <span>
          {isLoading ? "Music…" : isPlaying ? "Music on" : "Music off"}
        </span>
      </button>
      <span className={styles.status} role="status">
        {hasError
          ? "Music couldn’t load. Tap to retry."
          : isLoading
            ? "Loading background music"
            : ""}
      </span>
    </div>
  );
}
