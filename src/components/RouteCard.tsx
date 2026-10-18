import React, { useState } from 'react';
import { RouteOption, Language, GeminiExplanation } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { speakText, stopSpeaking } from '../utils/speech';
import {
  Clock,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight,
  Sparkles,
  Users,
  Footprints,
  Info,
  Bell
} from 'lucide-react';
import { PuneStop } from '../types/pmpml';

interface RouteCardProps {
  routeOption: RouteOption;
  language: Language;
  explanation: GeminiExplanation | null;
  isLoadingExplanation: boolean;
  onOpenReportModal: (routeNumber: string, stopId: string) => void;
  onOpenReminderModal: (
    destinationStop: PuneStop,
    routeNumber: string,
    intermediateStops: PuneStop[],
    totalDurationMinutes: number
  ) => void;
  isBest?: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  routeOption,
  language,
  explanation,
  isLoadingExplanation,
  onOpenReportModal,
  onOpenReminderModal,
  isBest = false
}) => {
  const t = getTranslation(language);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showStops, setShowStops] = useState(false);

  const primarySeg = routeOption.segments[0];
  const secondSeg = routeOption.segments[1];

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    const script = explanation?.spokenScript ||
      `${primarySeg.route.routeNumber} नंबर बस घ्या. ${routeOption.isDirect ? 'थेट पोहोचेल.' : 'पुढे बदलावी लागेल.'}`;

    setIsPlayingAudio(true);
    speakText(script, language, () => {
      setIsPlayingAudio(false);
    });
  };

  const getStopName = (stop: { name: string; name_mr: string; name_hi: string }) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'mr' ? 'उच्च विश्वासार्ह (प्रवाशांनी पुष्टी केली)' : language === 'hi' ? 'उच्च विश्वसनीयता (यात्रियों द्वारा सत्यापित)' : 'High Confidence (Rider Verified)'}</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === 'mr' ? 'मध्यम (वेळापत्रकाशी सुसंगत)' : language === 'hi' ? 'मध्यम विश्वसनीयता' : 'Medium Confidence'}</span>
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
            <AlertTriangle className="w-3.5 h-3.5 text-gray-500" />
            <span>{language === 'mr' ? 'वेळापत्रक अंदाज' : language === 'hi' ? 'समय सारणी अनुसार' : 'Timetable Estimate'}</span>
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-md border overflow-hidden transition-all duration-200 ${
      isBest ? 'border-orange-400 ring-2 ring-orange-200' : 'border-stone-200'
    }`}>
      {/* Top Banner Tag */}
      <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isBest && (
            <span className="bg-orange-600 text-white text-[11px] font-extrabold px-2 py-0.5 rounded tracking-wide uppercase">
              {language === 'mr' ? '★ शिफारस केलेला' : language === 'hi' ? '★ अनुशंसित' : '★ Recommended'}
            </span>
          )}
          <span className="font-bold text-xs sm:text-sm text-stone-700">
            {routeOption.isDirect ? t.directBus : `${t.transferBus} (${getStopName(routeOption.transferStop!)})`}
          </span>
        </div>

        {/* Verification Status */}
        <div>{getConfidenceBadge(primarySeg.liveConfidence)}</div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Next Bus & Fare Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-100 mb-4">
          {/* Next Bus Arrival */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              {t.nextBusIn}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-900 leading-none">
                {primarySeg.nextBusMinutes}
              </span>
              <span className="text-xs font-semibold text-amber-800">{t.minutes}</span>
            </div>
            <span className="text-[10px] text-amber-700 mt-0.5">
              {t.followingBusIn} {primarySeg.followingBusMinutes} {t.minutes}
            </span>
          </div>

          {/* Traffic Delay */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-orange-800 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
              {t.estimatedDelay}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className={`text-2xl font-black leading-none ${
                routeOption.overallDelayMinutes > 10 ? 'text-red-700' : 'text-orange-900'
              }`}>
                +{routeOption.overallDelayMinutes}
              </span>
              <span className="text-xs font-semibold text-orange-800">{t.minutes}</span>
            </div>
            <span className="text-[10px] text-stone-600 truncate mt-0.5">
              {primarySeg.crowdReportSummary || 'Normal traffic'}
            </span>
          </div>

          {/* Total Duration */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-stone-700 uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-600" />
              {t.totalTravelTime}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-stone-900 leading-none">
                {routeOption.totalDurationMinutes}
              </span>
              <span className="text-xs font-semibold text-stone-800">{t.minutes}</span>
            </div>
            <span className="text-[10px] text-stone-600 mt-0.5">
              {routeOption.totalDistanceKm} km
            </span>
          </div>

          {/* PMPML Fare */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
              {t.fareEstimate}
            </span>
            <div className="mt-0.5 flex items-baseline gap-0.5">
              <span className="text-2xl font-black text-emerald-900 leading-none">
                ₹{routeOption.totalFare}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 mt-0.5">
              PMPML Stage Fare
            </span>
          </div>
        </div>

        {/* Gemini Conversational Explanation Card */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 rounded-xl p-3.5 sm:p-4 border border-orange-200 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-orange-900 font-bold text-xs uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>{t.howToReach}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Remind me when to get off Button */}
              <button
                onClick={() => {
                  const finalSeg = routeOption.segments[routeOption.segments.length - 1];
                  const allIntermediateStops = routeOption.segments.flatMap(s => s.intermediateStops);
                  onOpenReminderModal(
                    finalSeg.toStop,
                    primarySeg.route.routeNumber,
                    allIntermediateStops,
                    routeOption.totalDurationMinutes
                  );
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs cursor-pointer"
                title={t.remindMeToGetOff}
              >
                <Bell className="w-3.5 h-3.5 animate-pulse" />
                <span>{t.remindMeToGetOff}</span>
              </button>

              {/* Audio Speech Readout Button */}
              <button
                onClick={handleToggleAudio}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isPlayingAudio
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-white text-orange-800 hover:bg-orange-100 border border-orange-300 shadow-xs'
                }`}
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>{t.stopAudio}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-orange-600" />
                    <span>{t.listenToDirections}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isLoadingExplanation ? (
            <div className="py-2 flex items-center gap-2 text-xs text-orange-800">
              <span className="inline-block w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              <span>
                {language === 'mr' ? 'साथी माहिती तयार करत आहे...' : language === 'hi' ? 'साथी जानकारी तैयार कर रहा है...' : 'Saathi is preparing simple instructions...'}
              </span>
            </div>
          ) : explanation ? (
            <div className="space-y-2">
              <p className="text-sm font-extrabold text-stone-900 leading-snug">
                {explanation.headline}
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-stone-800">
                {explanation.simpleSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
              {explanation.localTip && (
                <div className="mt-2.5 pt-2 border-t border-orange-200/80 text-xs text-orange-950 bg-white/70 p-2 rounded-lg font-medium flex items-start gap-1.5">
                  <span className="text-orange-600 font-bold">💡 {t.conductorTip}:</span>
                  <span>{explanation.localTip}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone-700">
              {routeOption.isDirect
                ? `${primarySeg.route.routeNumber} नंबर बस ${getStopName(primarySeg.fromStop)} वरून पकडा.`
                : `${primarySeg.route.routeNumber} नंबर बसने ${getStopName(routeOption.transferStop!)} ला जा आणि दुसरी बस बदला.`}
            </p>
          )}
        </div>

        {/* Visual Bus Hop Timeline */}
        <div className="space-y-3 mb-4">
          {/* Segment 1 */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Bus Route Pill */}
              <div
                className="px-3 py-1.5 rounded-lg text-white font-black text-base shadow-sm flex items-center gap-1.5"
                style={{ backgroundColor: primarySeg.route.color || '#E65100' }}
              >
                <span>🚌</span>
                <span>{primarySeg.route.routeNumber}</span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs font-bold text-stone-800">
                  <span>{getStopName(primarySeg.fromStop)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  <span>{getStopName(primarySeg.toStop)}</span>
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  {primarySeg.intermediateStops.length + 1} {t.stopsCount} • {primarySeg.distanceKm} km • {primarySeg.durationMinutes} {t.minutes}
                </div>
              </div>
            </div>

            {/* Live Location of this bus */}
            <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {primarySeg.currentCrowdStop ? (
                  <span>📍 {language === 'mr' ? 'सध्या:' : language === 'hi' ? 'वर्तमान:' : 'Now at:'} {getStopName(primarySeg.currentCrowdStop)}</span>
                ) : (
                  <span>📍 {language === 'mr' ? 'मार्गावर धावत आहे' : language === 'hi' ? 'रूट पर है' : 'On route'}</span>
                )}
              </span>

              {/* "I'm on this bus" Button */}
              <button
                onClick={() => onOpenReportModal(primarySeg.route.routeNumber, primarySeg.fromStop.id)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1 transition"
              >
                <Users className="w-3 h-3" />
                <span>{t.reportOnBus}</span>
              </button>
            </div>
          </div>

          {/* Transfer Walk Notice if applicable */}
          {!routeOption.isDirect && secondSeg && (
            <div className="flex items-center gap-2 pl-4 py-1 text-xs text-amber-900 font-semibold bg-amber-50/80 rounded-lg border border-dashed border-amber-300">
              <Footprints className="w-4 h-4 text-amber-700" />
              <span>
                {language === 'mr'
                  ? `${getStopName(routeOption.transferStop!)} येथे उतरा, २ मिनिटे चालून प्लॅटफॉर्म बदला`
                  : language === 'hi'
                  ? `${getStopName(routeOption.transferStop!)} पर उतरें, 2 मिनट चलकर दूसरा प्लैटफ़ॉर्म लें`
                  : `Alight at ${getStopName(routeOption.transferStop!)}, walk 2 mins to connecting platform`}
              </span>
            </div>
          )}

          {/* Segment 2 if applicable */}
          {!routeOption.isDirect && secondSeg && (
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="px-3 py-1.5 rounded-lg text-white font-black text-base shadow-sm flex items-center gap-1.5"
                  style={{ backgroundColor: secondSeg.route.color || '#1565C0' }}
                >
                  <span>🚌</span>
                  <span>{secondSeg.route.routeNumber}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-bold text-stone-800">
                    <span>{getStopName(secondSeg.fromStop)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                    <span>{getStopName(secondSeg.toStop)}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {secondSeg.intermediateStops.length + 1} {t.stopsCount} • {secondSeg.distanceKm} km • {secondSeg.durationMinutes} {t.minutes}
                  </div>
                </div>
              </div>

              <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
                <span className="text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                  {t.nextBusIn} {secondSeg.nextBusMinutes} {t.minutes}
                </span>

                <button
                  onClick={() => onOpenReportModal(secondSeg.route.routeNumber, secondSeg.fromStop.id)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1 transition"
                >
                  <Users className="w-3 h-3" />
                  <span>{t.reportOnBus}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Intermediate Stops List */}
        <div>
          <button
            onClick={() => setShowStops(!showStops)}
            className="w-full text-xs font-bold text-stone-600 hover:text-stone-900 py-1.5 flex items-center justify-center gap-1 border-t border-stone-100"
          >
            <span>
              {showStops
                ? (language === 'mr' ? 'थांब्यांची यादी लपवा' : language === 'hi' ? 'स्टॉप सूची छुपाएं' : 'Hide intermediate stops')
                : (language === 'mr' ? 'सर्व थांबे पहा' : language === 'hi' ? 'सभी स्टॉप देखें' : 'View all stops along route')}
            </span>
            {showStops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showStops && (
            <div className="mt-2 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-2">
              {routeOption.segments.map((seg, sIdx) => (
                <div key={sIdx}>
                  <div className="font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.route.color }} />
                    <span>Bus {seg.route.routeNumber} ({seg.route.name})</span>
                  </div>
                  <div className="pl-3 border-l-2 border-stone-300 space-y-1">
                    <div className="font-bold text-emerald-800">
                      🟢 {getStopName(seg.fromStop)} ({language === 'mr' ? 'चढा' : language === 'hi' ? 'बोर्डिंग' : 'Boarding'})
                    </div>
                    {seg.intermediateStops.map((istop, iIdx) => (
                      <div key={iIdx} className="text-stone-600 pl-4 py-0.5">
                        • {getStopName(istop)}
                      </div>
                    ))}
                    <div className="font-bold text-red-800">
                      🔴 {getStopName(seg.toStop)} ({language === 'mr' ? 'उतरा' : language === 'hi' ? 'अलौट' : 'Alight'})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
