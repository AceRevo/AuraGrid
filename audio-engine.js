/**
 * Audio Engine & MIDI FX Synthesizer
 * 
 * Provides:
 * 1. Web Audio API Master Context with low-latency AnalyserNode (60 FPS CAVA).
 * 2. 3-Band Parametric Equalizer:
 *    - Bass / Bajos (LowShelf @ 120Hz)
 *    - Mids / Medios (Peaking @ 1000Hz, Q=1.0)
 *    - Treble / Agudos (HighShelf @ 3800Hz)
 * 3. Real-time Parametric EQ Frequency Response Curve generator for Studio visual display.
 * 4. MIDI-style FX Processor:
 *    - Drive / Distortion (WaveShaper with analogue tube curve)
 *    - True Wet/Dry Echo / Delay (0% delay by default - zero audio doubling)
 * 5. Desktop / System Audio Capture (WASAPI / Stereo Mix / Microphone loopback):
 *    - Captures Spotify, YouTube, browser, games, VLC, Discord, etc.
 *    - Mutes speaker loopback to prevent acoustic echo / feedback.
 * 6. Logarithmic 16-Band Musical Frequency Scaling (Sub-bass to Air Treble).
 * 7. Bass Kick Energy detector for Bongo Cat beat-synchronization.
 * 8. Procedural 120 BPM Synthwave / Lofi chord synthesizer fallback.
 * 
 * Open Source - CubeWorld Architecture
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.isPlaying = false;
    this.isSystemCaptureActive = false;
    this.systemStream = null;
    this.streamSourceNode = null;
    this.timer = null;
    this.step = 0;
    this.listeners = new Set();
    this.sourceModeListeners = new Set();

    // 128-bin frequency buffer (for high-fidelity logarithmic mapping)
    this.rawFreqData = new Uint8Array(64);
    // 16-band musically scaled output buffer
    this.log16Data = new Uint8Array(16);
    // 64-sample buffer for Oscilloscope waveform
    this.timeDomainData = new Uint8Array(64);

    // Parametric Equalizer Nodes
    this.bassFilter = null;
    this.midFilter = null;
    this.trebleFilter = null;

    // FX Nodes
    this.delayNode = null;
    this.delayGain = null;
    this.feedbackNode = null;
    this.distortionNode = null;
    this.masterGain = null;
    this.mediaSourceNode = null;

    // EQ / MIDI Current Parameters (Echo = 0 by default to prevent audio doubling!)
    this.params = {
      bass: 0,          // -12dB to +12dB
      mids: 0,          // -12dB to +12dB
      treble: 0,        // -12dB to +12dB
      drive: 0,         // 0 to 40
      echo: 0,          // 0 to 0.60 (CLEAN 0% by default)
      volume: 75,       // 0 to 100
      filterCutoff: 3200 // 400Hz to 12000Hz
    };

    // Preset Bank
    this.presets = {
      flat: { bass: 0, mids: 0, treble: 0, echo: 0, drive: 0 },
      bass: { bass: 8, mids: -2, treble: 2, echo: 0, drive: 5 },
      vocal: { bass: -4, mids: 7, treble: 4, echo: 0, drive: 0 },
      treble: { bass: -3, mids: 1, treble: 8, echo: 0, drive: 0 },
      lofi: { bass: 5, mids: -2, treble: -6, echo: 0.25, drive: 14 }
    };

    // Synth Musical Scale: Cm9 (C, Eb, G, Bb, D)
    this.notes = [261.63, 311.13, 392.00, 466.16, 587.33, 523.25, 466.16, 392.00];

    // Logarithmic Band Center Frequencies (Hz) for 16 Bands (30Hz to 16kHz)
    this.bandFrequencies = [
      40, 65, 100, 160, 250, 400, 630, 1000, 
      1600, 2500, 4000, 6300, 8000, 10000, 12500, 15000
    ];
  }

  /**
   * Initializes Web Audio context and builds the DSP graph
   */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // 1. Analyser Node for CAVA Visualizer (fftSize 128 = 64 frequency bins for crisp detail)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;
    this.rawFreqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);

    // 2. Parametric 3-Band Equalizer
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.bassFilter.gain.setValueAtTime(this.params.bass, this.ctx.currentTime);

    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    this.midFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    this.midFilter.gain.setValueAtTime(this.params.mids, this.ctx.currentTime);

    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(3800, this.ctx.currentTime);
    this.trebleFilter.gain.setValueAtTime(this.params.treble, this.ctx.currentTime);

    // 3. Distortion / Drive (WaveShaper)
    this.distortionNode = this.ctx.createWaveShaper();
    this.setDrive(this.params.drive);

    // 4. True Wet/Dry Delay Pipeline
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime);

    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(this.params.echo, this.ctx.currentTime); // 0 by default!

    this.feedbackNode = this.ctx.createGain();
    this.feedbackNode.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // Delay loop: delayNode -> feedbackNode -> delayNode
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);

    // Delay output routes through delayGain into analyser
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.analyser);

    // 5. Master Gain Node
    this.masterGain = this.ctx.createGain();
    const targetGain = (this.params.volume / 100) * 0.50;
    this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

    // Routing:
    // Input -> bassFilter -> midFilter -> trebleFilter -> distortionNode -> analyser -> masterGain -> destination
    //                                                           \-> delayNode (only when delayGain > 0)
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.distortionNode);

    // Dry path
    this.distortionNode.connect(this.analyser);
    // Wet delay input
    this.distortionNode.connect(this.delayNode);

    // Main output
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * Connects a local HTML5 <audio> element to the Web Audio pipeline
   */
  connectMediaElement(audioEl) {
    this.init();
    this.stopProcedural();
    this.stopSystemAudioCapture();

    try {
      if (this.mediaSourceNode) {
        this.mediaSourceNode.disconnect();
      }
      this.mediaSourceNode = this.ctx.createMediaElementSource(audioEl);
      this.mediaSourceNode.connect(this.bassFilter);
    } catch (err) {
      console.warn('MediaElementSource already connected or error:', err);
    }

    // Ensure master gain is audible
    if (this.masterGain && this.ctx) {
      const targetGain = (this.params.volume / 100) * 0.50;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
  }

  // --- System Audio / Desktop / Microphone Capture ---

  /**
   * Starts capturing system desktop audio (Spotify, Chrome, YouTube, Games)
   * or microphone loopback. Analyzes frequencies without echoing back to speakers.
   */
  async startSystemAudioCapture() {
    this.init();
    this.stopProcedural();

    // Stop any previous stream
    if (this.systemStream) {
      this.systemStream.getTracks().forEach(t => t.stop());
      this.systemStream = null;
    }

    try {
      let stream = null;

      // 1. Try Electron native desktopCapturer audio loopback via IPC
      if (typeof window !== 'undefined' && typeof window.require === 'function') {
        try {
          const { ipcRenderer } = window.require('electron');
          const sources = await ipcRenderer.invoke('get-desktop-sources', { types: ['screen'] });
          if (sources && sources.length > 0) {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sources[0].id
                }
              },
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sources[0].id
                }
              }
            });
            // Stop video track immediately to conserve GPU/CPU
            stream.getVideoTracks().forEach(track => track.stop());
          }
        } catch (e) {
          console.warn('Desktop capturer not supported, falling back to getUserMedia:', e);
        }
      }

      // 2. Fallback to standard audio input (Microphone / Stereo Mix)
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          },
          video: false
        });
      }

      this.systemStream = stream;

      if (this.streamSourceNode) {
        try { this.streamSourceNode.disconnect(); } catch (e) {}
      }

      this.streamSourceNode = this.ctx.createMediaStreamSource(stream);
      this.streamSourceNode.connect(this.bassFilter);

      // Mute masterGain output to speakers so user does NOT hear double audio!
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }

      this.isSystemCaptureActive = true;
      this.isPlaying = true;
      this.notifySourceMode('system');
      this.notifyState();
      return true;
    } catch (err) {
      console.error('Could not capture system audio:', err);
      alert('No se pudo acceder a la captura de audio: ' + (err.message || err));
      return false;
    }
  }

  /**
   * Stops system audio capture and restores normal speaker output
   */
  stopSystemAudioCapture() {
    if (!this.isSystemCaptureActive && !this.systemStream) return;

    if (this.systemStream) {
      this.systemStream.getTracks().forEach(t => t.stop());
      this.systemStream = null;
    }
    if (this.streamSourceNode) {
      try { this.streamSourceNode.disconnect(); } catch (e) {}
      this.streamSourceNode = null;
    }

    this.isSystemCaptureActive = false;

    // Restore speaker gain
    if (this.masterGain && this.ctx) {
      const targetGain = (this.params.volume / 100) * 0.50;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }

    this.notifySourceMode('local');
  }

  // --- Real-time Equalizer & FX Parameter Setters ---

  setBass(db) {
    this.params.bass = db;
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setTargetAtTime(db, this.ctx.currentTime, 0.04);
    }
  }

  setMids(db) {
    this.params.mids = db;
    if (this.midFilter && this.ctx) {
      this.midFilter.gain.setTargetAtTime(db, this.ctx.currentTime, 0.04);
    }
  }

  setTreble(db) {
    this.params.treble = db;
    if (this.trebleFilter && this.ctx) {
      this.trebleFilter.gain.setTargetAtTime(db, this.ctx.currentTime, 0.04);
    }
  }

  setEcho(amount) {
    this.params.echo = amount;
    if (this.delayGain && this.ctx) {
      this.delayGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.04);
    }
  }

  setDrive(amount) {
    this.params.drive = amount;
    if (this.isBypassed) return;
    if (!this.distortionNode || !this.ctx) return;
    if (amount <= 0) {
      this.distortionNode.curve = null;
      return;
    }
    const k = amount * 3.5;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionNode.curve = curve;
  }

  setBypass(bypassed) {
    this.isBypassed = !!bypassed;
    if (!this.ctx) return;

    if (this.isBypassed) {
      // Temporarily flatten DSP without erasing user params
      if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.midFilter) this.midFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.distortionNode) this.distortionNode.curve = null;
      if (this.delayGain) this.delayGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    } else {
      // Restore active user params
      this.setBass(this.params.bass);
      this.setMids(this.params.mids);
      this.setTreble(this.params.treble);
      this.setDrive(this.params.drive);
      this.setEcho(this.params.echo);
    }
    return this.isBypassed;
  }

  playBongoTap(isHighPitch = false) {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = isHighPitch ? 320 : 210;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.035);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, t + 0.15);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  setVolume(volPct) {
    this.params.volume = volPct;
    if (this.masterGain && this.ctx && !this.isSystemCaptureActive) {
      const targetGain = (volPct / 100) * 0.50;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
    }
  }

  applyPreset(presetKey) {
    const p = this.presets[presetKey];
    if (!p) return;
    this.setBass(p.bass);
    this.setMids(p.mids);
    this.setTreble(p.treble);
    this.setEcho(p.echo);
    this.setDrive(p.drive);
    return p;
  }

  // --- Real-time Studio Parametric EQ Curve Calculation ---

  /**
   * Evaluates the frequency response of the 3-band parametric EQ
   * across 60 points from 20Hz to 20kHz, scaled to canvas coordinates (w, h).
   */
  getEQCurvePoints(width, height) {
    const numPoints = 64;
    const points = [];
    const minFreq = 20;
    const maxFreq = 20000;

    const bass = this.params.bass;
    const mids = this.params.mids;
    const treble = this.params.treble;

    const midY = height / 2;
    const maxDb = 14; // +/- 14dB range

    for (let i = 0; i < numPoints; i++) {
      // Logarithmic frequency progression
      const fraction = i / (numPoints - 1);
      const freq = minFreq * Math.pow(maxFreq / minFreq, fraction);

      // LowShelf response approximation
      const bassResp = bass / (1 + Math.pow(freq / 120, 2));

      // Peaking Mid response approximation (Q=1.0)
      const midRatio = freq / 1000;
      const midResp = mids / (1 + Math.pow((midRatio - 1 / midRatio) * 1.0, 2));

      // HighShelf response approximation
      const trebleResp = treble / (1 + Math.pow(3800 / freq, 2));

      const totalDb = bassResp + midResp + trebleResp;
      const y = midY - (totalDb / maxDb) * (midY - 6);
      const x = fraction * width;

      points.push({ x, y: Math.max(4, Math.min(height - 4, y)) });
    }

    return points;
  }

  // --- Logarithmic Frequency & Waveform Data for CAVA ---

  /**
   * Retrieves 16 musically scaled frequency bands (Sub-bass, Bass, Mids, Highs)
   * with pre-emphasis so all ranges exhibit vivid energy.
   */
  getLogFrequencyData() {
    if (this.analyser && (this.isPlaying || this.isSystemCaptureActive)) {
      this.analyser.getByteFrequencyData(this.rawFreqData);

      const binCount = this.rawFreqData.length;
      for (let i = 0; i < 16; i++) {
        // Map 16 bands across 64 bins with exponential grouping
        const startBin = Math.floor(Math.pow(i / 16, 1.8) * (binCount - 2));
        const endBin = Math.max(startBin + 1, Math.floor(Math.pow((i + 1) / 16, 1.8) * binCount));

        let sum = 0;
        let count = 0;
        for (let b = startBin; b < endBin && b < binCount; b++) {
          sum += this.rawFreqData[b];
          count++;
        }
        const avg = count > 0 ? (sum / count) : 0;
        // High-frequency pre-emphasis boost for human ear compensation
        const boost = 1.0 + (i * 0.045);
        this.log16Data[i] = Math.min(255, Math.floor(avg * boost));
      }
    } else {
      // Gentle idle wave when paused
      for (let i = 0; i < 16; i++) {
        this.log16Data[i] = Math.max(0, Math.floor(Math.sin(Date.now() / 450 + i * 0.45) * 10 + 6));
      }
    }
    return this.log16Data;
  }

  getFrequencyData() {
    if (this.analyser && (this.isPlaying || this.isSystemCaptureActive)) {
      this.analyser.getByteFrequencyData(this.rawFreqData);
      return this.rawFreqData;
    }
    return this.rawFreqData;
  }

  getTimeDomainData() {
    if (this.analyser && (this.isPlaying || this.isSystemCaptureActive)) {
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    } else {
      for (let i = 0; i < this.timeDomainData.length; i++) {
        this.timeDomainData[i] = 128 + Math.floor(Math.sin(Date.now() / 300 + i * 0.2) * 6);
      }
    }
    return this.timeDomainData;
  }

  /**
   * Bass Kick Energy Detector: Returns a normalized 0.0 - 1.0 energy metric
   * based on lowest sub-bass and bass frequency bands (bands 0-2).
   * Used for Bongo Cat head-bobbing and rhythm reactivity.
   */
  getBassEnergy() {
    if (!this.isPlaying && !this.isSystemCaptureActive) return 0;
    const f = this.getLogFrequencyData();
    const sum = (f[0] + f[1] + f[2]);
    return sum / (3 * 255);
  }

  // --- Procedural Synth Fallback ---

  stopProcedural() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  start() {
    this.init();
    this.stopSystemAudioCapture();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying && this.timer) return;

    this.isPlaying = true;
    this.step = 0;

    // 120 BPM step sequencer (16th notes = 125ms)
    const stepInterval = (60 / 120 / 4) * 1000;
    this.timer = setInterval(() => this.tick(), stepInterval);
    this.notifyState();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopProcedural();
    this.stopSystemAudioCapture();
    this.notifyState();
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  tick() {
    if (!this.ctx || !this.isPlaying || this.isSystemCaptureActive) return;

    const time = this.ctx.currentTime;
    const s = this.step % 16;

    // Kick Drum (every 4 steps)
    if (s % 4 === 0) {
      this.playKick(time);
    }

    // Snare Drum (steps 4 and 12)
    if (s === 4 || s === 12) {
      this.playSnare(time);
    }

    // Hi-Hat on offbeats
    if (s % 2 === 1) {
      this.playHihat(time);
    }

    // Melodic Arpeggiator
    if (s % 2 === 0) {
      const note = this.notes[(Math.floor(this.step / 2)) % this.notes.length];
      this.playSynthNote(note, time);
    }

    this.step++;
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);
    
    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    
    osc.connect(gain);
    gain.connect(this.bassFilter);
    
    osc.start(time);
    osc.stop(time + 0.35);
  }

  playSnare(time) {
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.midFilter);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  playHihat(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.trebleFilter);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  playSynthNote(freq, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.params.filterCutoff, time);

    gain.gain.setValueAtTime(0.20, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassFilter);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  onStateChange(fn) {
    this.listeners.add(fn);
  }

  notifyState() {
    this.listeners.forEach(fn => fn(this.isPlaying));
  }

  onSourceModeChange(fn) {
    this.sourceModeListeners.add(fn);
  }

  notifySourceMode(mode) {
    this.sourceModeListeners.forEach(fn => fn(mode));
  }
}

export const audio = new AudioEngine();
