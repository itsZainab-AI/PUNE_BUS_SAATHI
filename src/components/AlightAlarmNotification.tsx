import React from 'react';
import { Language, PuneStop } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { BellRing, CheckCircle, ShieldAlert, Users, Volume2 } from 'lucide-react';

interface AlightAlarmNotificationProps {
  isOpen: boolean;
  onDismiss: () => void;
  language: Language;
  destinationStop: PuneStop;
  routeNumber: string;
  onOpenReportModal: () => void;
}

export const AlightAlarmNotification: React.FC<AlightAlarmNotificationProps> = ({
  isOpen,
  onDismiss,
  language,
  destinationStop,
  routeNumber,
  onOpenReportModal
}) => {
  const t = getTranslation(language);

  if (!isOpen) return null;

  const getStopName = (stop: PuneStop) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  const destName = getStopName(destinationStop);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-4 border-amber-500 overflow-hidden text-center p-6 space-y-4">
        {/* Pulsing Alarm Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center text-amber-600 shadow-xl animate-bounce">
          <BellRing className="w-10 h-10" />
        </div>

        <div>
          <span className="bg-orange-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
            BUS {routeNumber} • PMPML ALERT
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
            {destName}
          </h2>
          <p className="text-sm font-bold text-amber-800 mt-1">
            {t.alightApproaching}
          </p>
        </div>

        {/* Warning card */}
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs sm:text-sm text-stone-800 text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-base">🎒</span>
            <span className="font-semibold">
              {language === 'mr'
                ? 'तुमचे सामान (बॅग, मोबाईल, पाकीट) तपासा आणि जवळ घ्या.'
                : language === 'hi'
                ? 'अपना सामान (बैग, फोन, बटुआ) जांचें और साथ रखें।'
                : 'Check your belongings (bag, phone, wallet) and keep them close.'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">🚪</span>
            <span className="font-semibold">
              {language === 'mr'
                ? 'बस थांबल्यावर सावकाश दारातून उतरा, गडबड करू नका.'
                : language === 'hi'
                ? 'बस रुकने पर आराम से दरवाजे से उतरें, जल्दबाजी न करें।'
                : 'Wait for the bus to halt safely before stepping down.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onDismiss}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{t.dismiss}</span>
          </button>

          <button
            onClick={() => {
              onDismiss();
              onOpenReportModal();
            }}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Users className="w-4 h-4 text-orange-600" />
            <span>{t.reportOnBus}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
