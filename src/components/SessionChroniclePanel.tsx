import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Download,
  FileText,
  FileSpreadsheet,
  Share2,
  Swords,
  Scroll,
  Gem,
  HelpCircle,
  Quote,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { SessionData, DiarizedTurn } from '../types/recorder';
import {
  exportBookmarksCsv,
  exportTranscriptMarkdown,
  formatSeconds,
  formatBytes,
  downloadBlob,
} from '../utils/formatters';
import { getAudioBlobFromDb } from '../utils/indexedDb';

interface SessionChroniclePanelProps {
  session: SessionData;
  onGenerateRecap: () => Promise<void>;
  isGeneratingRecap: boolean;
  recapData: any;
}

export const SessionChroniclePanel: React.FC<SessionChroniclePanelProps> = ({
  session,
  onGenerateRecap,
  isGeneratingRecap,
  recapData,
}) => {
  const [downloadingSegmentIdx, setDownloadingSegmentIdx] = useState<number | null>(null);

  // Gather all turns
  const allTurns: DiarizedTurn[] = [];
  session.segments.forEach((seg) => {
    if (seg.diarizedTurns) {
      allTurns.push(...seg.diarizedTurns);
    }
  });

  const handleExportMarkdown = () => {
    exportTranscriptMarkdown(session, allTurns, recapData);
  };

  const handleExportCsv = () => {
    exportBookmarksCsv(session.bookmarks, session.title);
  };

  const handleExportJson = () => {
    const backup = {
      sessionMeta: {
        id: session.id,
        title: session.title,
        campaignName: session.campaignName,
        sessionNumber: session.sessionNumber,
        createdAt: session.createdAt,
        elapsedSeconds: session.elapsedSeconds,
      },
      roster: session.roster,
      bookmarks: session.bookmarks,
      segments: session.segments.map((s) => ({
        id: s.id,
        segmentIndex: s.segmentIndex,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        blobSize: s.blobSize,
        diarizedTurns: s.diarizedTurns,
        segmentSummary: s.segmentSummary,
      })),
      recap: recapData,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    downloadBlob(blob, `${session.title || 'session'}_backup.json`);
  };

  const handleDownloadSegment = async (index: number) => {
    setDownloadingSegmentIdx(index);
    try {
      const seg = session.segments[index];
      if (!seg) return;
      const key = seg.blobKey || `seg_${session.id}_${index}`;
      const blob = await getAudioBlobFromDb(key);
      if (blob) {
        downloadBlob(
          blob,
          `${session.campaignName || 'Campaign'}_S${session.sessionNumber}_Part${index + 1}.webm`
        );
      }
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setDownloadingSegmentIdx(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Image and Action Buttons */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src="/src/assets/images/tavernecho_tabletop_banner_1790916118494.jpg"
            alt="Tabletop RPG Session Setup"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              Session Chronicle & Campaign Archive
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-100">
              {session.campaignName}: {session.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>Session #{session.sessionNumber}</span>
              <span>·</span>
              <span>Duration: {formatSeconds(session.elapsedSeconds)}</span>
              <span>·</span>
              <span>{session.bookmarks.length} Bookmarks</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onGenerateRecap}
              disabled={isGeneratingRecap}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-lg transition-all ${
                isGeneratingRecap
                  ? 'bg-amber-600/50 text-amber-200 cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer hover:scale-105 active:scale-95'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingRecap ? 'Chronicling with Gemini...' : 'Generate AI Chronicle'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Export Markdown</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Bookmarks CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs transition-colors"
              title="Backup JSON"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recap Content Cards */}
      {recapData ? (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Executive Summary */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Scroll className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-serif">
                Chronicle Narrative Summary
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {recapData.executiveSummary}
            </p>

            {recapData.quoteOfTheSession && (
              <div className="mt-4 p-3.5 bg-amber-950/20 border-l-2 border-amber-500 rounded-r-lg text-xs italic text-amber-200 flex items-start gap-2">
                <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>"{recapData.quoteOfTheSession}"</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Narrative Arc Beats */}
            {recapData.narrativeArc && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Key Narrative Milestones
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {recapData.narrativeArc.map((beat: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{beat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Combat Highlights */}
            {recapData.combatHighlights && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                  Tactical & Combat Highlights
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {recapData.combatHighlights.map((hl: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold shrink-0">⚔️</span>
                      <span className="leading-relaxed">{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Loot & Treasures */}
            {recapData.lootAcquired && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gem className="w-3.5 h-3.5 text-amber-400" />
                  Loot, Relics & Inventory Gained
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {recapData.lootAcquired.map((loot: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">💎</span>
                      <span className="leading-relaxed">{loot}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unresolved Hooks & Next Session Seeds */}
            {recapData.unresolvedHooks && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  Unresolved Mysteries & Next Session Seeds
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {recapData.unresolvedHooks.map((hook: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold shrink-0">❓</span>
                      <span className="leading-relaxed">{hook}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-10 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-300">No AI Chronicle Generated Yet</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Generate AI Chronicle" to let Gemini read your session bookmarks, diarized dialogue turns, and party roster to compile an epic DM Campaign Journal.
          </p>
        </div>
      )}

      {/* Audio Segments Download Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              Raw Segmented Audio Downloads
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual WebM audio chunks saved in IndexedDB disk cache. Download anytime.
            </p>
          </div>
        </div>

        {session.segments.length === 0 ? (
          <div className="text-xs text-slate-500 py-3">No audio segments recorded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {session.segments.map((seg, idx) => (
              <div
                key={seg.id}
                className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">Part #{idx + 1}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {formatSeconds(seg.startTime)} - {formatSeconds(seg.endTime)} · {formatBytes(seg.blobSize)}
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadSegment(idx)}
                  disabled={downloadingSegmentIdx === idx}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-md transition-colors"
                  title="Download WebM"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
