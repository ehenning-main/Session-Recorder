import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Bookmark as BookmarkIcon,
  Swords,
  Dice5,
  Scroll,
  UserCheck,
  Gem,
  Scale,
  Smile,
  Clock,
  HardDrive,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Bookmark, BookmarkCategory, Speaker, AudioSegment } from '../types/recorder';
import { Visualizer } from './Visualizer';
import { formatSeconds, formatBytes } from '../utils/formatters';

interface RecordingConsoleProps {
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  currentSegmentIndex: number;
  currentSegmentSeconds: number;
  segmentDurationMinutes: number;
  segments: AudioSegment[];
  roster: Speaker[];
  bookmarks: Bookmark[];
  activeSpeakerId: string | null;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onAddBookmark: (category: BookmarkCategory, note: string, speakerId?: string) => void;
  onSelectSpeaker: (speakerId: string) => void;
  rawAnalyser: AnalyserNode | null;
  processedAnalyser: AnalyserNode | null;
  rawDb: number;
  processedDb: number;
  isGateOpen: boolean;
  storageUsage: { usageMb: number; quotaMb: number; percentUsed: number; estimatedHoursRemaining: number };
  campaignName: string;
  sessionNumber: number;
  sessionTitle: string;
  onEditSessionInfo: () => void;
}

export const RecordingConsole: React.FC<RecordingConsoleProps> = ({
  isRecording,
  isPaused,
  elapsedSeconds,
  currentSegmentIndex,
  currentSegmentSeconds,
  segmentDurationMinutes,
  segments,
  roster,
  bookmarks,
  activeSpeakerId,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onAddBookmark,
  onSelectSpeaker,
  rawAnalyser,
  processedAnalyser,
  rawDb,
  processedDb,
  isGateOpen,
  storageUsage,
  campaignName,
  sessionNumber,
  sessionTitle,
  onEditSessionInfo,
}) => {
  const [quickNote, setQuickNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BookmarkCategory>('general');

  // Keyboard hotkeys for fast live bookmarking during TTRPG combat or roleplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onAddBookmark('combat', 'Combat initiated / Tactical encounter', activeSpeakerId || undefined);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onAddBookmark('critical_roll', 'Critical dice roll / Key check', activeSpeakerId || undefined);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onAddBookmark('lore', 'Lore discovery / Plot clue', activeSpeakerId || undefined);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onAddBookmark('npc', 'New NPC interaction', activeSpeakerId || undefined);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onAddBookmark('loot', 'Loot acquired / Treasure found', activeSpeakerId || undefined);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onAddBookmark('general', 'Timestamp bookmark', activeSpeakerId || undefined);
      } else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (roster[idx]) {
          e.preventDefault();
          onSelectSpeaker(roster[idx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [roster, activeSpeakerId, onAddBookmark, onSelectSpeaker]);

  const handleManualAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const noteText = quickNote.trim() || getDefaultCategoryName(selectedCategory);
    onAddBookmark(selectedCategory, noteText, activeSpeakerId || undefined);
    setQuickNote('');
  };

  const getDefaultCategoryName = (cat: BookmarkCategory) => {
    switch (cat) {
      case 'combat':
        return 'Combat Encounter / Initiative';
      case 'critical_roll':
        return 'Critical Roll (Nat 20 / Nat 1)';
      case 'lore':
        return 'Lore Reveal / Narrative Clue';
      case 'npc':
        return 'NPC Dialogue & Interaction';
      case 'loot':
        return 'Loot / Treasure Claimed';
      case 'rule':
        return 'Rule Clarification / DM Ruling';
      case 'funny':
        return 'Memorable Quote / Table Banter';
      default:
        return 'Session Bookmark';
    }
  };

  const getCategoryIcon = (cat: BookmarkCategory) => {
    switch (cat) {
      case 'combat':
        return <Swords className="w-3.5 h-3.5 text-rose-400" />;
      case 'critical_roll':
        return <Dice5 className="w-3.5 h-3.5 text-amber-400" />;
      case 'lore':
        return <Scroll className="w-3.5 h-3.5 text-cyan-400" />;
      case 'npc':
        return <UserCheck className="w-3.5 h-3.5 text-purple-400" />;
      case 'loot':
        return <Gem className="w-3.5 h-3.5 text-emerald-400" />;
      case 'rule':
        return <Scale className="w-3.5 h-3.5 text-blue-400" />;
      case 'funny':
        return <Smile className="w-3.5 h-3.5 text-yellow-300" />;
      default:
        return <BookmarkIcon className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const currentSpeaker = roster.find((r) => r.id === activeSpeakerId);

  return (
    <div className="space-y-6">
      {/* Top Session Status Deck */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Campaign & Session Meta */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                {campaignName} · Session #{sessionNumber}
              </span>
              <button
                onClick={onEditSessionInfo}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-slate-600 cursor-pointer"
              >
                edit
              </button>
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-100">
              {sessionTitle || 'The Whispering Tombs'}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Session Elapsed:{' '}
                <strong className="text-slate-200 tabular-nums font-semibold">
                  {formatSeconds(elapsedSeconds)}
                </strong>
              </span>

              {segmentDurationMinutes > 0 && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  Segment #{currentSegmentIndex + 1}:{' '}
                  <span className="text-slate-300 tabular-nums">
                    {formatSeconds(currentSegmentSeconds)} / {segmentDurationMinutes}:00
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Master Transport Controls */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                onClick={onStartRecording}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                <span className="tracking-wide">Start TTRPG Recording</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                {isPaused ? (
                  <button
                    onClick={onResumeRecording}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={onPauseRecording}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={onStopRecording}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-200 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4 text-rose-400" />
                  <span>End Session</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Long Session Resilience Telemetry */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-slate-500 text-[11px]">Storage Engine</div>
            <div className="font-semibold text-slate-300 flex items-center gap-1.5 mt-0.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>IndexedDB Safe Ring</span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-slate-500 text-[11px]">Completed Segments</div>
            <div className="font-semibold text-slate-300 font-mono mt-0.5 tabular-nums">
              {segments.length} segment{segments.length === 1 ? '' : 's'} saved
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-slate-500 text-[11px]">Session Audio Size</div>
            <div className="font-semibold text-slate-300 font-mono mt-0.5 tabular-nums">
              {formatBytes(segments.reduce((acc, s) => acc + s.blobSize, 0))}
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-slate-500 text-[11px]">Est. Remaining Disk</div>
            <div className="font-semibold text-amber-400 font-mono mt-0.5 tabular-nums">
              ~{storageUsage.estimatedHoursRemaining}h capacity
            </div>
          </div>
        </div>
      </div>

      {/* Acoustic Real-Time Visualizer */}
      <Visualizer
        rawAnalyser={rawAnalyser}
        processedAnalyser={processedAnalyser}
        isRecording={isRecording && !isPaused}
        rawDb={rawDb}
        processedDb={processedDb}
        isGateOpen={isGateOpen}
      />

      {/* Live Speaker Quick-Tagger Bar */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live Speaker Identification
            </span>
            <span className="text-[11px] text-slate-400">
              (Tap hotkeys 1-{roster.length} during play to tag active speaker)
            </span>
          </div>

          {currentSpeaker && (
            <div className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
              <span>Active:</span>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold"
                style={{
                  backgroundColor: `${currentSpeaker.color}25`,
                  color: currentSpeaker.color,
                }}
              >
                {currentSpeaker.name} ({currentSpeaker.characterName})
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {roster.map((member, idx) => {
            const isSelected = activeSpeakerId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => onSelectSpeaker(member.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-amber-400/70 shadow-md ring-1 ring-amber-400/50'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {idx + 1}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">{member.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{member.characterName}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookmarking Command Deck */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Timestamped Bookmarking & TTRPG Journal
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {bookmarks.length} bookmark{bookmarks.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {/* Tactile Category Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { cat: 'combat' as BookmarkCategory, label: 'Combat', icon: Swords, key: 'C' },
            { cat: 'critical_roll' as BookmarkCategory, label: 'Crit Roll', icon: Dice5, key: 'R' },
            { cat: 'lore' as BookmarkCategory, label: 'Lore Clue', icon: Scroll, key: 'L' },
            { cat: 'npc' as BookmarkCategory, label: 'NPC Meet', icon: UserCheck, key: 'N' },
            { cat: 'loot' as BookmarkCategory, label: 'Loot', icon: Gem, key: 'T' },
            { cat: 'rule' as BookmarkCategory, label: 'Ruling', icon: Scale, key: '—' },
            { cat: 'funny' as BookmarkCategory, label: 'Quote', icon: Smile, key: '—' },
            { cat: 'general' as BookmarkCategory, label: 'Bookmark', icon: BookmarkIcon, key: 'B' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.cat}
                onClick={() => {
                  setSelectedCategory(item.cat);
                  onAddBookmark(
                    item.cat,
                    getDefaultCategoryName(item.cat),
                    activeSpeakerId || undefined
                  );
                }}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 rounded-lg text-slate-300 hover:text-white transition-all group"
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono text-slate-400">[{item.key}]</span>
                </div>
                <span className="text-xs font-medium mt-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Note Input */}
        <form onSubmit={handleManualAddBookmark} className="flex gap-2">
          <input
            type="text"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Add note with current timestamp... (e.g. 'Found secret passage under altar') - Press Enter"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Mark [Time]
          </button>
        </form>

        {/* Recent Bookmarks Live Stream */}
        {bookmarks.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live Session Activity Stream
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {[...bookmarks].reverse().slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-slate-950/60 border border-slate-800/60 px-3 py-2 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {getCategoryIcon(b.category)}
                    <span className="font-mono text-amber-400 font-semibold tabular-nums">
                      [{b.formattedTime}]
                    </span>
                    <span className="text-slate-300">{b.note}</span>
                    {b.speakerName && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {b.speakerName}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    {b.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
