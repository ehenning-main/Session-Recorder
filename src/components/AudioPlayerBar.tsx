import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Layers,
  Bookmark as BookmarkIcon,
} from 'lucide-react';
import { AudioSegment, Bookmark } from '../types/recorder';
import { formatSeconds } from '../utils/formatters';

interface AudioPlayerBarProps {
  currentSegment: AudioSegment | null;
  segments: AudioSegment[];
  currentSegmentIndex: number;
  onSelectSegment: (index: number) => void;
  bookmarks: Bookmark[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (timeSeconds: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  currentSegment,
  segments,
  currentSegmentIndex,
  onSelectSegment,
  bookmarks,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  playbackRate,
  onChangePlaybackRate,
}) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Segment relative bookmarks
  const segmentStartTime = currentSegment?.startTime || 0;
  const segmentEndTime = currentSegment?.endTime || duration;

  const relevantBookmarks = bookmarks.filter((b) => {
    return b.timestamp >= segmentStartTime && b.timestamp <= segmentEndTime;
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md px-6 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Scrubber bar with bookmark flags */}
        <div
          ref={scrubberRef}
          onClick={handleScrubberClick}
          className="relative w-full h-3 bg-slate-900 rounded-full cursor-pointer overflow-visible group"
        >
          {/* Progress bar */}
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full relative transition-all"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber handle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>

          {/* Bookmark flags along the scrubber */}
          {relevantBookmarks.map((b) => {
            const segDuration = Math.max(1, segmentEndTime - segmentStartTime);
            const pos = Math.max(0, Math.min(100, ((b.timestamp - segmentStartTime) / segDuration) * 100));
            return (
              <div
                key={b.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(b.timestamp - segmentStartTime);
                }}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-300 border border-slate-950 rounded-xs hover:scale-125 transition-transform cursor-pointer"
                style={{ left: `${pos}%` }}
                title={`[${b.formattedTime}] ${b.note}`}
              />
            );
          })}
        </div>

        {/* Transport controls row */}
        <div className="flex items-center justify-between text-xs">
          {/* Left: Timing & Segment selector */}
          <div className="flex items-center gap-3">
            {segments.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={currentSegmentIndex}
                  onChange={(e) => onSelectSegment(parseInt(e.target.value, 10))}
                  className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                >
                  {segments.map((seg, idx) => (
                    <option key={seg.id} value={idx} className="bg-slate-950 text-slate-200">
                      Part #{idx + 1} ({formatSeconds(seg.duration)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="font-mono text-slate-300 tabular-nums">
              <span className="text-amber-400 font-semibold">{formatSeconds(currentTime)}</span>
              <span className="text-slate-600"> / </span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Jump back 5s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Jump forward 5s"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Playback Speed & Volume */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              {[1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onChangePlaybackRate(rate)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    playbackRate === rate
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
