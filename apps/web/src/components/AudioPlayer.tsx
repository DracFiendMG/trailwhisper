import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause, Headphones, Radio } from "lucide-react";

interface AudioPlayerProps {
  audioBase64?: string;
  scriptText: string;
  speciesName: string;
  isMock: boolean;
  onNextWaypoint?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBase64,
  scriptText,
  speciesName,
  isMock,
  onNextWaypoint,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Lockscreen MediaSession API for Screen-Zero pocket listening
  useEffect(() => {
    if ("mediaSession" in navigator && speciesName) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Whisper: ${speciesName} nearby`,
        artist: "TrailWhisper (Gemma 2 & ElevenLabs)",
        album: "Alpine Field Notes",
        artwork: [
          { src: "/favicon.svg", sizes: "96x96", type: "image/svg+xml" },
          { src: "/favicon.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => handlePlay());
      navigator.mediaSession.setActionHandler("pause", () => handlePause());
      if (onNextWaypoint) {
        navigator.mediaSession.setActionHandler("nexttrack", onNextWaypoint);
      }
    }
  }, [speciesName, onNextWaypoint]);

  // Handle auto-play when new audio arrives
  useEffect(() => {
    if (audioBase64 && audioRef.current) {
      audioRef.current.src = audioBase64;
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.log("Autoplay waiting for user gesture:", e.message);
        setIsPlaying(false);
      });
    } else if (isMock && scriptText && "speechSynthesis" in window) {
      // Browser Web Speech API fallback if ElevenLabs key is not yet set
      speakWithBrowserTTS(scriptText);
    }
  }, [audioBase64, scriptText, isMock]);

  const speakWithBrowserTTS = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.95;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (audioBase64 && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    } else if (scriptText && "speechSynthesis" in window) {
      speakWithBrowserTTS(scriptText);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    setIsPlaying(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="audio-controls-row">
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          className="audio-play-btn"
          onClick={isPlaying ? handlePause : handlePlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio whisper"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          <span>{isPlaying ? "Pause Whisper" : "Replay Audio"}</span>
        </button>

        <button
          onClick={toggleMute}
          style={{
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Toggle mute"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#6ee7b7" }}>
        {audioBase64 ? (
          <>
            <Radio size={14} color="#34d399" />
            <span>Streaming: <strong>ElevenLabs Turbo v2.5</strong></span>
          </>
        ) : (
          <>
            <Headphones size={14} color="#34d399" />
            <span>Mode: <strong>Local Speech Stream</strong></span>
          </>
        )}
      </div>
    </div>
  );
};
