import React, { useState } from 'react';
import { Language, PuneRoute, PuneStop } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { createTripShareUrl } from '../utils/safetyMode';
import {
  Moon,
  ShieldAlert,
  Share2,
  Clock,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Shield,
  Users
} from 'lucide-react';

interface NightSafetyCardProps {
  route: PuneRoute;
  destinationStop: PuneStop;
  etaMinutes: number;
  language: Language;
  onTriggerSos: () => void;
  onOpenContactsModal: () => void;
  onSetAlightReminder: () => void;
}

export const NightSafetyCard: React.FC<NightSafetyCardProps> = ({
  route,
  destinationStop,
  etaMinutes,
  language,
  onTriggerSos,
  onOpenContactsModal,
  onSetAlightReminder
}) => {
  const [isSharing, setIsSharing] = useState(false);

  const now = new Date();
  const currentHour = now.getHours();
  // Check if after 8 PM (20:00) or early morning before 6 AM
  const isNightTime = currentHour >= 20 || currentHour < 6;

  const getStopName = (stop: PuneStop) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  const getSafetyNote = (stop: PuneStop) => {
    if (language === 'mr') return stop.nightSafetyNote_mr || stop.nightSafetyNote;
    if (language === 'hi') return stop.nightSafetyNote_hi || stop.nightSafetyNote;
    return stop.nightSafetyNote;
  };

  const handleShareTrip = async () => {
    setIsSharing(true);
    try {
      const destName = getStopName(destinationStop);
      const url = await createTripShareUrl({
        routeNumber: route.routeNumber,
        routeName: language === 'mr' ? route.name_mr : language === 'hi' ? route.name_hi : route.name,
        destinationStopName: destName,
        etaMinutes,
        lang: language
      });
      window.open(url, '_blank');
    } finally {
      setIsSharing(false);
    }
  };

  const safetyNote = getSafetyNote(destinationStop);

  return (
    <div className="bg-gradient-to-br from-rose-950 via-stone-900 to-rose-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border-2 border-rose-600/50 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-rose-800/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shadow-md">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-black tracking-wide uppercase text-rose-300 flex items-center gap-1">
              <span>{language === 'mr' ? 'महिला व रात्र सुरक्षा मोड' : language === 'hi' ? 'महिला एवं रात्रि सुरक्षा मोड' : "Women's & Night Safety Mode"}</span>
              {isNightTime && <Moon className="w-3.5 h-3.5 text-amber-300 inline" />}
            </span>
            <p className="text-[11px] text-rose-200">
              {language === 'mr' ? 'सुरक्षित प्रवासासाठी थेट पर्याय' : language === 'hi' ? 'सुरक्षित यात्रा के लिए सुरक्षा विकल्प' : 'Real-time safety tools for your commute'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenContactsModal}
          className="text-xs bg-rose-800/80 hover:bg-rose-800 text-rose-100 font-bold px-2.5 py-1 rounded-lg border border-rose-600 flex items-center gap-1 transition cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-rose-300" />
          <span>{language === 'mr' ? 'संपर्क' : language === 'hi' ? 'संपर्क' : 'Contacts'}</span>
        </button>
      </div>

      {/* Night Advisory & Last Bus Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* Last Bus Time */}
        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-200 block">
              {language === 'mr' ? 'या मार्गावरील शेवटची बस' : language === 'hi' ? 'इस रूट की अंतिम बस' : 'Last Bus on Route'}
            </span>
            <p className="font-extrabold text-sm text-white">
              {route.lastBus} hrs (Bus {route.routeNumber})
            </p>
            <p className="text-[10px] text-rose-200 mt-0.5">
              {language === 'mr' ? 'रात्री उशिरा बसेसची वारंवारता कमी असते.' : language === 'hi' ? 'रात में बसों की संख्या कम रहती है।' : 'Bus frequency reduces after 9 PM.'}
            </p>
          </div>
        </div>

        {/* Destination Stop Lighting Status */}
        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 flex items-start gap-2.5">
          {destinationStop.isWellLit ? (
            <Lightbulb className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-200 block">
              {language === 'mr' ? 'थांब्यावरील रात्र सुरक्षा' : language === 'hi' ? 'स्टॉप रात्रि स्थिति' : 'Stop Night Atmosphere'}
            </span>
            <p className="font-extrabold text-sm text-white">
              {destinationStop.isQuietAtNight
                ? (language === 'mr' ? '⚠️ रात्री शांत / निर्मनुष्य परिसर' : language === 'hi' ? '⚠️ रात में शांत इलाका' : '⚠️ Quiet / Isolated Area at Night')
                : (language === 'mr' ? '🟢 पुरेसा प्रकाश व २४ तास वर्दळ' : language === 'hi' ? '🟢 अच्छी रोशनी व चहल-पहल' : '🟢 Well-lit with Regular Crowd')}
            </p>
            {safetyNote && (
              <p className="text-[10px] text-rose-200 mt-0.5">
                {safetyNote}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Share Trip, Alight Alert, Big SOS Button */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Share My Trip */}
          <button
            onClick={handleShareTrip}
            disabled={isSharing}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>
              {language === 'mr' ? 'थेट प्रवासाचे स्थान शेअर करा' : language === 'hi' ? 'यात्रा व लोकेशन शेयर करें' : 'Share My Trip (WhatsApp)'}
            </span>
            <ExternalLink className="w-3 h-3 text-emerald-200" />
          </button>

          {/* 1-Stop Away Alight Alert */}
          <button
            onClick={onSetAlightReminder}
            className="w-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black py-2.5 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <span>🔔</span>
            <span>
              {language === 'mr' ? '१ थांबा आधी आठवण करा' : language === 'hi' ? '1 स्टॉप पहले अलर्ट सेट करें' : 'Alert 1 Stop Before'}
            </span>
          </button>
        </div>

        {/* Big Red SOS Button */}
        <button
          onClick={onTriggerSos}
          className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black py-3.5 px-4 rounded-2xl shadow-xl border-2 border-red-400 transition flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer tracking-wider uppercase animate-pulse"
        >
          <ShieldAlert className="w-6 h-6 animate-bounce" />
          <span>🚨 SOS EMERGENCY (५ सेकंद अलर्ट)</span>
        </button>
      </div>
    </div>
  );
};
