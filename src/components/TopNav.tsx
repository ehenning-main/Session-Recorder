import React from 'react';
import { Mic, Volume2, Users, BookOpen, Sliders, HardDrive } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export type ActiveTab = 'console' | 'timeline' | 'roster' | 'chronicle' | 'dsp';

interface TopNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isRecording: boolean;
  storageUsage: { usageMb: number; quotaMb: number; percentUsed: number };
  onExportClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  isRecording,
  storageUsage,
  onExportClick,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('console');
          }}
          className="text-lg font-serif font-bold tracking-wider text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 inline-block" />
          TavernEcho
        </a>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-md animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            REC
          </span>
        )}
      </div>

      {/* Zone 2: 4-5 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/60 rounded-lg">
        <button
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'console'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Recorder</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Diarization</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'roster'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Party Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('chronicle')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'chronicle'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Chronicle</span>
        </button>

        <button
          onClick={() => setActiveTab('dsp')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'dsp'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Noise DSP</span>
        </button>
      </nav>

      {/* Zone 3: Primary actions & storage indicators */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 px-2.5 py-1.5 rounded-md">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span className="tabular-nums">{storageUsage.usageMb} MB</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500">{storageUsage.quotaMb > 1024 ? `${(storageUsage.quotaMb / 1024).toFixed(1)} GB` : `${storageUsage.quotaMb} MB`}</span>
        </div>

        <button
          onClick={onExportClick}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap"
        >
          Export Session
        </button>
      </div>
    </header>
  );
};
