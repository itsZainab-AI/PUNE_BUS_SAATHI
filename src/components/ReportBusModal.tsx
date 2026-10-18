import React, { useState, useEffect } from 'react';
import { Language, OccupancyLevel, TrafficCondition, PuneRoute, PuneStop } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { PUNE_ROUTES, PUNE_STOPS, getStopById } from '../utils/routeFinder';
import { crowdManager } from '../utils/crowdReports';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Bus, MapPin, Users, Gauge } from 'lucide-react';

interface ReportBusModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  preselectedRoute?: string;
  preselectedStopId?: string;
  onReportSubmitted: () => void;
}

export const ReportBusModal: React.FC<ReportBusModalProps> = ({
  isOpen,
  onClose,
  language,
  preselectedRoute,
  preselectedStopId,
  onReportSubmitted
}) => {
  const t = getTranslation(language);

  const [selectedRouteNumber, setSelectedRouteNumber] = useState<string>('11');
  const [selectedStopId, setSelectedStopId] = useState<string>('nal_stop');
  const [occupancy, setOccupancy] = useState<OccupancyLevel>('standing');
  const [trafficStatus, setTrafficStatus] = useState<TrafficCondition>('slow');
  const [feedback, setFeedback] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);

  useEffect(() => {
    if (preselectedRoute) {
      setSelectedRouteNumber(preselectedRoute);
    }
    if (preselectedStopId) {
      setSelectedStopId(preselectedStopId);
    }
  }, [preselectedRoute, preselectedStopId, isOpen]);

  // Current selected route object
  const currentRoute = PUNE_ROUTES.find(r => r.routeNumber === selectedRouteNumber) || PUNE_ROUTES[0];
  const routeStops = currentRoute.stops.map(s => getStopById(s.stopId)!).filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = crowdManager.submitReport({
      routeNumber: selectedRouteNumber,
      stopId: selectedStopId,
      direction: 'forward',
      occupancy,
      trafficStatus
    });

    const msg = language === 'mr' ? result.message_mr : language === 'hi' ? result.message_hi : result.message;

    setFeedback({
      show: true,
      success: result.success,
      message: msg,
      confidence: result.confidence
    });

    if (result.success) {
      onReportSubmitted();
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 2200);
    }
  };

  if (!isOpen) return null;

  const getStopName = (stop: PuneStop) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {t.reportModalTitle}
              </h2>
              <p className="text-xs text-amber-100">
                {t.antiFakeNotice}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Feedback Banner if submitted */}
          {feedback && (
            <div className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-start gap-2.5 ${
              feedback.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-red-50 text-red-900 border-red-300'
            }`}>
              {feedback.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p>{feedback.message}</p>
                {feedback.success && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {language === 'mr' ? 'विश्वासार्हता स्तर:' : language === 'hi' ? 'विश्वसनीयता स्तर:' : 'Confidence Level:'} {feedback.confidence.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Route Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 mb-1.5">
              <Bus className="w-4 h-4 text-orange-600" />
              <span>{t.selectRoute}</span>
            </label>
            <select
              value={selectedRouteNumber}
              onChange={e => {
                setSelectedRouteNumber(e.target.value);
                const r = PUNE_ROUTES.find(x => x.routeNumber === e.target.value);
                if (r && r.stops[0]) {
                  setSelectedStopId(r.stops[0].stopId);
                }
              }}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {PUNE_ROUTES.map(r => (
                <option key={r.id} value={r.routeNumber}>
                  Bus {r.routeNumber} ({language === 'mr' ? r.name_mr : language === 'hi' ? r.name_hi : r.name})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stop Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{t.selectCurrentStop}</span>
            </label>
            <select
              value={selectedStopId}
              onChange={e => setSelectedStopId(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {routeStops.map((stop, sidx) => (
                <option key={stop.id} value={stop.id}>
                  {sidx + 1}. {getStopName(stop)} ({stop.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Occupancy / Crowdedness Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{t.occupancyTitle}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOccupancy('seats_available')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  occupancy === 'seats_available'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-lg">🟢</span>
                <span className="leading-tight">{language === 'mr' ? 'जागा आहे' : language === 'hi' ? 'सीट उपलब्ध' : 'Seats Free'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOccupancy('standing')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  occupancy === 'standing'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-300'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-lg">🟡</span>
                <span className="leading-tight">{language === 'mr' ? 'उभे आहेत' : language === 'hi' ? 'खड़े लोग' : 'Standing'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOccupancy('packed')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  occupancy === 'packed'
                    ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-300'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-lg">🔴</span>
                <span className="leading-tight">{language === 'mr' ? 'खूप गर्दी' : language === 'hi' ? 'पूरी भरी' : 'Packed'}</span>
              </button>
            </div>
          </div>

          {/* Traffic Condition */}
          <div>
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 mb-2">
              <Gauge className="w-4 h-4 text-purple-600" />
              <span>{t.trafficTitle}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTrafficStatus('fast')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  trafficStatus === 'fast'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-lg">🚀</span>
                <span className="leading-tight">{language === 'mr' ? 'वेगाने' : language === 'hi' ? 'सामान्य गति' : 'Fast'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTrafficStatus('slow')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  trafficStatus === 'slow'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-300'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-lg">🐢</span>
                <span className="leading-tight">{language === 'mr' ? 'हळू चालली' : language === 'hi' ? 'धीमी गति' : 'Slow'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTrafficStatus('heavy_jam')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  trafficStatus === 'heavy_jam'
                    ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-300'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-lg">🛑</span>
                <span className="leading-tight">{language === 'mr' ? 'ट्रॅफिक जाम' : language === 'hi' ? 'ट्रैफिक जाम' : 'Jam'}</span>
              </button>
            </div>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-100 transition text-sm cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-3 rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t.submitReport}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
