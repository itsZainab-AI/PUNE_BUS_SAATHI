import { Language } from '../types/pmpml';

// Map app language to BCP 47 speech recognition language codes
export function getSpeechLangCode(lang: Language): string {
  switch (lang) {
    case 'mr':
      return 'mr-IN'; // Marathi (India)
    case 'hi':
      return 'hi-IN'; // Hindi (India)
    case 'en':
    default:
      return 'en-IN'; // Indian English
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  onStart: () => void;
}

export function startSpeechRecognition(
  lang: Language,
  handlers: SpeechRecognitionHandlers
): { stop: () => void } {
  if (!isSpeechRecognitionSupported()) {
    handlers.onError('Speech recognition not supported in this browser.');
    return { stop: () => {} };
  }

  // @ts-ignore
  const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechClass();

  recognition.lang = getSpeechLangCode(lang);
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    handlers.onStart();
  };

  recognition.onresult = (event: any) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0][0]?.transcript || '';
      handlers.onResult(transcript);
    }
  };

  recognition.onerror = (event: any) => {
    console.warn('Speech recognition error:', event.error);
    handlers.onError(event.error || 'Speech error');
  };

  recognition.onend = () => {
    handlers.onEnd();
  };

  try {
    recognition.start();
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    handlers.onError('Could not start microphone');
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    }
  };
}

// Browser Text-To-Speech (Web Speech API)
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, lang: Language, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLangCode(lang);
  utterance.rate = 0.95; // slightly slower for high clarity

  // Look for matching voice
  const voices = window.speechSynthesis.getVoices();
  const langCode = getSpeechLangCode(lang);
  const voice = voices.find(v => v.lang.startsWith(langCode) || v.lang.replace('_', '-').startsWith(langCode));
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}
