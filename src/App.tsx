/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Language, RouteOption, GeminiExplanation, CrowdReport } from './types/pmpml';
import { getTranslation } from './utils/i18n';
import { findRoutes, PUNE_STOPS, getStopById } from './utils/routeFinder';
import { crowdManager } from './utils/crowdReports';
import { Header } from './components/Header';
import { QueryBar } from './components/QueryBar';
import { RouteCard } from './components/RouteCard';
import { PuneTransitMap } from './components/PuneTransitMap';
import { LowDataView } from './components/LowDataView';
import { ReportBusModal } from './components/ReportBusModal';
import { CrowdReportsFeed } from './components/CrowdReportsFeed';
import { PuneStop } from './types/pmpml';
import { alightReminderManager, AlightReminderConfig } from './utils/reminder';
import { AlightReminderModal } from './components/AlightReminderModal';
import { ActiveTripBanner } from './components/ActiveTripBanner';
import { AlightAlarmNotification } from './components/AlightAlarmNotification';
import { BusScannerModal } from './components/BusScannerModal';
import { SafetyContactsModal } from './components/SafetyContactsModal';
import { SosCountdownModal } from './components/SosCountdownModal';
import { NightSafetyCard } from './components/NightSafetyCard';
import { SplashScreen } from './components/SplashScreen';
import { isSafetyModeEnabled, setSafetyModeEnabled } from './utils/safetyMode';
import {
  MapPin,
  Map,
  ShieldCheck,
  Compass,
  AlertCircle,
  Bus,
  Radio,
  Layers,
  HeartHandshake,
  Bell
} from 'lucide-react';

export default function App() {
  // App state
  const [language, setLanguage] = useState<Language>('mr');
  const [lowDataMode, setLowDataMode] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  // Route search state (pre-populate with popular Kothrud to Swargate route for immediate instant demo)
  const [originStopId, setOriginStopId] = useState<string | null>('kothrud_depot');
  const [destinationStopId, setDestinationStopId] = useState<string | null>('swargate');
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  // Gemini state
  const [explanations, setExplanations] = useState<Record<string, GeminiExplanation>>({});
  const [isLoadingQuery, setIsLoadingQuery] = useState<boolean>(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<boolean>(false);
  const [lastQueryText, setLastQueryText] = useState<string>('मला कोथरूडहून स्वारगेटला जायचे आहे');

  // Crowd reporting state
  const [reports, setReports] = useState<CrowdReport[]>(crowdManager.getAllReports());
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isCrowdFeedOpen, setIsCrowdFeedOpen] = useState<boolean>(false);
  const [prefillRoute, setPrefillRoute] = useState<string>('11');
  const [prefillStop, setPrefillStop] = useState<string>('kothrud_depot');

  // Map visibility toggle (for standard mode)
  const [showMap, setShowMap] = useState<boolean>(true);

  // Alight reminder state
  const [activeReminder, setActiveReminder] = useState<AlightReminderConfig | null>(
    alightReminderManager.getActiveReminder()
  );
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);
  const [reminderDestStop, setReminderDestStop] = useState<PuneStop | null>(null);
  const [reminderRouteNum, setReminderRouteNum] = useState<string>('11');
  const [reminderIntermediateStops, setReminderIntermediateStops] = useState<PuneStop[]>([]);
  const [reminderDuration, setReminderDuration] = useState<number>(20);

  // Feature 1 & 3: Bus Scanner & Women's Safety Mode state
  const [isSafetyMode, setIsSafetyMode] = useState<boolean>(isSafetyModeEnabled());
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState<boolean>(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  const handleToggleSafetyMode = () => {
    const nextVal = !isSafetyMode;
    setIsSafetyMode(nextVal);
    setSafetyModeEnabled(nextVal);
  };

  const t = getTranslation(language);

  // Subscribe to live crowd reports
  useEffect(() => {
    const unsub = crowdManager.subscribe(() => {
      setReports(crowdManager.getAllReports());
    });
    return unsub;
  }, []);

  // Subscribe to alight reminders
  useEffect(() => {
    const unsub = alightReminderManager.subscribe(() => {
      setActiveReminder(alightReminderManager.getActiveReminder());
    });
    return unsub;
  }, []);

  // Compute routes whenever origin or destination changes
  const refreshRoutes = useCallback(() => {
    if (originStopId && destinationStopId) {
      const results = findRoutes(originStopId, destinationStopId);
      setRouteOptions(results);
      setSelectedRouteIndex(0);
    } else {
      setRouteOptions([]);
    }
  }, [originStopId, destinationStopId]);

  useEffect(() => {
    refreshRoutes();
  }, [refreshRoutes, reports]);

  // Request Gemini route explanation when top route changes
  const requestExplanation = useCallback(async (routeOpt: RouteOption, lang: Language) => {
    if (!routeOpt) return;
    const cacheKey = `${routeOpt.id}_${lang}`;
    if (explanations[cacheKey]) return;

    setIsLoadingExplanation(true);
    try {
      const res = await fetch('/api/gemini/explain-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeOption: routeOpt,
          language: lang,
          userQuery: lastQueryText
        })
      });

      if (res.ok) {
        const data: GeminiExplanation = await res.json();
        setExplanations(prev => ({ ...prev, [cacheKey]: data }));
      }
    } catch (err) {
      console.warn('Failed to fetch Gemini explanation, using local fallback:', err);
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [explanations, lastQueryText]);

  // Trigger explanation for selected route
  useEffect(() => {
    if (routeOptions.length > 0) {
      const activeOption = routeOptions[selectedRouteIndex] || routeOptions[0];
      requestExplanation(activeOption, language);
    }
  }, [routeOptions, selectedRouteIndex, language, requestExplanation]);

  // Handle Natural Language / Voice Query submission
  const handleNaturalQuery = async (queryText: string) => {
    setLastQueryText(queryText);
    setIsLoadingQuery(true);

    try {
      const res = await fetch('/api/gemini/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          preferredLang: language
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.detectedLanguage && (data.detectedLanguage === 'mr' || data.detectedLanguage === 'hi' || data.detectedLanguage === 'en')) {
          setLanguage(data.detectedLanguage);
        }

        if (data.originStopId) {
          setOriginStopId(data.originStopId);
        }
        if (data.destinationStopId) {
          setDestinationStopId(data.destinationStopId);
        }
      }
    } catch (err) {
      console.warn('Query parse error, relying on local search:', err);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Swap Stops
  const handleSwapStops = () => {
    const temp = originStopId;
    setOriginStopId(destinationStopId);
    setDestinationStopId(temp);
  };

  // Open Report Modal with prefill
  const handleOpenReportModal = (routeNum: string = '11', stopId: string = 'kothrud_depot') => {
    setPrefillRoute(routeNum);
    setPrefillStop(stopId);
    setIsReportModalOpen(true);
  };

  // Open Reminder Modal
  const handleOpenReminderModal = (
    destinationStop: PuneStop,
    routeNumber: string,
    intermediateStops: PuneStop[],
    totalDurationMinutes: number
  ) => {
    setReminderDestStop(destinationStop);
    setReminderRouteNum(routeNumber);
    setReminderIntermediateStops(intermediateStops);
    setReminderDuration(totalDurationMinutes);
    setIsReminderModalOpen(true);
  };

  // Cycle font size for accessibility
  const handleCycleFontSize = () => {
    if (fontSize === 'normal') setFontSize('large');
    else if (fontSize === 'large') setFontSize('xlarge');
    else setFontSize('normal');
  };

  const selectedRoute = routeOptions[selectedRouteIndex] || routeOptions[0] || null;
  const explanationKey = selectedRoute ? `${selectedRoute.id}_${language}` : '';
  const currentExplanation = explanations[explanationKey] || null;

  return (
    <div className={`min-h-screen bg-[#FAF7F2] flex flex-col font-scale-${fontSize}`}>
      {/* App Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        lowDataMode={lowDataMode}
        onToggleLowData={() => setLowDataMode(!lowDataMode)}
        fontSize={fontSize}
        onCycleFontSize={handleCycleFontSize}
        onOpenReportModal={() => handleOpenReportModal()}
        onOpenCrowdFeed={() => setIsCrowdFeedOpen(true)}
        activeReportCount={reports.length}
        onOpenScannerModal={() => setIsScannerModalOpen(true)}
        isSafetyMode={isSafetyMode}
        onToggleSafetyMode={handleToggleSafetyMode}
        onOpenSplash={() => setShowSplash(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Women's Safety Mode Active Banner */}
        {isSafetyMode && (
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-pink-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border-2 border-rose-500/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-rose-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">
                    {language === 'mr' ? 'महिला व रात्र सुरक्षा मोड सक्रिय' : language === 'hi' ? 'महिला एवं रात्रि सुरक्षा मोड सक्रिय' : "Women's Safety Mode Active"}
                  </span>
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                    ON
                  </span>
                </div>
                <p className="text-[11px] text-rose-200">
                  {language === 'mr' ? 'थेट स्थान शेअरिंग, १ थांबा आधी अलार्म आणि त्वरित SOS मदत' : language === 'hi' ? 'लाइव लोकेशन शेयरिंग, 1 स्टॉप पहले अलार्म व आपातकालीन SOS' : 'Live location share, 1-stop arrival alert, & instant 5s SOS helpline'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsContactsModalOpen(true)}
                className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white/20 transition cursor-pointer"
              >
                {language === 'mr' ? 'सुरक्षित संपर्क' : language === 'hi' ? 'संपर्क' : 'Contacts'}
              </button>
              <button
                type="button"
                onClick={() => setIsSosModalOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg border border-red-300 transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wide animate-pulse"
              >
                <span>🚨 SOS</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Trip Reminder Banner (if an alert is set) */}
        {activeReminder && activeReminder.isActive && (
          <ActiveTripBanner
            reminder={activeReminder}
            language={language}
            onCancel={() => alightReminderManager.cancelReminder()}
            onTriggerDemo={() => alightReminderManager.triggerDemoAlert(language)}
          />
        )}

        {/* Natural Language & Voice Search Box */}
        <QueryBar
          language={language}
          originStopId={originStopId}
          destinationStopId={destinationStopId}
          onSelectOrigin={setOriginStopId}
          onSelectDestination={setDestinationStopId}
          onSwapStops={handleSwapStops}
          onSubmitNaturalQuery={handleNaturalQuery}
          isLoading={isLoadingQuery}
          onOpenScannerModal={() => setIsScannerModalOpen(true)}
          onToggleSafetyMode={handleToggleSafetyMode}
        />

        {/* Selected Route & Stop Status Pills */}
        {originStopId && destinationStopId && (
          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-800">
              <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{getStopById(originStopId)?.name_mr || getStopById(originStopId)?.name}</span>
              </span>
              <span className="text-stone-400 font-extrabold">➔</span>
              <span className="flex items-center gap-1 text-red-800 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>{getStopById(destinationStopId)?.name_mr || getStopById(destinationStopId)?.name}</span>
              </span>
            </div>

            {/* View Mode Actions (Toggle Map / Low Data) */}
            <div className="flex items-center gap-2">
              {!lowDataMode && (
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-orange-600" />
                  <span>{showMap ? t.hideMap : t.viewOnMap}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Low-Data View vs Standard Rich View */}
        {lowDataMode ? (
          <LowDataView
            routeOptions={routeOptions}
            language={language}
            onOpenReportModal={handleOpenReportModal}
            onOpenReminderModal={handleOpenReminderModal}
          />
        ) : (
          <div className="space-y-5">
            {/* Interactive Vector Map of Pune Transit */}
            {showMap && (
              <PuneTransitMap
                selectedRouteOption={selectedRoute}
                originStopId={originStopId}
                destinationStopId={destinationStopId}
                language={language}
                onSelectStop={(stopId) => {
                  if (!originStopId) setOriginStopId(stopId);
                  else if (!destinationStopId && stopId !== originStopId) setDestinationStopId(stopId);
                  else setOriginStopId(stopId);
                }}
              />
            )}

            {/* Route Options Header & Tabs */}
            {routeOptions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                    <Bus className="w-5 h-5 text-orange-600" />
                    <span>{t.routeOptions}</span>
                    <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      {routeOptions.length}
                    </span>
                  </h2>

                  <span className="text-xs text-stone-500 font-medium hidden sm:inline">
                    {language === 'mr' ? 'थेट बसेस प्रथम दाखवल्या आहेत' : language === 'hi' ? 'सीधी बसें पहले दिखाई गई हैं' : 'Direct routes prioritized'}
                  </span>
                </div>

                {/* Multiple Route Option Tabs if more than 1 option */}
                {routeOptions.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {routeOptions.map((opt, idx) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedRouteIndex(idx)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                          selectedRouteIndex === idx
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                        }`}
                      >
                        <span>
                          {opt.isDirect ? '⚡' : '🔄'} {opt.segments.map(s => `Bus ${s.route.routeNumber}`).join(' ➔ ')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          selectedRouteIndex === idx ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {opt.totalDurationMinutes} min • ₹{opt.totalFare}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Night & Women's Safety Advisory Card */}
                {(isSafetyMode || new Date().getHours() >= 20 || new Date().getHours() < 6) && selectedRoute && destinationStopId && getStopById(destinationStopId) && (
                  <NightSafetyCard
                    route={selectedRoute.segments[0].route}
                    destinationStop={getStopById(destinationStopId)!}
                    etaMinutes={selectedRoute.totalDurationMinutes}
                    language={language}
                    onTriggerSos={() => setIsSosModalOpen(true)}
                    onOpenContactsModal={() => setIsContactsModalOpen(true)}
                    onSetAlightReminder={() => {
                      const dest = getStopById(destinationStopId);
                      if (dest) {
                        handleOpenReminderModal(
                          dest,
                          selectedRoute.segments[0].route.routeNumber,
                          selectedRoute.segments[0].intermediateStops,
                          selectedRoute.totalDurationMinutes
                        );
                      }
                    }}
                  />
                )}

                {/* Detailed Route Card for the selected option */}
                {selectedRoute && (
                  <RouteCard
                    routeOption={selectedRoute}
                    language={language}
                    explanation={currentExplanation}
                    isLoadingExplanation={isLoadingExplanation}
                    onOpenReportModal={handleOpenReportModal}
                    onOpenReminderModal={handleOpenReminderModal}
                    isBest={selectedRouteIndex === 0}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 shadow-sm space-y-3">
                <AlertCircle className="w-10 h-10 text-orange-400 mx-auto" />
                <h3 className="text-base font-bold text-stone-800">
                  {language === 'mr' ? 'मार्ग सापडला नाही' : language === 'hi' ? 'कोई रूट नहीं मिला' : 'No Direct Route Found'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                  {t.noRouteFound}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Educational Info Card for Pune Commuters */}
        <div className="bg-amber-100/60 rounded-2xl p-4 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-950">
          <HeartHandshake className="w-6 h-6 text-orange-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-orange-950">
              {language === 'mr' ? 'पुणे बस साथी - नागरिकांचा सहभाग' : language === 'hi' ? 'पुणे बस साथी - नागरिक भागीदारी' : 'PuneBus Saathi - Powered by Citizens & AI'}
            </p>
            <p className="text-amber-900 leading-relaxed text-xs">
              {language === 'mr'
                ? 'पुण्यातील पीएमपीएमएल बसेसच्या अनिश्चित वेळेवर मात करण्यासाठी प्रवाशांच्या थेट सहभागातून हे ॲप तयार केले आहे. तुम्ही बसमध्ये असताना "मी या बसमध्ये आहे" बटण दाबून माहिती नोंदवू शकता. खोटी माहिती रोखण्यासाठी वेगाची आणि थांब्यांच्या क्रमाची पडताळणी केली जाते.'
                : language === 'hi'
                ? 'पुणे की PMPML बसों की समयबद्धता के लिए यह ऐप नागरिकों के सहयोग और AI से बनाया गया है। बस में यात्रा करते समय अपनी स्थिति दर्ज करें। फर्जी रिपोर्ट रोकने के लिए रूट और समय की स्वचालित जांच होती है।'
                : "Built to solve Pune's bus timing unpredictability. Real Punekars verify live bus positions in 1-tap, protected by anti-spoofing route sequence verification. All datasets can be easily updated with official PMPML GTFS feeds."}
            </p>
          </div>
        </div>
      </main>

      {/* Floating Emergency SOS Button on Trip Screen */}
      <aside aria-label="Emergency SOS trigger" className="fixed bottom-5 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsSosModalOpen(true)}
          className={`p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl border-2 flex items-center gap-2 cursor-pointer transition transform hover:scale-105 ${
            isSafetyMode
              ? 'bg-red-600 hover:bg-red-500 text-white border-red-300 ring-4 ring-red-300 animate-pulse'
              : 'bg-rose-700 hover:bg-rose-600 text-white border-rose-400'
          }`}
          title="Emergency SOS (5s countdown)"
        >
          <span className="text-xl">🚨</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider hidden sm:inline">
            SOS (५ सेकंद)
          </span>
        </button>
      </aside>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-5 px-4 mt-8 border-t border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-stone-200 text-sm">
              PuneBus Saathi (पुणे बस साथी)
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Empowering Pune students, elderly, daily wage workers & newcomers with multilingual mobility.
            </p>
          </div>
          <div className="text-[11px] text-stone-400">
            PMPML Corridor Network • Marathi, Hindi & English Voice Assistant
          </div>
        </div>
      </footer>

      {/* Report Modal */}
      <ReportBusModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        language={language}
        preselectedRoute={prefillRoute}
        preselectedStopId={prefillStop}
        onReportSubmitted={() => {
          refreshRoutes();
        }}
      />

      {/* Live Crowd Feed Modal */}
      <CrowdReportsFeed
        isOpen={isCrowdFeedOpen}
        onClose={() => setIsCrowdFeedOpen(false)}
        language={language}
        reports={reports}
        onOpenReportModal={() => handleOpenReportModal()}
      />

      {/* Bus Board Photo Scanner Modal (Gemini Vision OCR) */}
      <BusScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        language={language}
        currentDestinationStopId={destinationStopId}
        onSelectDestination={(stopId) => {
          setDestinationStopId(stopId);
        }}
      />

      {/* Women's Safety Trusted Contacts Modal */}
      <SafetyContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        language={language}
        onContactsUpdated={() => {}}
      />

      {/* Emergency SOS Countdown & Dispatch Modal */}
      <SosCountdownModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        language={language}
      />

      {/* Alight Reminder Configuration Modal */}
      {reminderDestStop && (
        <AlightReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          language={language}
          destinationStop={reminderDestStop}
          routeNumber={reminderRouteNum}
          intermediateStops={reminderIntermediateStops}
          totalDurationMinutes={reminderDuration}
          onReminderSet={() => {
            // Updated via subscriber
          }}
        />
      )}

      {/* Alight Alarm Notification Trigger Popup */}
      {activeReminder && activeReminder.hasTriggered && (
        <AlightAlarmNotification
          isOpen={true}
          onDismiss={() => {
            alightReminderManager.cancelReminder();
          }}
          language={language}
          destinationStop={activeReminder.destinationStop}
          routeNumber={activeReminder.routeNumber}
          onOpenReportModal={() => {
            handleOpenReportModal(activeReminder.routeNumber, activeReminder.destinationStop.id);
          }}
        />
      )}

      {/* Attractive, Clutter-Free Pune Transit Splash Screen */}
      {showSplash && (
        <SplashScreen
          language={language}
          onLanguageChange={setLanguage}
          onDismiss={() => setShowSplash(false)}
          autoDismissSeconds={3.5}
        />
      )}
    </div>
  );
}
