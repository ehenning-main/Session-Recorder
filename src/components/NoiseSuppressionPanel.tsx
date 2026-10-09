import React from 'react';
import { Sliders, ShieldCheck, Waves, MicOff, Volume2, Clock, CheckCircle2 } from 'lucide-react';
import { DspPreset, DspSettings } from '../types/recorder';
import { DSP_PRESETS } from '../utils/audioDsp';

interface NoiseSuppressionPanelProps {
  settings: DspSettings;
  onSettingsChange: (newSettings: DspSettings) => void;
  segmentDurationMinutes: number;
  onSegmentDurationChange: (minutes: number) => void;
  isRecording: boolean;
}

export const NoiseSuppressionPanel: React.FC<NoiseSuppressionPanelProps> = ({
  settings,
  onSettingsChange,
  segmentDurationMinutes,
  onSegmentDurationChange,
  isRecording,
}) => {
  const handlePresetSelect = (preset: DspPreset) => {
    if (preset === 'custom') {
      onSettingsChange({ ...settings, preset: 'custom' });
    } else {
      const target = DSP_PRESETS[preset];
      if (target) {
        onSettingsChange({ ...target });
      }
    }
  };

  const updateNumericSetting = (key: keyof DspSettings, value: number) => {
    onSettingsChange({
      ...settings,
      preset: 'custom',
      [key]: value,
    });
  };

  const updateBoolSetting = (key: keyof DspSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      preset: 'custom',
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-serif font-bold text-amber-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Tabletop DSP & Long Session Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Engineered for in-person tabletop sessions: filters out low-frequency table thumps, dice rolling clatter, and ventilation hum while boosting vocal clarity across the table.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-xs">
            <div className="font-semibold text-slate-200">IndexedDB Safety Ring</div>
            <div className="text-[11px] text-slate-400">Zero RAM leaks for 4-8h sessions</div>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Acoustic Profile Presets
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handlePresetSelect('tabletop')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.preset === 'tabletop'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Tabletop Optimized</span>
              {settings.preset === 'tabletop' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              90Hz high-pass + 2.8kHz vocal presence boost + speech dynamics compressor.
            </p>
          </button>

          <button
            onClick={() => handlePresetSelect('aggressive')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.preset === 'aggressive'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Aggressive Gate</span>
              {settings.preset === 'aggressive' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              Mutes metal dice clatter, chair scrapes, and heavy breathing when no one is talking.
            </p>
          </button>

          <button
            onClick={() => handlePresetSelect('ambient')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.preset === 'ambient'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Atmospheric Ambiance</span>
              {settings.preset === 'ambient' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              Retains subtle background tavern music, dice rolling ambiance, and room acoustics.
            </p>
          </button>

          <button
            onClick={() => handlePresetSelect('raw')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              settings.preset === 'raw'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Raw Studio Bypass</span>
              {settings.preset === 'raw' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              Pure uncolored microphone input with no DSP filters or gating applied.
            </p>
          </button>
        </div>
      </div>

      {/* Manual DSP Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Filter Sliders */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-amber-400" />
              Frequency Equalization
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Web Audio Biquad</span>
          </div>

          {/* High Pass */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">High-Pass Rumble Cut</span>
              <span className="font-mono text-amber-400 tabular-nums">{settings.highPassHz} Hz</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={settings.highPassHz}
              onChange={(e) => updateNumericSetting('highPassHz', parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>20 Hz (Off)</span>
              <span>80-100 Hz (Table bumps)</span>
              <span>200 Hz (Aggressive)</span>
            </div>
          </div>

          {/* Vocal Formant Boost */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Speech Clarity Peaking Boost (2.8 kHz)</span>
              <span className="font-mono text-amber-400 tabular-nums">+{settings.peakingGainDb} dB</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={settings.peakingGainDb}
              onChange={(e) => updateNumericSetting('peakingGainDb', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 dB (Flat)</span>
              <span>+4 dB (Table recommended)</span>
              <span>+12 dB (Crisp vocal focus)</span>
            </div>
          </div>

          {/* Low Pass */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Low-Pass Hiss Cut</span>
              <span className="font-mono text-amber-400 tabular-nums">{(settings.lowPassHz / 1000).toFixed(1)} kHz</span>
            </div>
            <input
              type="range"
              min="5000"
              max="20000"
              step="500"
              value={settings.lowPassHz}
              onChange={(e) => updateNumericSetting('lowPassHz', parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>5 kHz (Warm roll-off)</span>
              <span>8 kHz (Fan/Hiss cut)</span>
              <span>20 kHz (Full spectrum)</span>
            </div>
          </div>
        </div>

        {/* Dynamics & Noise Gate */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <MicOff className="w-3.5 h-3.5 text-amber-400" />
              Noise Gate & Dynamic Leveler
            </h3>
            <span className="text-[11px] font-mono text-slate-400">RMS Evaluator</span>
          </div>

          {/* Noise Gate Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Noise Gate Threshold</span>
              <span className="font-mono text-amber-400 tabular-nums">{settings.noiseGateThresholdDb} dB</span>
            </div>
            <input
              type="range"
              min="-70"
              max="-25"
              step="1"
              value={settings.noiseGateThresholdDb}
              onChange={(e) => updateNumericSetting('noiseGateThresholdDb', parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-70 dB (Sensitive)</span>
              <span>-42 dB (Room silence)</span>
              <span>-25 dB (Hard gate)</span>
            </div>
          </div>

          {/* Compressor Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-slate-800/60">
            <div>
              <div className="text-xs font-medium text-slate-200">Table Dynamics Compressor</div>
              <div className="text-[11px] text-slate-400">Balances whispered secrets against combat battle cries</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.compressorEnabled}
                onChange={(e) => updateBoolSetting('compressorEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* WebRTC Hardware flags */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Browser WebRTC Hardware Processing
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800">
                <input
                  type="checkbox"
                  checked={settings.browserEchoCancellation}
                  disabled={isRecording}
                  onChange={(e) => updateBoolSetting('browserEchoCancellation', e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <span>Echo Cancel</span>
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800">
                <input
                  type="checkbox"
                  checked={settings.browserNoiseSuppression}
                  disabled={isRecording}
                  onChange={(e) => updateBoolSetting('browserNoiseSuppression', e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <span>Mic Filter</span>
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800">
                <input
                  type="checkbox"
                  checked={settings.browserAutoGainControl}
                  disabled={isRecording}
                  onChange={(e) => updateBoolSetting('browserAutoGainControl', e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <span>Auto Gain</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Long Session Audio Segmentation Architecture */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Long Session Segmentation Strategy (4 to 8+ Hours)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose how TavernEcho chunks audio into storage segments to prevent browser crashes during marathon campaigns.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          {[
            { min: 15, label: '15 Minutes', desc: 'Highest safety margin, easy file handling' },
            { min: 30, label: '30 Minutes', desc: 'Balanced segment size, recommended' },
            { min: 60, label: '60 Minutes', desc: 'Hour-by-hour acts for narrative structure' },
            { min: 0, label: 'Continuous File', desc: 'Single file with rolling disk cache' },
          ].map((item) => (
            <button
              key={item.min}
              disabled={isRecording}
              onClick={() => onSegmentDurationChange(item.min)}
              className={`p-3 rounded-lg border text-left transition-all ${
                segmentDurationMinutes === item.min
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-xs font-bold text-slate-200">{item.label}</div>
              <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
