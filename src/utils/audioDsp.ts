import { DspSettings } from '../types/recorder';

export const DSP_PRESETS: Record<string, DspSettings> = {
  tabletop: {
    preset: 'tabletop',
    highPassHz: 90,
    peakingGainDb: 4.5,
    lowPassHz: 8000,
    noiseGateThresholdDb: -42,
    compressorEnabled: true,
    browserEchoCancellation: true,
    browserNoiseSuppression: true,
    browserAutoGainControl: true,
  },
  aggressive: {
    preset: 'aggressive',
    highPassHz: 120,
    peakingGainDb: 6,
    lowPassHz: 7000,
    noiseGateThresholdDb: -36,
    compressorEnabled: true,
    browserEchoCancellation: true,
    browserNoiseSuppression: true,
    browserAutoGainControl: true,
  },
  ambient: {
    preset: 'ambient',
    highPassHz: 60,
    peakingGainDb: 2,
    lowPassHz: 12000,
    noiseGateThresholdDb: -52,
    compressorEnabled: false,
    browserEchoCancellation: false,
    browserNoiseSuppression: false,
    browserAutoGainControl: false,
  },
  raw: {
    preset: 'raw',
    highPassHz: 20,
    peakingGainDb: 0,
    lowPassHz: 20000,
    noiseGateThresholdDb: -90,
    compressorEnabled: false,
    browserEchoCancellation: false,
    browserNoiseSuppression: false,
    browserAutoGainControl: false,
  },
};

export class AudioDspEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassNode: BiquadFilterNode | null = null;
  private peakingNode: BiquadFilterNode | null = null;
  private lowPassNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private gateGainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  public rawAnalyser: AnalyserNode | null = null;
  public processedAnalyser: AnalyserNode | null = null;

  private isRunning = false;
  private meterRafId: number | null = null;
  private currentGateOpen = true;

  public onLevelMeter?: (data: {
    rawDb: number;
    processedDb: number;
    isGateOpen: boolean;
  }) => void;

  public async initialize(settings: DspSettings): Promise<MediaStream> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 48000,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Request user media with browser-level DSP flags
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: settings.browserEchoCancellation,
        noiseSuppression: settings.browserNoiseSuppression,
        autoGainControl: settings.browserAutoGainControl,
        channelCount: 2,
      },
      video: false,
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Build Web Audio DSP chain
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Raw analyser for comparative visualizer
    this.rawAnalyser = this.audioContext.createAnalyser();
    this.rawAnalyser.fftSize = 512;
    this.rawAnalyser.smoothingTimeConstant = 0.8;
    this.sourceNode.connect(this.rawAnalyser);

    // 1. High-Pass Filter (Rumble, desk vibrations, A/C hum cut)
    this.highPassNode = this.audioContext.createBiquadFilter();
    this.highPassNode.type = 'highpass';
    this.highPassNode.frequency.setValueAtTime(settings.highPassHz, this.audioContext.currentTime);
    this.highPassNode.Q.setValueAtTime(0.707, this.audioContext.currentTime);

    // 2. Peaking Vocal Formant Booster (speech clarity across the table)
    this.peakingNode = this.audioContext.createBiquadFilter();
    this.peakingNode.type = 'peaking';
    this.peakingNode.frequency.setValueAtTime(2800, this.audioContext.currentTime);
    this.peakingNode.gain.setValueAtTime(settings.peakingGainDb, this.audioContext.currentTime);
    this.peakingNode.Q.setValueAtTime(1.2, this.audioContext.currentTime);

    // 3. Low-Pass Filter (Hiss, fan noise, plastic dice clink harshness)
    this.lowPassNode = this.audioContext.createBiquadFilter();
    this.lowPassNode.type = 'lowpass';
    this.lowPassNode.frequency.setValueAtTime(settings.lowPassHz, this.audioContext.currentTime);
    this.lowPassNode.Q.setValueAtTime(0.707, this.audioContext.currentTime);

    // 4. Noise Gate Gain Node
    this.gateGainNode = this.audioContext.createGain();
    this.gateGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

    // 5. Dynamics Compressor (Tames screaming critical hits & brings up whispers)
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.setValueAtTime(-26, this.audioContext.currentTime);
    this.compressorNode.knee.setValueAtTime(18, this.audioContext.currentTime);
    this.compressorNode.ratio.setValueAtTime(4.0, this.audioContext.currentTime);
    this.compressorNode.attack.setValueAtTime(0.003, this.audioContext.currentTime);
    this.compressorNode.release.setValueAtTime(0.25, this.audioContext.currentTime);

    // 6. Processed Analyser
    this.processedAnalyser = this.audioContext.createAnalyser();
    this.processedAnalyser.fftSize = 512;
    this.processedAnalyser.smoothingTimeConstant = 0.8;

    // 7. Destination for MediaRecorder
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    // Connect node chain
    this.sourceNode.connect(this.highPassNode);
    this.highPassNode.connect(this.peakingNode);
    this.peakingNode.connect(this.lowPassNode);
    this.lowPassNode.connect(this.gateGainNode);

    if (settings.compressorEnabled) {
      this.gateGainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.processedAnalyser);
      this.compressorNode.connect(this.destinationNode);
    } else {
      this.gateGainNode.connect(this.processedAnalyser);
      this.gateGainNode.connect(this.destinationNode);
    }

    this.isRunning = true;
    this.startLevelMonitoring(settings.noiseGateThresholdDb);

    return this.destinationNode.stream;
  }

  public updateSettings(settings: DspSettings) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    if (this.highPassNode) {
      this.highPassNode.frequency.setTargetAtTime(settings.highPassHz, now, 0.05);
    }
    if (this.peakingNode) {
      this.peakingNode.gain.setTargetAtTime(settings.peakingGainDb, now, 0.05);
    }
    if (this.lowPassNode) {
      this.lowPassNode.frequency.setTargetAtTime(settings.lowPassHz, now, 0.05);
    }
  }

  private startLevelMonitoring(gateThresholdDb: number) {
    const rawData = new Float32Array(256);
    const procData = new Float32Array(256);

    const calculateRmsDb = (analyser: AnalyserNode | null, buffer: Float32Array): number => {
      if (!analyser) return -100;
      analyser.getFloatTimeDomainData(buffer as any);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      if (rms < 0.00001) return -100;
      return 20 * Math.log10(rms);
    };

    const updateLoop = () => {
      if (!this.isRunning) return;

      const rawDb = calculateRmsDb(this.rawAnalyser, rawData);
      const procDb = calculateRmsDb(this.processedAnalyser, procData);

      // Noise gate evaluation
      const shouldOpen = rawDb > gateThresholdDb;
      if (this.gateGainNode && this.audioContext) {
        const now = this.audioContext.currentTime;
        if (shouldOpen !== this.currentGateOpen) {
          this.currentGateOpen = shouldOpen;
          const targetGain = shouldOpen ? 1.0 : 0.04; // -28dB attenuation when gated
          this.gateGainNode.gain.setTargetAtTime(targetGain, now, 0.04);
        }
      }

      if (this.onLevelMeter) {
        this.onLevelMeter({
          rawDb: Math.max(-80, Math.min(0, rawDb)),
          processedDb: Math.max(-80, Math.min(0, procDb)),
          isGateOpen: this.currentGateOpen,
        });
      }

      this.meterRafId = requestAnimationFrame(updateLoop);
    };

    this.meterRafId = requestAnimationFrame(updateLoop);
  }

  public dispose() {
    this.isRunning = false;
    if (this.meterRafId) {
      cancelAnimationFrame(this.meterRafId);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
