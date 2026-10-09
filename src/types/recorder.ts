export type BookmarkCategory =
  | 'combat'
  | 'critical_roll'
  | 'lore'
  | 'npc'
  | 'loot'
  | 'rule'
  | 'funny'
  | 'general';

export interface Speaker {
  id: string;
  name: string;
  characterName: string;
  characterClass?: string;
  role: 'DM' | 'Player' | 'Spectator';
  color: string;
  voiceDescription?: string;
  seatingPosition?: string;
  speakingTimeSeconds?: number;
}

export interface Bookmark {
  id: string;
  timestamp: number; // in seconds
  formattedTime: string;
  category: BookmarkCategory;
  note: string;
  speakerId?: string;
  speakerName?: string;
}

export interface DiarizedTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  role: string;
  startTime: number;
  endTime: number;
  text: string;
  isOutOfCharacter: boolean;
  emotion?: string;
  category?: string;
}

export interface AudioSegment {
  id: string;
  segmentIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  blobSize: number;
  blobKey?: string;
  blobUrl?: string;
  status: 'recording' | 'saved' | 'diarizing' | 'diarized' | 'error';
  diarizedTurns?: DiarizedTurn[];
  segmentSummary?: string;
}

export type DspPreset = 'tabletop' | 'aggressive' | 'ambient' | 'raw' | 'custom';

export interface DspSettings {
  preset: DspPreset;
  highPassHz: number;
  peakingGainDb: number;
  lowPassHz: number;
  noiseGateThresholdDb: number;
  compressorEnabled: boolean;
  browserEchoCancellation: boolean;
  browserNoiseSuppression: boolean;
  browserAutoGainControl: boolean;
}

export interface SessionData {
  id: string;
  title: string;
  campaignName: string;
  sessionNumber: number;
  createdAt: string;
  segmentDurationMinutes: number; // 0 = continuous, 15, 30, 60
  roster: Speaker[];
  bookmarks: Bookmark[];
  segments: AudioSegment[];
  status: 'idle' | 'recording' | 'paused' | 'completed';
  elapsedSeconds: number;
}
