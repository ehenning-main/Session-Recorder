/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TopNav, ActiveTab } from './components/TopNav';
import { RecordingConsole } from './components/RecordingConsole';
import { DiarizationTimeline } from './components/DiarizationTimeline';
import { PartyRosterPanel } from './components/PartyRosterPanel';
import { NoiseSuppressionPanel } from './components/NoiseSuppressionPanel';
import { SessionChroniclePanel } from './components/SessionChroniclePanel';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import {
  Bookmark,
  BookmarkCategory,
  DspSettings,
  SessionData,
  Speaker,
  AudioSegment,
  DiarizedTurn,
} from './types/recorder';
import { AudioDspEngine, DSP_PRESETS } from './utils/audioDsp';
import {
  estimateStorageQuota,
  getAudioBlobFromDb,
  saveAudioBlobToDb,
  saveSessionMetadata,
  getSessionMetadata,
} from './utils/indexedDb';
import { blobToBase64, formatSeconds } from './utils/formatters';

const DEFAULT_ROSTER: Speaker[] = [
  {
    id: 'dm',
    name: 'Matthew',
    characterName: 'Dungeon Master',
    characterClass: 'Storyteller / Arbiter',
    role: 'DM',
    color: '#f59e0b',
    voiceDescription: 'Deep narrative baritone, varies cadence for NPC voices',
    seatingPosition: 'Head of Table (North)',
    speakingTimeSeconds: 0,
  },
  {
    id: 'p1',
    name: 'Elena',
    characterName: 'Lyra Nightshade',
    characterClass: 'Rogue Assassin',
    role: 'Player',
    color: '#10b981',
    voiceDescription: 'Quiet, deliberate, speaks in whispers when stealthing',
    seatingPosition: 'East',
    speakingTimeSeconds: 0,
  },
  {
    id: 'p2',
    name: 'Marcus',
    characterName: 'Thrum Ironbreaker',
    characterClass: 'Barbarian Berserker',
    role: 'Player',
    color: '#ef4444',
    voiceDescription: 'Loud energetic bass, yells battle cries during rage',
    seatingPosition: 'South-East',
    speakingTimeSeconds: 0,
  },
  {
    id: 'p3',
    name: 'Sarah',
    characterName: 'Solas Dawnseeker',
    characterClass: 'Life Cleric',
    role: 'Player',
    color: '#6366f1',
    voiceDescription: 'Warm clear soprano, frequently quotes radiant prayers',
    seatingPosition: 'South-West',
    speakingTimeSeconds: 0,
  },
  {
    id: 'p4',
    name: 'David',
    characterName: 'Vesper',
    characterClass: 'Fiend Warlock',
    role: 'Player',
    color: '#a855f7',
    voiceDescription: 'Sardonic tenor, dry comedic timing',
    seatingPosition: 'West',
    speakingTimeSeconds: 0,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('console');

  // Session State
  const [session, setSession] = useState<SessionData>({
    id: `sess_${Date.now()}`,
    title: 'The Sunken Vault of Morndas',
    campaignName: 'Shadows of Eldoria',
    sessionNumber: 14,
    createdAt: new Date().toISOString(),
    segmentDurationMinutes: 30, // 30 min segments for safe multi-hour memory
    roster: DEFAULT_ROSTER,
    bookmarks: [],
    segments: [],
    status: 'idle',
    elapsedSeconds: 0,
  });

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>('dm');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentSegmentSeconds, setCurrentSegmentSeconds] = useState(0);

  // Audio DSP & Visualizer Engine
  const [dspSettings, setDspSettings] = useState<DspSettings>(DSP_PRESETS.tabletop);
  const dspEngineRef = useRef<AudioDspEngine | null>(null);
  const [rawDb, setRawDb] = useState(-80);
  const [processedDb, setProcessedDb] = useState(-80);
  const [isGateOpen, setIsGateOpen] = useState(false);

  // MediaRecorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const currentChunksRef = useRef<Blob[]>([]);
  const segmentStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);

  // Storage Quota
  const [storageUsage, setStorageUsage] = useState({
    usageMb: 0,
    quotaMb: 5000,
    percentUsed: 1,
    estimatedHoursRemaining: 150,
  });

  // Audio Playback
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [playbackSegmentIndex, setPlaybackSegmentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // AI Diarization & Recap State
  const [diarizingSegmentIndex, setDiarizingSegmentIndex] = useState<number | null>(null);
  const [recapData, setRecapData] = useState<any>(null);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);

  // Session Edit Modal
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [editCampaignName, setEditCampaignName] = useState(session.campaignName);
  const [editSessionNumber, setEditSessionNumber] = useState(session.sessionNumber);
  const [editSessionTitle, setEditSessionTitle] = useState(session.title);

  // Update storage quota on mount & periodically
  useEffect(() => {
    estimateStorageQuota().then(setStorageUsage);
    const quotaTimer = setInterval(() => {
      estimateStorageQuota().then(setStorageUsage);
    }, 30000);
    return () => clearInterval(quotaTimer);
  }, []);

  // Save metadata to IndexedDB when session changes
  useEffect(() => {
    saveSessionMetadata('current_active_session', session).catch(console.error);
  }, [session]);

  // Master Elapsed Seconds Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSession((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
        setCurrentSegmentSeconds((prev) => {
          const next = prev + 1;
          // Check if segment rollover is reached
          if (
            session.segmentDurationMinutes > 0 &&
            next >= session.segmentDurationMinutes * 60
          ) {
            handleSegmentRollover();
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused, session.segmentDurationMinutes]);

  // Start Recording Handler
  const handleStartRecording = async () => {
    try {
      const dsp = new AudioDspEngine();
      dsp.onLevelMeter = (data) => {
        setRawDb(data.rawDb);
        setProcessedDb(data.processedDb);
        setIsGateOpen(data.isGateOpen);
      };

      const processedStream = await dsp.initialize(dspSettings);
      dspEngineRef.current = dsp;

      // Initialize MediaRecorder with Opus codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(processedStream, {
        mimeType,
        audioBitsPerSecond: 64000, // 64kbps Opus gives crystal clear voice at ~28MB/hour
      });

      currentChunksRef.current = [];
      segmentStartTimeRef.current = session.elapsedSeconds;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          currentChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(currentChunksRef.current, { type: mimeType });
        const segIndex = currentSegmentIndex;
        const blobKey = `seg_${session.id}_${segIndex}`;

        if (audioBlob.size > 0) {
          await saveAudioBlobToDb(blobKey, audioBlob);

          const duration = Math.max(1, session.elapsedSeconds - segmentStartTimeRef.current);
          const newSegment: AudioSegment = {
            id: `seg_${Date.now()}_${segIndex}`,
            segmentIndex: segIndex,
            startTime: segmentStartTimeRef.current,
            endTime: session.elapsedSeconds,
            duration,
            blobSize: audioBlob.size,
            blobKey,
            status: 'saved',
          };

          setSession((prev) => ({
            ...prev,
            segments: [...prev.segments, newSegment],
          }));

          estimateStorageQuota().then(setStorageUsage);
        }
      };

      // Request data every 3 seconds for safe chunk collection
      recorder.start(3000);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setIsPaused(false);
      setCurrentSegmentSeconds(0);
      setSession((prev) => ({ ...prev, status: 'recording' }));
    } catch (err: any) {
      console.error('Failed to start audio recording:', err);
      alert('Microphone access is required to record TTRPG sessions: ' + (err?.message || err));
    }
  };

  // Seamless Segment Rollover for 4-8+ Hour Continuous Sessions
  const handleSegmentRollover = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    // Stop current recorder to finalize segment blob in IndexedDB
    mediaRecorderRef.current.stop();

    // Increment segment index
    const nextIdx = currentSegmentIndex + 1;
    setCurrentSegmentIndex(nextIdx);

    // Restart MediaRecorder on the same audio stream
    setTimeout(() => {
      if (dspEngineRef.current && isRecording) {
        currentChunksRef.current = [];
        segmentStartTimeRef.current = session.elapsedSeconds;
        mediaRecorderRef.current?.start(3000);
      }
    }, 200);
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setSession((prev) => ({ ...prev, status: 'paused' }));
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setSession((prev) => ({ ...prev, status: 'recording' }));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (dspEngineRef.current) {
      dspEngineRef.current.dispose();
      dspEngineRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setSession((prev) => ({ ...prev, status: 'completed' }));
  };

  // Bookmark creation
  const handleAddBookmark = (
    category: BookmarkCategory,
    note: string,
    speakerId?: string
  ) => {
    const spk = session.roster.find((r) => r.id === speakerId);
    const newBookmark: Bookmark = {
      id: `bm_${Date.now()}`,
      timestamp: session.elapsedSeconds,
      formattedTime: formatSeconds(session.elapsedSeconds),
      category,
      note,
      speakerId,
      speakerName: spk ? `${spk.name} (${spk.characterName})` : undefined,
    };

    setSession((prev) => ({
      ...prev,
      bookmarks: [...prev.bookmarks, newBookmark],
    }));
  };

  // Playback Control
  const handlePlayAtTime = async (timestampSeconds: number) => {
    // Find which segment contains this timestamp
    const targetSegmentIndex = session.segments.findIndex(
      (s) => timestampSeconds >= s.startTime && timestampSeconds <= s.endTime
    );

    const segIdx = targetSegmentIndex >= 0 ? targetSegmentIndex : 0;
    const seg = session.segments[segIdx];
    if (!seg) return;

    setPlaybackSegmentIndex(segIdx);
    const offset = Math.max(0, timestampSeconds - seg.startTime);

    await loadAndPlaySegment(segIdx, offset);
  };

  const loadAndPlaySegment = async (segIdx: number, startOffsetSeconds = 0) => {
    const seg = session.segments[segIdx];
    if (!seg) return;

    const blobKey = seg.blobKey || `seg_${session.id}_${segIdx}`;
    const blob = await getAudioBlobFromDb(blobKey);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }

    const audio = audioElementRef.current;
    audio.src = url;
    audio.playbackRate = playbackRate;

    audio.onloadedmetadata = () => {
      setPlaybackDuration(audio.duration || seg.duration);
      audio.currentTime = startOffsetSeconds;
      audio.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    };

    audio.ontimeupdate = () => {
      setPlaybackCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlayingAudio(false);
    };
  };

  const handleTogglePlay = () => {
    if (!audioElementRef.current) {
      if (session.segments.length > 0) {
        loadAndPlaySegment(playbackSegmentIndex);
      }
      return;
    }
    const audio = audioElementRef.current;
    if (audio.paused) {
      audio.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    } else {
      audio.pause();
      setIsPlayingAudio(false);
    }
  };

  const handleSeek = (timeSec: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = timeSec;
      setPlaybackCurrentTime(timeSec);
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = rate;
    }
  };

  // AI Speaker Diarization Call
  const handleDiarizeSegment = async (segmentIndex: number) => {
    const seg = session.segments[segmentIndex];
    if (!seg) return;

    setDiarizingSegmentIndex(segmentIndex);

    try {
      const blobKey = seg.blobKey || `seg_${session.id}_${segmentIndex}`;
      const blob = await getAudioBlobFromDb(blobKey);
      if (!blob) {
        throw new Error('Audio file for segment not found in storage');
      }

      const audioBase64 = await blobToBase64(blob);

      const response = await fetch('/api/diarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || 'audio/webm',
          roster: session.roster,
          segmentOffset: seg.startTime,
          contextNote: `${session.campaignName} - Session #${session.sessionNumber}: ${session.title}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Diarization request failed');
      }

      const data = await response.json();
      const turns: DiarizedTurn[] = (data.turns || []).map((t: any, i: number) => ({
        id: `turn_${segmentIndex}_${i}_${Date.now()}`,
        speakerId: t.speakerId || 'dm',
        speakerName: t.speakerName || 'Speaker',
        role: t.role || 'Player',
        startTime: t.startTime ?? seg.startTime,
        endTime: t.endTime ?? seg.endTime,
        text: t.text || '',
        isOutOfCharacter: Boolean(t.isOutOfCharacter),
        emotion: t.emotion,
        category: t.category,
      }));

      // Update segment in session
      setSession((prev) => {
        const nextSegments = [...prev.segments];
        nextSegments[segmentIndex] = {
          ...seg,
          status: 'diarized',
          diarizedTurns: turns,
          segmentSummary: data.segmentSummary || data.summary,
        };
        return {
          ...prev,
          segments: nextSegments,
        };
      });
    } catch (err: any) {
      console.error('Diarization failed:', err);
      alert('Speaker diarization failed: ' + (err?.message || err));
    } finally {
      setDiarizingSegmentIndex(null);
    }
  };

  // AI Session Chronicle Recap Call
  const handleGenerateRecap = async () => {
    setIsGeneratingRecap(true);
    try {
      const allTurns: DiarizedTurn[] = [];
      session.segments.forEach((s) => {
        if (s.diarizedTurns) allTurns.push(...s.diarizedTurns);
      });

      const response = await fetch('/api/session-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTitle: session.title,
          campaignName: session.campaignName,
          sessionNumber: session.sessionNumber,
          durationSeconds: session.elapsedSeconds,
          bookmarks: session.bookmarks,
          turns: allTurns,
          roster: session.roster,
        }),
      });

      if (!response.ok) {
        throw new Error('Recap request failed');
      }

      const data = await response.json();
      setRecapData(data);
    } catch (err: any) {
      console.error('Recap failed:', err);
      alert('Session chronicle generation failed: ' + (err?.message || err));
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/20">
      {/* Top Bar with Three-Zone Contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRecording={isRecording && !isPaused}
        storageUsage={storageUsage}
        onExportClick={() => setActiveTab('chronicle')}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-28">
        {activeTab === 'console' && (
          <RecordingConsole
            isRecording={isRecording}
            isPaused={isPaused}
            elapsedSeconds={session.elapsedSeconds}
            currentSegmentIndex={currentSegmentIndex}
            currentSegmentSeconds={currentSegmentSeconds}
            segmentDurationMinutes={session.segmentDurationMinutes}
            segments={session.segments}
            roster={session.roster}
            bookmarks={session.bookmarks}
            activeSpeakerId={activeSpeakerId}
            onStartRecording={handleStartRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
            onStopRecording={handleStopRecording}
            onAddBookmark={handleAddBookmark}
            onSelectSpeaker={(id) => setActiveSpeakerId(id)}
            rawAnalyser={dspEngineRef.current?.rawAnalyser || null}
            processedAnalyser={dspEngineRef.current?.processedAnalyser || null}
            rawDb={rawDb}
            processedDb={processedDb}
            isGateOpen={isGateOpen}
            storageUsage={storageUsage}
            campaignName={session.campaignName}
            sessionNumber={session.sessionNumber}
            sessionTitle={session.title}
            onEditSessionInfo={() => setIsEditingSession(true)}
          />
        )}

        {activeTab === 'timeline' && (
          <DiarizationTimeline
            segments={session.segments}
            roster={session.roster}
            bookmarks={session.bookmarks}
            onPlayAtTime={handlePlayAtTime}
            onDiarizeSegment={handleDiarizeSegment}
            diarizingSegmentIndex={diarizingSegmentIndex}
            currentlyPlayingTime={
              (session.segments[playbackSegmentIndex]?.startTime || 0) + playbackCurrentTime
            }
            isPlaying={isPlayingAudio}
            totalSessionSeconds={session.elapsedSeconds}
          />
        )}

        {activeTab === 'roster' && (
          <PartyRosterPanel
            roster={session.roster}
            onUpdateRoster={(newRoster) => setSession((prev) => ({ ...prev, roster: newRoster }))}
            isRecording={isRecording}
          />
        )}

        {activeTab === 'dsp' && (
          <NoiseSuppressionPanel
            settings={dspSettings}
            onSettingsChange={(newSettings) => {
              setDspSettings(newSettings);
              if (dspEngineRef.current) {
                dspEngineRef.current.updateSettings(newSettings);
              }
            }}
            segmentDurationMinutes={session.segmentDurationMinutes}
            onSegmentDurationChange={(min) =>
              setSession((prev) => ({ ...prev, segmentDurationMinutes: min }))
            }
            isRecording={isRecording}
          />
        )}

        {activeTab === 'chronicle' && (
          <SessionChroniclePanel
            session={session}
            onGenerateRecap={handleGenerateRecap}
            isGeneratingRecap={isGeneratingRecap}
            recapData={recapData}
          />
        )}
      </main>

      {/* Persistent Audio Player Bar when recordings are present */}
      {session.segments.length > 0 && (
        <AudioPlayerBar
          currentSegment={session.segments[playbackSegmentIndex] || null}
          segments={session.segments}
          currentSegmentIndex={playbackSegmentIndex}
          onSelectSegment={(idx) => {
            setPlaybackSegmentIndex(idx);
            loadAndPlaySegment(idx);
          }}
          bookmarks={session.bookmarks}
          isPlaying={isPlayingAudio}
          onTogglePlay={handleTogglePlay}
          currentTime={playbackCurrentTime}
          duration={playbackDuration || session.segments[playbackSegmentIndex]?.duration || 1}
          onSeek={handleSeek}
          playbackRate={playbackRate}
          onChangePlaybackRate={handleChangePlaybackRate}
        />
      )}

      {/* Edit Session Info Modal */}
      {isEditingSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-serif font-bold text-amber-300">
              Edit Campaign Session Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={editCampaignName}
                  onChange={(e) => setEditCampaignName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Session Number</label>
                <input
                  type="number"
                  min="1"
                  value={editSessionNumber}
                  onChange={(e) => setEditSessionNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Session Episode / Title</label>
                <input
                  type="text"
                  value={editSessionTitle}
                  onChange={(e) => setEditSessionTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsEditingSession(false)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSession((prev) => ({
                    ...prev,
                    campaignName: editCampaignName,
                    sessionNumber: editSessionNumber,
                    title: editSessionTitle,
                  }));
                  setIsEditingSession(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
