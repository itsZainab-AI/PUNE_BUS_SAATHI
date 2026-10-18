import React, { useState, useEffect } from 'react';
import { Language, PuneStop } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { alightReminderManager } from '../utils/reminder';
import {
  Bell,
  BellRing,
  X,
  Volume2,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface AlightReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  destinationStop: PuneStop;
  routeNumber: string;
  intermediateStops: PuneStop[];
  totalDurationMinutes: number;
  onReminderSet: () => void;
}

export const AlightReminderModal: React.FC<AlightReminderModalProps> = ({
  isOpen,
  onClose,
  language,
  destinationStop,
  routeNumber,
  intermediateStops,
  totalDurationMinutes,
  onReminderSet
}) => {
  const t = getTranslation(language);

  const [triggerTiming, setTriggerTiming] = useState<'early' | 'exact'>('early');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isPlayingChime, setIsPlayingChime] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStopName = (stop: PuneStop) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  const handleRequestPermission = async () => {
    const res = await alightReminderManager.requestNotificationPermission();
    setPermissionStatus(res);
  };

  const handleTestChime = () => {
    setIsPlayingChime(true);
    alightReminderManager.playTransitChime();
    setTimeout(() => setIsPlayingChime(false), 1400);
  };

  const handleSetReminder = () => {
    // If not granted, try asking once
    if (permissionStatus === 'default') {
      alightReminderManager.requestNotificationPermission().then(res => {
        setPermissionStatus(res);
      });
    }

    alightReminderManager.setReminder({
      routeNumber,
      destinationStop,
      intermediateStops,
      totalDurationMinutes,
      triggerMinutesBefore: triggerTiming === 'early' ? 2 : 0.5,
      triggerStopsBefore: triggerTiming === 'early' ? 1 : 0
    });

    onReminderSet();
    onClose();
  };

  const handleInstantDemoTest = () => {
    alightReminderManager.setReminder({
      routeNumber,
      destinationStop,
      intermediateStops,
      totalDurationMinutes,
      triggerMinutesBefore: 2,
      triggerStopsBefore: 1
    });
    onReminderSet();
    onClose();

    // Trigger fast-forward demo alert in 1.5 seconds
    setTimeout(() => {
      alightReminderManager.triggerDemoAlert(language);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {t.reminderModalTitle}
              </h2>
              <p className="text-xs text-amber-100">
                PMPML Destination Notification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Target Stop Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
              {routeNumber}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-orange-800 uppercase block">
                {language === 'mr' ? 'उतरण्याचा थांबा' : language === 'hi' ? 'उतरने का स्टॉप' : 'Alighting Destination'}
              </span>
              <p className="font-extrabold text-stone-900 text-sm sm:text-base truncate">
                {getStopName(destinationStop)}
              </p>
              <span className="text-[11px] text-stone-600">
                {intermediateStops.length + 1} {t.stopsCount} away • ~{totalDurationMinutes} {t.minutes}
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            {t.reminderModalDesc}
          </p>

          {/* Browser Notification Permission Status */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Bell className="w-4 h-4 text-stone-600" />
              <span>
                {permissionStatus === 'granted'
                  ? t.notificationPermissionGranted
                  : t.notificationPermissionNeeded}
              </span>
            </div>
            {permissionStatus !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>

          {/* Alert Timing Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 block">
              {t.triggerTiming}
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setTriggerTiming('early')}
                className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${
                  triggerTiming === 'early'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-300 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>{t.twoMinutesBefore}</span>
                </div>
                {triggerTiming === 'early' && <CheckCircle2 className="w-4 h-4 text-amber-700" />}
              </button>

              <button
                type="button"
                onClick={() => setTriggerTiming('exact')}
                className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${
                  triggerTiming === 'exact'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-300 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-stone-700" />
                  <span>{t.atArrival}</span>
                </div>
                {triggerTiming === 'exact' && <CheckCircle2 className="w-4 h-4 text-amber-700" />}
              </button>
            </div>
          </div>

          {/* Test Sound Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestChime}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                isPlayingChime
                  ? 'bg-amber-100 border-amber-400 text-amber-900'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-orange-600" />
              <span>{t.testChime}</span>
            </button>

            {/* Quick Demo Fast-Forward for Judges */}
            <button
              type="button"
              onClick={handleInstantDemoTest}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 flex items-center gap-1 transition cursor-pointer"
              title="Fast-forward simulation to immediately trigger notification for judges"
            >
              <Zap className="w-3.5 h-3.5 text-amber-700" />
              <span>{t.testDemoAlert}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-100 transition text-sm cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSetReminder}
              className="flex-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white py-3 rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>{t.setReminderButton}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
