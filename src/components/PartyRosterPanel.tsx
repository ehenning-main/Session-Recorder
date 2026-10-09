import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Shield, User, Mic } from 'lucide-react';
import { Speaker } from '../types/recorder';

interface PartyRosterPanelProps {
  roster: Speaker[];
  onUpdateRoster: (newRoster: Speaker[]) => void;
  isRecording: boolean;
}

const PRESET_COLORS = [
  '#f59e0b', // Amber / Gold (traditional DM)
  '#10b981', // Emerald
  '#ef4444', // Crimson
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
];

export const PartyRosterPanel: React.FC<PartyRosterPanelProps> = ({
  roster,
  onUpdateRoster,
  isRecording,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Speaker>>({
    name: '',
    characterName: '',
    characterClass: '',
    role: 'Player',
    color: '#10b981',
    voiceDescription: '',
    seatingPosition: 'South',
  });

  const handleStartAdd = () => {
    setFormData({
      id: `spk_${Date.now()}`,
      name: '',
      characterName: '',
      characterClass: 'Fighter',
      role: 'Player',
      color: PRESET_COLORS[(roster.length + 1) % PRESET_COLORS.length],
      voiceDescription: 'Clear midrange voice',
      seatingPosition: 'East',
    });
    setEditingId('new');
  };

  const handleStartEdit = (speaker: Speaker) => {
    setFormData({ ...speaker });
    setEditingId(speaker.id);
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingId === 'new') {
      const newSpeaker: Speaker = {
        id: formData.id || `spk_${Date.now()}`,
        name: formData.name || 'Player',
        characterName: formData.characterName || 'Hero',
        characterClass: formData.characterClass || 'Adventurer',
        role: formData.role || 'Player',
        color: formData.color || '#f59e0b',
        voiceDescription: formData.voiceDescription || '',
        seatingPosition: formData.seatingPosition || 'Table',
        speakingTimeSeconds: 0,
      };
      onUpdateRoster([...roster, newSpeaker]);
    } else {
      onUpdateRoster(
        roster.map((s) => (s.id === editingId ? ({ ...s, ...formData } as Speaker) : s))
      );
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (roster.length <= 1) return;
    onUpdateRoster(roster.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-serif font-bold text-amber-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Tabletop Party & Speaker Roster
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure the Dungeon Master and party members. Providing character names, table seating positions, and voice descriptions helps the AI diarization engine distinguish voices during multi-player cross-talk.
          </p>
        </div>

        <button
          onClick={handleStartAdd}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Speaker / Player</span>
        </button>
      </div>

      {/* Editor Modal / Inline Form */}
      {editingId && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-amber-300">
              {editingId === 'new' ? 'Enroll New Party Member' : 'Edit Speaker Profile'}
            </h3>
            <span className="text-xs text-slate-400">Used for AI speaker identification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Player Real Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Elena"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Role at Table</label>
              <select
                value={formData.role || 'Player'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
              >
                <option value="DM">Dungeon Master (DM / GM)</option>
                <option value="Player">Player Character</option>
                <option value="Spectator">Spectator / Guest</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Character Name & Class</label>
              <input
                type="text"
                value={formData.characterName || ''}
                onChange={(e) => setFormData({ ...formData, characterName: e.target.value })}
                placeholder="e.g. Lyra Nightshade (Rogue)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Seating Position at Table</label>
              <input
                type="text"
                value={formData.seatingPosition || ''}
                onChange={(e) => setFormData({ ...formData, seatingPosition: e.target.value })}
                placeholder="e.g. Head of Table / North"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">
                Voice Tone / Acoustic Profile (for Diarization)
              </label>
              <input
                type="text"
                value={formData.voiceDescription || ''}
                onChange={(e) => setFormData({ ...formData, voiceDescription: e.target.value })}
                placeholder="e.g. Deep baritone, speaks deliberately, dramatic narration tone"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 block mb-1.5">Color Accent</label>
              <div className="flex items-center gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      formData.color === c ? 'scale-125 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setEditingId(null)}
              className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* Roster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roster.map((member, index) => (
          <div
            key={member.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors relative group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-950 shadow-sm"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{member.name}</span>
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: `${member.color}20`,
                          color: member.color,
                        }}
                      >
                        {member.role === 'DM' ? 'Dungeon Master' : member.role}
                      </span>
                    </div>

                    <div className="text-xs text-amber-300/90 font-medium">
                      {member.characterName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(member)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {roster.length > 1 && (
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Seating:</span>
                  <span className="text-slate-300">{member.seatingPosition || 'Table Center'}</span>
                </div>
                {member.voiceDescription && (
                  <div className="text-[11px] text-slate-400 italic">
                    "{member.voiceDescription}"
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quick Hotkey:</span>
              <kbd className="font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                Key {index + 1}
              </kbd>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
