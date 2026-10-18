import { PuneStop, Language } from '../types/pmpml';
import { speakText } from './speech';

export interface AlightReminderConfig {
  id: string;
  routeNumber: string;
  destinationStop: PuneStop;
  intermediateStops: PuneStop[];
  totalDurationMinutes: number;
  triggerMinutesBefore: number; // e.g. 2 minutes before
  triggerStopsBefore: number;   // e.g. 1 stop before
  createdAt: number;
  estimatedArrivalTimestamp: number;
  currentSimulatedStopIndex: number;
  isActive: boolean;
  hasTriggered: boolean;
}

class AlightReminderManager {
  private activeReminder: AlightReminderConfig | null = null;
  private intervalId: number | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('punebus_alight_reminder_v1');
      if (stored) {
        const parsed: AlightReminderConfig = JSON.parse(stored);
        if (parsed.isActive && parsed.estimatedArrivalTimestamp > Date.now()) {
          this.activeReminder = parsed;
          this.startMonitoring();
        }
      }
    } catch {
      // Ignore
    }
  }

  private saveToStorage() {
    try {
      if (this.activeReminder) {
        localStorage.setItem('punebus_alight_reminder_v1', JSON.stringify(this.activeReminder));
      } else {
        localStorage.removeItem('punebus_alight_reminder_v1');
      }
    } catch {
      // Ignore
    }
    this.notify();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getActiveReminder(): AlightReminderConfig | null {
    return this.activeReminder;
  }

  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  /**
   * Set up a new alight reminder
   */
  public setReminder(params: {
    routeNumber: string;
    destinationStop: PuneStop;
    intermediateStops: PuneStop[];
    totalDurationMinutes: number;
    triggerMinutesBefore?: number;
    triggerStopsBefore?: number;
  }) {
    const triggerMinutesBefore = params.triggerMinutesBefore ?? 2;
    const triggerStopsBefore = params.triggerStopsBefore ?? 1;

    // Estimated arrival timestamp based on duration
    const estimatedArrivalTimestamp = Date.now() + params.totalDurationMinutes * 60 * 1000;

    this.activeReminder = {
      id: 'rem_' + Date.now(),
      routeNumber: params.routeNumber,
      destinationStop: params.destinationStop,
      intermediateStops: params.intermediateStops,
      totalDurationMinutes: params.totalDurationMinutes,
      triggerMinutesBefore,
      triggerStopsBefore,
      createdAt: Date.now(),
      estimatedArrivalTimestamp,
      currentSimulatedStopIndex: 0,
      isActive: true,
      hasTriggered: false
    };

    this.saveToStorage();
    this.startMonitoring();
    this.playSubtleBeep();
  }

  /**
   * Cancel or dismiss the active reminder
   */
  public cancelReminder() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeReminder = null;
    this.saveToStorage();
  }

  /**
   * Fast-Forward for Judges & Quick Demo Testing:
   * Instantly advances the simulated bus position to right before the destination stop
   * and triggers the alarm immediately!
   */
  public triggerDemoAlert(lang: Language = 'mr') {
    if (!this.activeReminder) return;

    this.activeReminder.estimatedArrivalTimestamp = Date.now() + 30 * 1000; // 30 seconds away
    this.activeReminder.currentSimulatedStopIndex = Math.max(0, this.activeReminder.intermediateStops.length);
    this.fireAlarm(lang);
  }

  /**
   * Background monitoring of progress
   */
  private startMonitoring() {
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = window.setInterval(() => {
      if (!this.activeReminder || !this.activeReminder.isActive) {
        if (this.intervalId) clearInterval(this.intervalId);
        return;
      }

      const now = Date.now();
      const timeRemainingMs = this.activeReminder.estimatedArrivalTimestamp - now;
      const timeRemainingMinutes = timeRemainingMs / (60 * 1000);

      // Advance stop index gradually
      const totalStops = this.activeReminder.intermediateStops.length + 1;
      const elapsedTimeMs = now - this.activeReminder.createdAt;
      const totalExpectedMs = this.activeReminder.totalDurationMinutes * 60 * 1000;
      const progressRatio = Math.min(1, Math.max(0, elapsedTimeMs / totalExpectedMs));
      this.activeReminder.currentSimulatedStopIndex = Math.min(
        totalStops - 1,
        Math.floor(progressRatio * totalStops)
      );

      // Check if threshold reached
      if (!this.activeReminder.hasTriggered && timeRemainingMinutes <= this.activeReminder.triggerMinutesBefore) {
        this.fireAlarm('mr');
      }

      // Check if past arrival time by more than 10 mins, auto-clear
      if (timeRemainingMinutes < -10) {
        this.cancelReminder();
      }

      this.saveToStorage();
    }, 5000);
  }

  /**
   * Fire the alarm across Browser Notification, Audio Chime, Haptic, and Speech
   */
  public fireAlarm(lang: Language = 'mr') {
    if (!this.activeReminder) return;
    this.activeReminder.hasTriggered = true;
    this.saveToStorage();

    const dest = this.activeReminder.destinationStop;
    const destName = lang === 'mr' ? dest.name_mr : lang === 'hi' ? dest.name_hi : dest.name;

    // 1. Browser Notification API
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🔔 PuneBus Saathi: ${destName}`, {
          body: lang === 'mr'
            ? `तुमचा थांबा (${destName}) जवळ आला आहे! कृपया उतरण्यासाठी दाराजवळ जा आणि सामानाची काळजी घ्या.`
            : lang === 'hi'
            ? `आपका स्टॉप (${destName}) आ रहा है! कृपया उतरने के लिए तैयार हों और अपना सामान जांच लें।`
            : `Your stop (${destName}) is approaching! Please prepare to alight and check your belongings.`,
          icon: '/favicon.ico',
          tag: 'alight-reminder'
        });
      } catch (err) {
        console.warn('Browser notification failed:', err);
      }
    }

    // 2. Synthesize High-Visibility Audio Chime via Web Audio API
    this.playTransitChime();

    // 3. Haptic vibration (if mobile browser supports)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 600]);
      } catch {
        // Ignore
      }
    }

    // 4. Spoken voice announcement
    const announcement = lang === 'mr'
      ? `लक्ष द्या! पुढचा थांबा ${destName} आहे. उतरायला तयार व्हा.`
      : lang === 'hi'
      ? `ध्यान दें! अगला स्टॉप ${destName} है। उतरने के लिए तैयार रहें।`
      : `Attention! Next stop is ${destName}. Please prepare to get off.`;

    setTimeout(() => {
      speakText(announcement, lang);
    }, 1200);

    this.notify();
  }

  /**
   * Web Audio API synthesized two-tone transit chime (like Metro/Airport bell)
   */
  public playTransitChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: G#5 (830.61 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, now + 0.25);
      gain2.gain.setValueAtTime(0, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.45, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 0.9);

      // Tone 3: B5 (987.77 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(987.77, now + 0.5);
      gain3.gain.setValueAtTime(0, now + 0.5);
      gain3.gain.linearRampToValueAtTime(0.5, now + 0.55);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.5);
      osc3.stop(now + 1.3);
    } catch {
      // AudioContext may be restricted before user gesture
    }
  }

  public playSubtleBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore
    }
  }
}

export const alightReminderManager = new AlightReminderManager();
