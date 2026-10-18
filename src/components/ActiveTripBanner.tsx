import React from 'react';
import { Language } from '../types/pmpml';
import { AlightReminderConfig } from '../utils/reminder';
import { getTranslation } from '../utils/i18n';
import { Bell, BellRing, X, Zap, Clock, MapPin } from 'lucide-react';

interface ActiveTripBannerProps {
  reminder: AlightReminderConfig;
  language: Language;
  onCancel: () => void;
  onTriggerDemo: () => void;
}

export const ActiveTripBanner: React.FC<ActiveTripBannerProps> = ({
  reminder,
  language,
  onCancel,
  onTriggerDemo
}) => {
  const t = getTranslation(language);

  const getStopName = (stop: { name: string; name_mr: string; name_hi: string }) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  const timeRemainingMs = reminder.estimatedArrivalTimestamp - Date.now();
  const timeRemainingMinutes = Math.max(1, Math.round(timeRemainingMs / (60 * 1000)));

  const totalStops = reminder.intermediateStops.length + 1;
  const stopsLeft = Math.max(1, totalStops - reminder.currentSimulatedStopIndex);

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-3.5 sm:p-4 shadow-lg border-2 border-amber-300 animate-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                {t.reminderActive}
              </span>
              <span className="bg-white/20 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                BUS {reminder.routeNumber}
              </span>
            </div>
            <p className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate">
              <span>➔ {getStopName(reminder.destinationStop)}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-100 font-semibold mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-200" />
                <span>~{timeRemainingMinutes} {t.minutes}</span>
              </span>
              <span>•</span>
              <span>{stopsLeft} {t.stopsCount} remaining</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Fast-Forward Demo for Judges */}
          <button
            onClick={onTriggerDemo}
            className="text-xs bg-amber-900/60 hover:bg-amber-900 text-amber-100 font-bold px-2.5 py-1.5 rounded-lg border border-amber-400/50 flex items-center gap-1 shadow-xs transition cursor-pointer"
            title="Trigger alarm immediately to demo browser notification & audio chime"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{t.testDemoAlert}</span>
          </button>

          {/* Cancel Reminder Button */}
          <button
            onClick={onCancel}
            className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold p-1.5 rounded-lg transition cursor-pointer"
            title={t.cancelReminder}
            aria-label="Cancel Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 bg-amber-900/40 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-amber-200 h-full transition-all duration-500 rounded-full"
          style={{
            width: `${Math.min(100, Math.max(10, ((totalStops - stopsLeft) / totalStops) * 100))}%`
          }}
        />
      </div>
    </div>
  );
};
