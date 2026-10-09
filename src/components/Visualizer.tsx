import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio, Sparkles } from 'lucide-react';

interface VisualizerProps {
  rawAnalyser: AnalyserNode | null;
  processedAnalyser: AnalyserNode | null;
  isRecording: boolean;
  rawDb: number;
  processedDb: number;
  isGateOpen: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  rawAnalyser,
  processedAnalyser,
  isRecording,
  rawDb,
  processedDb,
  isGateOpen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'waveform' | 'spectrum'>('split');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = 256;
    const timeDataRaw = new Uint8Array(bufferLength);
    const timeDataProc = new Uint8Array(bufferLength);
    const freqDataProc = new Uint8Array(bufferLength);

    const render = () => {
      animationId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark slate gradient
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Subtle background grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Horizontal center
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      // Grid verticals
      for (let x = 50; x < width; x += 60) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      if (!isRecording) {
        // Idle ambient line
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const t = performance.now() * 0.002;
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.03 + t) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      if (rawAnalyser) rawAnalyser.getByteTimeDomainData(timeDataRaw);
      if (processedAnalyser) {
        processedAnalyser.getByteTimeDomainData(timeDataProc);
        processedAnalyser.getByteFrequencyData(freqDataProc);
      }

      if (viewMode === 'waveform' || viewMode === 'split') {
        // Draw Raw waveform in translucent rose if in split mode
        if (viewMode === 'split') {
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const sliceWidth = width / bufferLength;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = timeDataRaw[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
        }

        // Draw Processed Clean waveform in glowing amber
        ctx.strokeStyle = isGateOpen ? '#f59e0b' : 'rgba(245, 158, 11, 0.25)';
        ctx.shadowColor = isGateOpen ? 'rgba(245, 158, 11, 0.5)' : 'transparent';
        ctx.shadowBlur = isGateOpen ? 6 : 0;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = timeDataProc[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      if (viewMode === 'spectrum' || viewMode === 'split') {
        // Frequency bars overlay
        const barCount = 48;
        const barWidth = (width / barCount) * 0.75;
        const gap = (width / barCount) * 0.25;

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const val = freqDataProc[freqIndex] || 0;
          const barHeight = (val / 255) * (height * 0.7);

          // Vocal band highlight (~2kHz-4kHz) around bar 12 to 24
          const isVocalBand = i >= 10 && i <= 24;

          if (isVocalBand) {
            ctx.fillStyle = isGateOpen ? 'rgba(217, 119, 6, 0.65)' : 'rgba(217, 119, 6, 0.2)';
          } else {
            ctx.fillStyle = isGateOpen ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.15)';
          }

          const bx = i * (barWidth + gap) + 4;
          const by = height - barHeight;
          ctx.fillRect(bx, by, barWidth, barHeight);
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [rawAnalyser, processedAnalyser, isRecording, viewMode, isGateOpen]);

  // Meter calculations
  const rawPercent = Math.min(100, Math.max(0, ((rawDb + 60) / 60) * 100));
  const procPercent = Math.min(100, Math.max(0, ((processedDb + 60) / 60) * 100));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Acoustic Signal & Suppression Monitor
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'split'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split (Raw vs Clean)
          </button>
          <button
            onClick={() => setViewMode('waveform')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'waveform'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Waveform
          </button>
          <button
            onClick={() => setViewMode('spectrum')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'spectrum'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Frequency (FFT)
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="relative w-full h-36 bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          width={800}
          height={160}
          className="w-full h-full object-cover"
        />

        {/* Legend */}
        <div className="absolute top-2.5 right-3 flex items-center gap-3 text-[11px] font-mono bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800/60 backdrop-blur-xs">
          {viewMode === 'split' && (
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500/80" />
              <span>Raw Mic</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Clean Table DSP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isGateOpen ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80' : 'bg-slate-600'
              }`}
            />
            <span className={isGateOpen ? 'text-emerald-400' : 'text-slate-500'}>
              {isGateOpen ? 'Gate OPEN' : 'Gate CLOSED'}
            </span>
          </div>
        </div>
      </div>

      {/* Dual Hardware VU Meters */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Raw In</span>
            <span className="tabular-nums text-slate-300">{rawDb.toFixed(1)} dB</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-75"
              style={{ width: `${rawPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Filtered Out</span>
            <span className="tabular-nums text-amber-300">{processedDb.toFixed(1)} dB</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-75 ${
                isGateOpen
                  ? 'bg-gradient-to-r from-teal-500 via-amber-400 to-amber-500'
                  : 'bg-slate-700'
              }`}
              style={{ width: `${procPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
