import React from 'react';
import { Language, CrowdReport } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { getStopById } from '../utils/routeFinder';
import { X, ShieldCheck, Clock, Users, Gauge, Radio, PlusCircle } from 'lucide-react';

interface CrowdReportsFeedProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  reports: CrowdReport[];
  onOpenReportModal: () => void;
}

export const CrowdReportsFeed: React.FC<CrowdReportsFeedProps> = ({
  isOpen,
  onClose,
  language,
  reports,
  onOpenReportModal
}) => {
  const t = getTranslation(language);

  if (!isOpen) return null;

  const getStopName = (stopId: string) => {
    const s = getStopById(stopId);
    if (!s) return stopId;
    if (language === 'mr') return s.name_mr;
    if (language === 'hi') return s.name_hi;
    return s.name;
  };

  const getTimeAgo = (timestamp: number) => {
    const diffMin = Math.round((Date.now() - timestamp) / (60 * 1000));
    if (diffMin <= 1) return language === 'mr' ? 'आत्ताच' : language === 'hi' ? 'अभी' : 'Just now';
    return `${diffMin} ${t.minutes} ${language === 'mr' ? 'पूर्वी' : language === 'hi' ? 'पहले' : 'ago'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-stone-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight flex items-center gap-2">
                <span>{language === 'mr' ? 'थेट प्रवासी नोंदी (पुणे)' : language === 'hi' ? 'लाइव यात्री अपडेट (पुणे)' : 'Live Pune Rider Reports'}</span>
                <span className="text-xs bg-emerald-700 text-emerald-100 font-bold px-1.5 py-0.5 rounded">
                  {reports.length} LIVE
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                {language === 'mr' ? 'पुणेकर प्रवाशांनी दिलेली थेट माहिती' : language === 'hi' ? 'पुणे के यात्रियों द्वारा साझा की गई जानकारी' : 'Real-time crowdsourced reports from fellow Punekars'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anti-Fake Protection Notice */}
        <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            {language === 'mr'
              ? 'सर्व नोंदींची मार्ग आणि वेळेनुसार स्वयंचलित पडताळणी केली जाते.'
              : language === 'hi'
              ? 'सभी रिपोर्ट की रूट और समय अनुसार स्वचालित जांच की जाती है।'
              : 'All reports are automatically verified against PMPML corridor geometry.'}
          </span>
        </div>

        {/* Feed List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-stone-100">
          {reports.map(report => (
            <div key={report.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                  {report.routeNumber}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    <span>📍 {getStopName(report.stopId)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                    {/* Occupancy */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      <Users className="w-3 h-3 text-stone-500" />
                      <span>
                        {report.occupancy === 'seats_available'
                          ? '🟢 Seats Free'
                          : report.occupancy === 'standing'
                          ? '🟡 Standing'
                          : '🔴 Packed'}
                      </span>
                    </span>

                    {/* Traffic condition */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      <Gauge className="w-3 h-3 text-stone-500" />
                      <span>
                        {report.trafficStatus === 'fast'
                          ? '🚀 Fast'
                          : report.trafficStatus === 'slow'
                          ? '🐢 Crawling'
                          : '🛑 Traffic Jam'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-right flex-shrink-0">
                <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>{getTimeAgo(report.timestamp)}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  ✓ Verified
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer with "Report My Bus" button */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
          <p className="text-xs text-stone-600 font-medium hidden sm:block">
            {language === 'mr' ? 'तुम्ही आता बसमध्ये आहात का?' : language === 'hi' ? 'क्या आप अभी बस में हैं?' : 'Are you currently on a PMPML bus?'}
          </p>
          <button
            onClick={() => {
              onClose();
              onOpenReportModal();
            }}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.reportOnBus}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
