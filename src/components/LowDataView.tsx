import React from 'react';
import { RouteOption, Language, PuneStop } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { WifiOff, Clock, IndianRupee, AlertTriangle, ArrowRight, CheckCircle2, Bell } from 'lucide-react';

interface LowDataViewProps {
  routeOptions: RouteOption[];
  language: Language;
  onOpenReportModal: (routeNumber: string, stopId: string) => void;
  onOpenReminderModal: (
    destinationStop: PuneStop,
    routeNumber: string,
    intermediateStops: PuneStop[],
    totalDurationMinutes: number
  ) => void;
}

export const LowDataView: React.FC<LowDataViewProps> = ({
  routeOptions,
  language,
  onOpenReportModal,
  onOpenReminderModal
}) => {
  const t = getTranslation(language);

  const getStopName = (stop: { name: string; name_mr: string; name_hi: string }) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  return (
    <div className="bg-stone-50 rounded-2xl p-4 border-2 border-stone-300 text-stone-900 font-sans space-y-4">
      {/* Low-Data Banner */}
      <div className="bg-emerald-900 text-white p-3 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-emerald-300" />
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide">
              {t.lowDataActive}
            </h3>
            <p className="text-xs text-emerald-200">
              {language === 'mr' ? 'कमी डेटा व जलद लोडसाठी नकाशे बंद आहेत.' : language === 'hi' ? 'कम डेटा और तेज़ लोड के लिए मैप बंद हैं।' : 'Maps disabled to save mobile data & load instantly.'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-800 px-2 py-1 rounded text-emerald-100">
          2G / 3G OPTIMIZED
        </span>
      </div>

      {/* Routes Text Matrix */}
      {routeOptions.length === 0 ? (
        <div className="p-4 bg-white rounded-xl border border-stone-200 text-center text-sm text-stone-600">
          {t.noRouteFound}
        </div>
      ) : (
        <div className="space-y-3">
          {routeOptions.map((opt, idx) => {
            const seg1 = opt.segments[0];
            const seg2 = opt.segments[1];

            return (
              <div
                key={opt.id}
                className="bg-white p-3.5 rounded-xl border border-stone-300 shadow-xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-2 border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-stone-900 text-white font-black text-sm px-2.5 py-0.5 rounded">
                      BUS {seg1.route.routeNumber}
                    </span>
                    {seg2 && (
                      <>
                        <span className="text-xs font-bold text-stone-500">➔</span>
                        <span className="bg-stone-900 text-white font-black text-sm px-2.5 py-0.5 rounded">
                          BUS {seg2.route.routeNumber}
                        </span>
                      </>
                    )}
                    <span className="text-xs font-bold text-emerald-800 ml-1">
                      {opt.isDirect ? t.directBus : `${t.transferBus} (${getStopName(opt.transferStop!)})`}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-stone-900">
                    ₹{opt.totalFare}
                  </span>
                </div>

                {/* Key Timings Table in Plain Text */}
                <div className="grid grid-cols-3 gap-2 text-center bg-stone-100 p-2 rounded-lg text-xs">
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">{t.nextBusIn}</span>
                    <span className="font-black text-sm text-stone-900">{seg1.nextBusMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">{t.totalTravelTime}</span>
                    <span className="font-black text-sm text-stone-900">{opt.totalDurationMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">{t.estimatedDelay}</span>
                    <span className="font-black text-sm text-orange-700">+{opt.overallDelayMinutes} min</span>
                  </div>
                </div>

                {/* Step-by-Step Text Timeline */}
                <div className="text-xs space-y-2 border-l-2 border-stone-400 pl-3 ml-1">
                  <div className="flex items-start gap-1.5 font-bold text-emerald-900">
                    <span>1.</span>
                    <span>
                      {getStopName(seg1.fromStop)} वरून बस {seg1.route.routeNumber} पकडा (पुढील बस: {seg1.nextBusMinutes} मि.)
                    </span>
                  </div>

                  {opt.isDirect ? (
                    <div className="flex items-start gap-1.5 font-bold text-red-900">
                      <span>2.</span>
                      <span>
                        {getStopName(seg1.toStop)} येथे उतरा. (तिकीट ₹{seg1.fare})
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-1.5 font-medium text-amber-900">
                        <span>2.</span>
                        <span>
                          {getStopName(opt.transferStop!)} येथे उतरा, २ मिनिटे चालून प्लॅटफॉर्म बदला
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 font-bold text-red-900">
                        <span>3.</span>
                        <span>
                          बस {seg2?.route.routeNumber} ने {getStopName(seg2!.toStop)} येथे उतरा.
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions: Remind Me & Check-in */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-stone-200">
                  <button
                    onClick={() => {
                      const finalSeg = opt.segments[opt.segments.length - 1];
                      const allIntermediateStops = opt.segments.flatMap(s => s.intermediateStops);
                      onOpenReminderModal(
                        finalSeg.toStop,
                        seg1.route.routeNumber,
                        allIntermediateStops,
                        opt.totalDurationMinutes
                      );
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{t.remindMeToGetOff}</span>
                  </button>

                  <button
                    onClick={() => onOpenReportModal(seg1.route.routeNumber, seg1.fromStop.id)}
                    className="text-xs bg-stone-800 hover:bg-stone-900 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>मी या बसमध्ये आहे</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
