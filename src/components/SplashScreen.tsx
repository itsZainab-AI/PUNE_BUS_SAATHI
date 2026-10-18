import React, { useState, useEffect } from 'react';
import { Language } from '../types/pmpml';
import {
  Bus,
  Camera,
  MapPin,
  ShieldCheck,
  Bell,
  ArrowRight,
  Sparkles,
  Radio,
  CheckCircle2,
  X
} from 'lucide-react';

interface SplashScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onDismiss: () => void;
  autoDismissSeconds?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  language,
  onLanguageChange,
  onDismiss,
  autoDismissSeconds = 3,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const transitHubs = [
    { name_mr: 'कात्रज', name_en: 'Katraj' },
    { name_mr: 'स्वारगेट', name_en: 'Swargate' },
    { name_mr: 'डेक्कन', name_en: 'Deccan' },
    { name_mr: 'शिवाजीनगर', name_en: 'Shivajinagar' },
    { name_mr: 'पुणे स्टेशन', name_en: 'Pune Station' },
    { name_mr: 'हिंजेवाडी', name_en: 'Hinjewadi' },
  ];

  const features = [
    {
      icon: Camera,
      color: 'from-amber-500 to-orange-500',
      title_mr: 'बस बोर्ड स्कॅनर',
      title_hi: 'बस बोर्ड स्कैनर',
      title_en: 'Bus Photo Scanner',
      desc_mr: 'बसच्या फलकाचा फोटो काढा व मार्ग तपासा',
      desc_hi: 'बस बोर्ड की फ़ोटो खींचकर रूट जानें',
      desc_en: 'Snap bus board photo to verify route',
    },
    {
      icon: MapPin,
      color: 'from-emerald-500 to-teal-500',
      title_mr: '४०+ पुणे लँडमार्क',
      title_hi: '40+ पुणे लैंडमार्क',
      title_en: '40+ Pune Landmarks',
      desc_mr: 'कॉलेज, मॉल, आयटी पार्क नावाने थेट शोध',
      desc_hi: 'कॉलेज, मॉल और आईटी पार्क से सीधी खोज',
      desc_en: 'Colleges, malls & IT parks smart search',
    },
    {
      icon: ShieldCheck,
      color: 'from-rose-500 to-pink-500',
      title_mr: 'महिला सुरक्षा & SOS',
      title_hi: 'महिला सुरक्षा और SOS',
      title_en: "Women's Safety & SOS",
      desc_mr: 'लाईव्ह लोकेशन शेअरिंग व ५ सेकंद SOS',
      desc_hi: 'लाइव लोकेशन शेयर और त्वरित SOS अलर्ट',
      desc_en: 'Live location share & 5s SOS emergency',
    },
    {
      icon: Bell,
      color: 'from-sky-500 to-blue-500',
      title_mr: 'उतरण्याचा अलार्म',
      title_hi: 'स्टॉप अलर्ट अलार्म',
      title_en: 'Alight Stop Alert',
      desc_mr: 'थांब्याआधी आपोआप रिंग व व्हायब्रेशन',
      desc_hi: 'स्टॉप आने से पहले रिंग व वाइब्रेशन',
      desc_en: 'Vibration & ring before your bus stop',
    },
  ];

  // Progress animation and auto-step cycling
  useEffect(() => {
    const totalDurationMs = autoDismissSeconds * 1000;
    const intervalTime = 30;
    const increment = 100 / (totalDurationMs / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          handleClose();
          return 100;
        }
        return next;
      });
    }, intervalTime);

    // Rotate through transit hubs every 500ms
    const hubInterval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % transitHubs.length);
    }, 600);

    return () => {
      clearInterval(timer);
      clearInterval(hubInterval);
    };
  }, [autoDismissSeconds]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss();
    }, 350);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PuneBus Saathi Welcome"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/90 backdrop-blur-md transition-opacity duration-300 ${
        isClosing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] bg-gradient-to-tr from-amber-600/20 via-orange-500/25 to-rose-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-2xl" />
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-lg bg-[#181412]/95 border border-amber-500/30 rounded-3xl p-5 sm:p-7 text-white shadow-2xl shadow-black/80 flex flex-col justify-between overflow-hidden">
        {/* Subtle Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        {/* Header Controls: Language switcher and Skip button */}
        <div className="flex items-center justify-between gap-2 pb-2">
          {/* Language Selector */}
          <div className="inline-flex items-center p-1 bg-stone-900/80 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => onLanguageChange('mr')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                language === 'mr'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              मराठी
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('hi')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                language === 'hi'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                language === 'en'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          {/* Quick Skip button */}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-100 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-xl transition cursor-pointer"
            aria-label="Skip splash screen"
          >
            <span>{language === 'mr' ? 'वगळा' : language === 'hi' ? 'छोड़ें' : 'Skip'}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Centerpiece Hero Emblem & Title */}
        <div className="text-center my-3 sm:my-4 flex flex-col items-center">
          {/* Illuminated Bus Emblem */}
          <div className="relative mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-orange-500/30 border-2 border-amber-300/40 transform transition hover:scale-105">
              <Bus className="w-9 h-9 sm:w-11 sm:h-11 text-stone-950 stroke-[2.2]" />
            </div>
            {/* Live Beacon Indicator */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-stone-900" />
            </span>
          </div>

          {/* App Titles */}
          <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight leading-none mb-1">
            {language === 'mr' ? 'पुणे बस साथी' : language === 'hi' ? 'पुणे बस साथी' : 'PuneBus Saathi'}
          </h1>
          <p className="text-xs font-semibold text-amber-400/90 tracking-widest uppercase">
            PMPML SMART TRANSIT
          </p>

          <p className="text-xs sm:text-sm text-stone-300 font-medium max-w-sm mt-1.5 leading-relaxed">
            {language === 'mr'
              ? 'पुणेकरांचा हक्काचा, अचूक आणि सुरक्षित बस प्रवास मार्गदर्शक'
              : language === 'hi'
              ? 'पुणे का विश्वसनीय, सटीक और सुरक्षित बस यात्रा साथी'
              : "Pune's intelligent, crowd-verified & safe bus companion"}
          </p>
        </div>

        {/* Clutter-Free Feature Grid (2x2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 my-2">
          {features.map((item, idx) => {
            const Icon = item.icon;
            const title =
              language === 'mr'
                ? item.title_mr
                : language === 'hi'
                ? item.title_hi
                : item.title_en;
            const desc =
              language === 'mr'
                ? item.desc_mr
                : language === 'hi'
                ? item.desc_hi
                : item.desc_en;

            return (
              <div
                key={idx}
                className="bg-stone-900/70 border border-white/5 rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5 transition hover:border-amber-500/30 hover:bg-stone-900"
              >
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 text-stone-950 shadow-sm mt-0.5`}
                >
                  <Icon className="w-4 h-4 stroke-[2.4]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-stone-100 truncate">{title}</div>
                  <div className="text-[11px] text-stone-400 leading-tight mt-0.5">{desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Route Corridor Visualization */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>
                {language === 'mr'
                  ? 'थेट मार्ग नेटवर्क जोडत आहे...'
                  : language === 'hi'
                  ? 'लाइव रूट नेटवर्क कनेक्ट हो रहा है...'
                  : 'Connecting live PMPML network...'}
              </span>
            </span>
            <span className="font-mono text-stone-400 text-[10px]">
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>

          {/* Animated Route Line */}
          <div className="relative w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 transition-all duration-75 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Transit Hubs Ticker */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium px-1">
            {transitHubs.map((hub, i) => {
              const isActive = i === activeStepIndex;
              return (
                <span
                  key={i}
                  className={`transition-all duration-200 ${
                    isActive
                      ? 'text-amber-300 font-bold scale-105'
                      : 'text-stone-500'
                  }`}
                >
                  {language === 'en' ? hub.name_en : hub.name_mr}
                </span>
              );
            })}
          </div>
        </div>

        {/* Primary CTA Button: Instant Start */}
        <div className="mt-4 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-sm py-3 px-4 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition cursor-pointer transform active:scale-[0.98]"
          >
            <span>
              {language === 'mr'
                ? 'प्रवास सुरू करा'
                : language === 'hi'
                ? 'यात्रा शुरू करें'
                : 'Start Journey'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
