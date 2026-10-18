import React from 'react';
import { Language } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { Bus, Wifi, WifiOff, Users, Type, Radio, Camera, Shield, ShieldCheck, Sparkles, Info } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  lowDataMode: boolean;
  onToggleLowData: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
  onOpenReportModal: () => void;
  onOpenCrowdFeed: () => void;
  activeReportCount: number;
  onOpenScannerModal: () => void;
  isSafetyMode: boolean;
  onToggleSafetyMode: () => void;
  onOpenSplash?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  lowDataMode,
  onToggleLowData,
  fontSize,
  onCycleFontSize,
  onOpenReportModal,
  onOpenCrowdFeed,
  activeReportCount,
  onOpenScannerModal,
  isSafetyMode,
  onToggleSafetyMode,
  onOpenSplash
}) => {
  const t = getTranslation(language);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-md">
      {/* Top Banner with PMPML Pride & Live Tracker Ticker */}
      <div className="bg-amber-950/40 px-3 py-1 text-xs border-b border-amber-500/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-amber-200 uppercase font-bold tracking-wider text-[10px]">PMPML LIVE:</span>
            <span className="truncate text-amber-50">
              {language === 'mr'
                ? `पुण्यात ${activeReportCount} बसेसचे थेट प्रवासी स्थान सक्रिय`
                : language === 'hi'
                ? `पुणे में ${activeReportCount} बसों का लाइव स्थान उपलब्ध`
                : `${activeReportCount} community bus locations active across Pune`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenSplash && (
              <button
                type="button"
                onClick={onOpenSplash}
                className="text-[11px] bg-amber-800/80 hover:bg-amber-800 text-amber-100 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                title={language === 'mr' ? 'अॅप माहिती व वैशिष्ट्ये' : language === 'hi' ? 'ऐप जानकारी व फ़ीचर्स' : 'App Overview & Features'}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span className="hidden xs:inline">{language === 'mr' ? 'माहिती' : language === 'hi' ? 'फ़ीचर्स' : 'About'}</span>
              </button>
            )}

            <button
              onClick={onOpenCrowdFeed}
              className="text-[11px] bg-amber-800/80 hover:bg-amber-800 text-amber-100 px-2 py-0.5 rounded flex items-center gap-1 transition"
              title="View Live Crowd Reports"
            >
              <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
              <span>{language === 'mr' ? 'थेट नोंदी' : language === 'hi' ? 'लाइव अपडेट' : 'Live Feed'}</span>
            </button>

            <button
              onClick={onCycleFontSize}
              className="text-[11px] bg-amber-800/80 hover:bg-amber-800 text-amber-100 px-2 py-0.5 rounded flex items-center gap-1 transition"
              title="Change Text Size"
              aria-label="Change Text Size"
            >
              <Type className="w-3 h-3" />
              <span className="font-bold">
                {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* App Title & Branding */}
        <div
          onClick={onOpenSplash}
          className={`flex items-center gap-2.5 min-w-0 ${onOpenSplash ? 'cursor-pointer group' : ''}`}
          title={onOpenSplash ? (language === 'mr' ? 'स्वागत पडदा पहा' : 'View welcome splash') : undefined}
        >
          <div className="w-10 h-10 rounded-xl bg-white text-orange-600 flex items-center justify-center shadow-md flex-shrink-0 border-2 border-orange-200 group-hover:scale-105 transition-transform">
            <Bus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-none text-white truncate group-hover:text-amber-100 transition-colors">
                {t.appName}
              </h1>
              <span className="bg-emerald-700 text-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase hidden sm:inline-block">
                PMPML
              </span>
            </div>
            <p className="text-xs text-amber-100 font-medium truncate mt-0.5">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Action Controls: Low-Data Toggle, Language Switcher, Report Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Low Data Mode Toggle */}
          <button
            onClick={onToggleLowData}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              lowDataMode
                ? 'bg-emerald-800 text-white ring-2 ring-emerald-300'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={lowDataMode ? 'Low-Data Mode Active (No maps, low bandwidth)' : 'Switch to Low-Data Mode'}
          >
            {lowDataMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden xs:inline">{t.lowDataMode}</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 opacity-90" />
                <span className="hidden xs:inline">{t.lowDataMode}</span>
              </>
            )}
          </button>

          {/* Scan Bus Button with Camera Icon */}
          <button
            onClick={onOpenScannerModal}
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-900 px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition border border-amber-300 cursor-pointer"
            title={language === 'mr' ? 'बसचा फलक स्कॅन करा' : language === 'hi' ? 'बस बोर्ड स्कैन करें' : 'Scan Bus Board (Camera)'}
          >
            <Camera className="w-3.5 h-3.5 text-stone-950" />
            <span className="hidden sm:inline">
              {language === 'mr' ? 'बस स्कॅन' : language === 'hi' ? 'स्कैन बस' : 'Scan Bus'}
            </span>
          </button>

          {/* Women's Safety Mode Toggle */}
          <button
            onClick={onToggleSafetyMode}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isSafetyMode
                ? 'bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isSafetyMode ? 'Safety Mode Active' : 'Enable Safety Mode'}
          >
            <Shield className={`w-3.5 h-3.5 ${isSafetyMode ? 'text-white' : 'text-rose-200'}`} />
            <span className="hidden sm:inline">
              {language === 'mr' ? 'सुरक्षा मोड' : language === 'hi' ? 'सुरक्षा' : 'Safety Mode'}
            </span>
          </button>

          {/* Language Switcher Buttons */}
          <div className="inline-flex rounded-lg bg-amber-900/60 p-0.5 border border-amber-400/40 shadow-inner">
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                language === 'mr'
                  ? 'bg-white text-orange-700 shadow'
                  : 'text-amber-100 hover:text-white'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                language === 'hi'
                  ? 'bg-white text-orange-700 shadow'
                  : 'text-amber-100 hover:text-white'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                language === 'en'
                  ? 'bg-white text-orange-700 shadow'
                  : 'text-amber-100 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Quick "I'm on this bus" Report Trigger */}
          <button
            onClick={onOpenReportModal}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow flex items-center gap-1 border border-emerald-400 transition"
            title={t.reportOnBus}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.reportOnBus}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
