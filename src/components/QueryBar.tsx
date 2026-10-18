import React, { useState, useEffect } from 'react';
import { Language, PuneStop } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { PUNE_STOPS } from '../utils/routeFinder';
import { startSpeechRecognition, isSpeechRecognitionSupported } from '../utils/speech';
import { matchLandmarksLocally, guessLandmarkWithGemini, PuneLandmark } from '../utils/landmarkFinder';
import { LandmarkSuggestionBar } from './LandmarkSuggestionBar';
import {
  Mic,
  MicOff,
  Search,
  ArrowRightLeft,
  Sparkles,
  MapPin,
  Compass,
  Camera,
  Shield,
  Navigation
} from 'lucide-react';

interface QueryBarProps {
  language: Language;
  originStopId: string | null;
  destinationStopId: string | null;
  onSelectOrigin: (id: string) => void;
  onSelectDestination: (id: string) => void;
  onSwapStops: () => void;
  onSubmitNaturalQuery: (query: string) => void;
  isLoading: boolean;
  onOpenScannerModal?: () => void;
  onToggleSafetyMode?: () => void;
}

export const QueryBar: React.FC<QueryBarProps> = ({
  language,
  originStopId,
  destinationStopId,
  onSelectOrigin,
  onSelectDestination,
  onSwapStops,
  onSubmitNaturalQuery,
  isLoading,
  onOpenScannerModal,
  onToggleSafetyMode
}) => {
  const t = getTranslation(language);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showManualDropdowns, setShowManualDropdowns] = useState(false);
  const [detectedLandmarks, setDetectedLandmarks] = useState<PuneLandmark[]>([]);

  // As user types or speaks, match Pune landmarks locally first, and fallback to Gemini if no local match
  useEffect(() => {
    const trimmed = inputText.trim();
    if (trimmed.length >= 3) {
      const matches = matchLandmarksLocally(trimmed);
      if (matches.length > 0) {
        setDetectedLandmarks(matches.slice(0, 3));
      } else if (trimmed.length >= 4) {
        const timer = setTimeout(async () => {
          const aiMatches = await guessLandmarkWithGemini(trimmed, language);
          if (aiMatches.length > 0) {
            setDetectedLandmarks(aiMatches.slice(0, 2));
          }
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setDetectedLandmarks([]);
      }
    } else {
      setDetectedLandmarks([]);
    }
  }, [inputText, language]);

  // Demo chips requested by the user prompt
  const demoActionChips = [
    {
      id: 'demo_scan',
      type: 'scanner',
      icon: '📸',
      label: language === 'mr' ? 'बसमधील फलक स्कॅन करा' : language === 'hi' ? 'बस बोर्ड स्कैन करें' : 'Scan a bus',
      badge: 'Gemini Vision'
    },
    {
      id: 'demo_fc_swargate',
      type: 'query',
      icon: '🏛️',
      label: language === 'mr' ? 'फर्ग्युसन कॉलेज ते स्वारगेट' : language === 'hi' ? 'फर्ग्यूसन कॉलेज से स्वारगेट' : 'Fergusson College to Swargate',
      query: language === 'mr' ? 'फर्ग्युसन कॉलेज ते स्वारगेट बस कोणती आहे?' : language === 'hi' ? 'फर्ग्यूसन कॉलेज से स्वारगेट कौनसी बस जाएगी?' : 'From Fergusson College to Swargate bus route'
    },
    {
      id: 'demo_safety',
      type: 'safety',
      icon: '🛡️',
      label: language === 'mr' ? 'सुरक्षा मोड सुरू करा' : language === 'hi' ? 'सुरक्षा मोड ऑन करें' : 'Turn on Safety Mode',
      badge: 'SOS / Live Share'
    }
  ];

  // Pre-loaded realistic sample query chips
  const sampleQueries = [
    {
      label: language === 'mr' ? 'कोथरूड ते स्वारगेट' : language === 'hi' ? 'कोथरूड से स्वारगेट' : 'Kothrud to Swargate',
      query: language === 'mr' ? 'मला कोथरूडहून स्वारगेटला जायचे आहे' : language === 'hi' ? 'कोथरूड डिपो से स्वारगेट कैसे जाऊँ?' : 'From Kothrud to Swargate bus number and timings'
    },
    {
      label: language === 'mr' ? 'स्वारगेट ते हिंजेवाडी फेज ३' : language === 'hi' ? 'स्वारगेट से हिंजेवाड़ी फेज 3' : 'Swargate to Hinjewadi Phase 3',
      query: language === 'mr' ? 'स्वारगेटवरून हिंजेवाडी फेज ३ मेगापोलिस थेट बस आहे का?' : language === 'hi' ? 'स्वारगेट से हिंजेवाड़ी फेज 3 के लिए बस' : 'How to go from Swargate to Hinjewadi Phase 3?'
    },
    {
      label: language === 'mr' ? 'हडपसर ते पुणे स्टेशन' : language === 'hi' ? 'हडपसर से पुणे स्टेशन' : 'Hadapsar to Pune Station',
      query: language === 'mr' ? 'हडपसर गाडीतळ ते पुणे स्टेशन बस सांगा' : language === 'hi' ? 'हडपसर से पुणे रेलवे स्टेशन कौनसी बस जाएगी?' : 'Hadapsar to Pune Station BRTS route'
    },
    {
      label: language === 'mr' ? 'कात्रज ते शिवाजीनगर' : language === 'hi' ? 'कात्रज से शिवाजीनगर' : 'Katraj to Shivajinagar',
      query: language === 'mr' ? 'कात्रज डेपो ते शिवाजीनगर बस' : language === 'hi' ? 'कात्रज से शिवाजीनगर बस रूट' : 'Katraj Depot to Shivajinagar direct bus'
    },
    {
      label: language === 'mr' ? 'डेक्कन ते विमानतळ' : language === 'hi' ? 'डेक्कन से एयरपोर्ट' : 'Deccan to Pune Airport',
      query: language === 'mr' ? 'डेक्कन जिमखान्यावरून पुणे विमानतळावर कसे पोहोचावे?' : language === 'hi' ? 'डेक्कन से पुणे एयरपोर्ट कैसे जाएं?' : 'From Deccan Gymkhana to Pune Airport'
    }
  ];

  const handleStartVoice = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setSpeechError(t.voiceNotSupported);
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    setSpeechError(null);
    startSpeechRecognition(language, {
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript: string) => {
        setIsListening(false);
        setInputText(transcript);
        onSubmitNaturalQuery(transcript);
      },
      onError: (err: string) => {
        setIsListening(false);
        if (err !== 'no-speech') {
          setSpeechError(t.voiceNotSupported);
          setTimeout(() => setSpeechError(null), 4000);
        }
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmitNaturalQuery(inputText.trim());
    }
  };

  const getStopName = (stop: PuneStop) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-4 sm:p-5 transition space-y-3">
      {/* Title / Welcome prompt */}
      <div className="flex items-center justify-between">
        <label className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-1.5">
          <Compass className="w-5 h-5 text-orange-600" />
          <span>{t.heroPrompt}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowManualDropdowns(!showManualDropdowns)}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline flex items-center gap-1 cursor-pointer"
        >
          {showManualDropdowns
            ? (language === 'mr' ? 'मजकूर विचारा' : language === 'hi' ? 'प्रश्न पूछें' : 'Chat input')
            : (language === 'mr' ? 'थेट थांबे निवडा' : language === 'hi' ? 'सीधे स्टॉप चुनें' : 'Select stops')}
        </button>
      </div>

      {/* Main Conversational Input Bar */}
      {!showManualDropdowns ? (
        <form onSubmit={handleFormSubmit} className="relative space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-stone-50 border-2 border-orange-200 focus-within:border-orange-500 rounded-xl p-1.5 sm:p-2 shadow-inner transition">
            <Search className="w-5 h-5 text-stone-400 ml-2 flex-shrink-0" />
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={language === 'mr' ? 'उदा. "फर्ग्युसन कॉलेज ते स्वारगेट", "Phoenix mall" किंवा बोला...' : t.chatPlaceholder}
              className="w-full bg-transparent text-gray-900 placeholder-stone-400 text-sm sm:text-base focus:outline-none px-1 font-medium"
            />

            {/* Scan Bus Photo Button */}
            {onOpenScannerModal && (
              <button
                type="button"
                onClick={onOpenScannerModal}
                className="p-2 sm:px-2.5 sm:py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition flex items-center gap-1 flex-shrink-0 cursor-pointer"
                title={language === 'mr' ? 'बसचा फलक कॅमेऱ्याने स्कॅन करा' : 'Scan Bus Board with Camera'}
              >
                <Camera className="w-4 h-4 text-orange-700" />
                <span className="hidden md:inline">
                  {language === 'mr' ? 'स्कॅन' : language === 'hi' ? 'स्कैन' : 'Scan'}
                </span>
              </button>
            )}

            {/* Mic Button with Speech Recognition */}
            <button
              type="button"
              onClick={handleStartVoice}
              className={`p-2 sm:p-2.5 rounded-lg transition flex items-center justify-center flex-shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-md ring-4 ring-red-200'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
              title={isListening ? 'Listening...' : t.speakPrompt}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* Submit Find Bus Button */}
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:bg-stone-300 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm shadow transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{t.askButton}</span>
            </button>
          </div>

          {/* Real-time Landmark Recognition Banner */}
          {detectedLandmarks.length > 0 && (
            <LandmarkSuggestionBar
              landmarks={detectedLandmarks}
              language={language}
              onSelectLandmarkAsOrigin={lm => {
                onSelectOrigin(lm.nearestStopId);
                setInputText('');
                setDetectedLandmarks([]);
              }}
              onSelectLandmarkAsDestination={lm => {
                onSelectDestination(lm.nearestStopId);
                setInputText('');
                setDetectedLandmarks([]);
              }}
              onDismiss={() => setDetectedLandmarks([])}
            />
          )}

          {/* Listening State Banner */}
          {isListening && (
            <div className="text-xs font-semibold text-red-600 flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>{t.listening} ({t.speakPrompt})</span>
            </div>
          )}

          {speechError && (
            <div className="text-xs font-medium text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {speechError}
            </div>
          )}
        </form>
      ) : (
        /* Manual Origin / Destination Dropdown Controls */
        <div className="space-y-3 bg-stone-50 p-3 rounded-xl border border-orange-100">
          <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
            {/* Origin Stop */}
            <div className="sm:col-span-5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.from}</span>
              </label>
              <select
                value={originStopId || ''}
                onChange={e => onSelectOrigin(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">-- {language === 'mr' ? 'सुरुवातीचा थांबा निवडा' : language === 'hi' ? 'शुरुआती स्टॉप चुनें' : 'Choose origin'} --</option>
                {PUNE_STOPS.map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {getStopName(stop)} ({stop.zone})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
              <button
                type="button"
                onClick={onSwapStops}
                className="p-2 bg-white hover:bg-orange-50 border border-gray-300 rounded-full text-orange-600 shadow-sm transition cursor-pointer"
                title={t.swapStops}
              >
                <ArrowRightLeft className="w-4 h-4 sm:rotate-0 rotate-90" />
              </button>
            </div>

            {/* Destination Stop */}
            <div className="sm:col-span-5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>{t.to}</span>
              </label>
              <select
                value={destinationStopId || ''}
                onChange={e => onSelectDestination(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">-- {language === 'mr' ? 'गंतव्य थांबा निवडा' : language === 'hi' ? 'गंतव्य स्टॉप चुनें' : 'Choose destination'} --</option>
                {PUNE_STOPS.map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {getStopName(stop)} ({stop.zone})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Featured 3 Demo Action Chips + Sample Route Chips */}
      <div className="pt-2 border-t border-stone-100 space-y-2">
        {/* The 3 Featured Request Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {demoActionChips.map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                if (chip.type === 'scanner' && onOpenScannerModal) {
                  onOpenScannerModal();
                } else if (chip.type === 'safety' && onToggleSafetyMode) {
                  onToggleSafetyMode();
                } else if (chip.query) {
                  setInputText(chip.query);
                  onSubmitNaturalQuery(chip.query);
                }
              }}
              className={`text-xs font-black px-3 py-1.5 rounded-xl border shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                chip.type === 'scanner'
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 ring-2 ring-amber-200'
                  : chip.type === 'safety'
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-300 ring-2 ring-rose-200'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300 ring-2 ring-emerald-200'
              }`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
              {chip.badge && (
                <span className="text-[10px] bg-white/80 px-1 py-0.5 rounded font-extrabold text-stone-800">
                  {chip.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Regular Popular Route Chips */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
          {sampleQueries.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(chip.query);
                onSubmitNaturalQuery(chip.query);
              }}
              className="text-xs bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold px-2.5 py-1 rounded-lg border border-stone-200 transition flex items-center gap-1 cursor-pointer"
            >
              <span className="text-orange-600">🚌</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
