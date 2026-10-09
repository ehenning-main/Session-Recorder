import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Play,
  Pause,
  Filter,
  Search,
  Clock,
  User,
  MessageSquare,
  Bookmark as BookmarkIcon,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { AudioSegment, Bookmark, DiarizedTurn, Speaker } from '../types/recorder';
import { formatSeconds } from '../utils/formatters';

interface DiarizationTimelineProps {
  segments: AudioSegment[];
  roster: Speaker[];
  bookmarks: Bookmark[];
  onPlayAtTime: (timestamp: number) => void;
  onDiarizeSegment: (segmentIndex: number) => Promise<void>;
  diarizingSegmentIndex: number | null;
  currentlyPlayingTime: number;
  isPlaying: boolean;
  totalSessionSeconds: number;
}

export const DiarizationTimeline: React.FC<DiarizationTimelineProps> = ({
  segments,
  roster,
  bookmarks,
  onPlayAtTime,
  onDiarizeSegment,
  diarizingSegmentIndex,
  currentlyPlayingTime,
  isPlaying,
  totalSessionSeconds,
}) => {
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<string>('all');
  const [showOocOnly, setShowOocOnly] = useState(false);

  // Aggregate all diarized turns from segments
  const currentSegment = segments[selectedSegmentIdx];
  const allTurns: DiarizedTurn[] = [];
  segments.forEach((seg) => {
    if (seg.diarizedTurns) {
      allTurns.push(...seg.diarizedTurns);
    }
  });

  const displayedTurns = (currentSegment?.diarizedTurns || allTurns).filter((turn) => {
    if (selectedSpeakerFilter !== 'all' && turn.speakerId !== selectedSpeakerFilter) {
      return false;
    }
    if (showOocOnly && !turn.isOutOfCharacter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = turn.text.toLowerCase().includes(q);
      const matchSpeaker = turn.speakerName.toLowerCase().includes(q);
      const matchRole = turn.role.toLowerCase().includes(q);
      return matchText || matchSpeaker || matchRole;
    }
    return true;
  });

  // Calculate speaking distribution statistics
  const speakerStats: Record<string, { seconds: number; turns: number; name: string; color: string }> = {};
  roster.forEach((r) => {
    speakerStats[r.id] = { seconds: 0, turns: 0, name: r.name, color: r.color };
  });

  allTurns.forEach((t) => {
    const spk = speakerStats[t.speakerId] || speakerStats['dm'];
    if (spk) {
      spk.seconds += Math.max(1, t.endTime - t.startTime);
      spk.turns += 1;
    }
  });

  const totalDiarizedSec = Object.values(speakerStats).reduce((a, b) => a + b.seconds, 0) || 1;

  const getSpeakerColor = (speakerId: string) => {
    const found = roster.find((r) => r.id === speakerId);
    return found?.color || '#f59e0b';
  };

  return (
    <div className="space-y-6">
      {/* Header and Diarization Control */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-serif font-bold text-amber-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            Speaker Diarization & Interactive Transcript
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Automatic multi-speaker separation powered by Gemini AI. Distinguishes Dungeon Master narration, player character in-game dialogue, and out-of-character (OOC) rules chatter.
          </p>
        </div>

        {segments.length > 0 && (
          <button
            onClick={() => onDiarizeSegment(selectedSegmentIdx)}
            disabled={diarizingSegmentIndex !== null || !currentSegment?.blobSize}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-md ${
              diarizingSegmentIndex === selectedSegmentIdx
                ? 'bg-amber-600/50 text-amber-200 cursor-wait'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer hover:scale-105 active:scale-95'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {diarizingSegmentIndex === selectedSegmentIdx
                ? 'AI Diarizing Audio...'
                : currentSegment?.diarizedTurns?.length
                ? 'Re-Run Diarization'
                : `AI Diarize Segment #${selectedSegmentIdx + 1}`}
            </span>
          </button>
        )}
      </div>

      {/* Segment Selector & Speaking Time Distribution */}
      {segments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Segment Selector Bar */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Session Audio Segments
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {segments.length} segment{segments.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {segments.map((seg, idx) => (
                <button
                  key={seg.id}
                  onClick={() => setSelectedSegmentIdx(idx)}
                  className={`flex-1 min-w-[130px] p-2.5 rounded-lg border text-left transition-all ${
                    selectedSegmentIdx === idx
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Part {idx + 1}</span>
                    {seg.diarizedTurns?.length ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {formatSeconds(seg.startTime)} - {formatSeconds(seg.endTime)}
                  </div>
                </button>
              ))}
            </div>

            {currentSegment?.segmentSummary && (
              <div className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg">
                <strong className="text-amber-400">Segment Summary: </strong>
                {currentSegment.segmentSummary}
              </div>
            )}
          </div>

          {/* Table Airtime / Speaker Balance Chart */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-amber-400" />
                Airtime Balance
              </span>
              <span className="text-[10px] text-slate-400">Total talk %</span>
            </div>

            {/* Segmented Horizontal Airtime Bar */}
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              {Object.entries(speakerStats).map(([id, stat]) => {
                const pct = (stat.seconds / totalDiarizedSec) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={id}
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stat.color,
                    }}
                    title={`${stat.name}: ${pct.toFixed(0)}%`}
                  />
                );
              })}
            </div>

            {/* Speaker Legenda */}
            <div className="space-y-1 pt-1 max-h-24 overflow-y-auto pr-1">
              {Object.entries(speakerStats).map(([id, stat]) => {
                const pct = Math.round((stat.seconds / totalDiarizedSec) * 100);
                return (
                  <div key={id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span className="text-slate-300 truncate max-w-[100px]">{stat.name}</span>
                    </div>
                    <span className="font-mono text-slate-400 tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dialogue, spells, rolls..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={selectedSpeakerFilter}
            onChange={(e) => setSelectedSpeakerFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">All Speakers</option>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.characterName})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowOocOnly(!showOocOnly)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              showOocOnly
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showOocOnly ? 'Showing OOC Only' : 'Filter OOC Banter'}
          </button>
        </div>
      </div>

      {/* Transcript Turns List */}
      <div className="space-y-3">
        {displayedTurns.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-10 text-center space-y-3">
            <Volume2 className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">
              {segments.length === 0
                ? 'No audio segments recorded yet'
                : 'No diarized turns in this segment yet'}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {segments.length === 0
                ? 'Start recording in the Recorder tab to capture session audio.'
                : 'Click "AI Diarize Segment" above to transcribe and separate dialogue turns with Gemini AI.'}
            </p>
          </div>
        ) : (
          displayedTurns.map((turn) => {
            const isPlayingThisTurn =
              isPlaying &&
              currentlyPlayingTime >= turn.startTime &&
              currentlyPlayingTime <= turn.endTime;
            const speakerColor = getSpeakerColor(turn.speakerId);

            return (
              <div
                key={turn.id}
                className={`bg-slate-900/60 border rounded-xl p-4 transition-all relative group ${
                  isPlayingThisTurn
                    ? 'border-amber-400 bg-slate-900/90 shadow-md ring-1 ring-amber-400/40'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Speaker Avatar Icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shrink-0 mt-0.5"
                      style={{ backgroundColor: speakerColor }}
                    >
                      {turn.speakerName.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      {/* Name & Metadata */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-semibold text-slate-100">{turn.speakerName}</span>
                        <span
                          className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${speakerColor}25`,
                            color: speakerColor,
                          }}
                        >
                          {turn.role}
                        </span>

                        {turn.isOutOfCharacter && (
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.5 rounded">
                            OOC Banter
                          </span>
                        )}

                        {turn.emotion && (
                          <span className="text-[10px] text-slate-400 italic">
                            ({turn.emotion})
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {formatSeconds(turn.startTime)} – {formatSeconds(turn.endTime)}
                        </span>
                      </div>

                      {/* Transcribed Text */}
                      <p className="text-sm text-slate-200 leading-relaxed font-sans pt-1">
                        {turn.text}
                      </p>
                    </div>
                  </div>

                  {/* Play snippet button */}
                  <button
                    onClick={() => onPlayAtTime(turn.startTime)}
                    className="p-2 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Jump to this turn in audio"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
