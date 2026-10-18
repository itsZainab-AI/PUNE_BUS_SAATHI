import React, { useState, useRef } from 'react';
import { Language, PuneStop, PuneRoute } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { speakText, stopSpeaking } from '../utils/speech';
import { PUNE_STOPS, getStopById } from '../utils/routeFinder';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  Compass,
  Bus
} from 'lucide-react';

interface BusScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentDestinationStopId: string | null;
  onSelectDestination: (stopId: string) => void;
  onSelectRouteOption?: (routeNumber: string) => void;
}

interface ScanResult {
  success: boolean;
  isBoardReadable: boolean;
  routeNumber?: string;
  destinationText?: string;
  confidence?: number;
  isKnownRoute?: boolean;
  route?: PuneRoute;
  nextStops?: Array<{ id: string; name: string; name_mr: string; name_hi: string }>;
  goesToDestination?: boolean | null;
  message: string;
  spokenScript: string;
  explanation?: string;
}

export const BusScannerModal: React.FC<BusScannerModalProps> = ({
  isOpen,
  onClose,
  language,
  currentDestinationStopId,
  onSelectDestination,
  onSelectRouteOption
}) => {
  const t = getTranslation(language);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [userSelectedDestId, setUserSelectedDestId] = useState<string>(currentDestinationStopId || '');

  if (!isOpen) return null;

  const getStopName = (stop: { name: string; name_mr: string; name_hi: string }) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string, destinationIdOverride?: string) => {
    setIsScanning(true);
    setScanResult(null);
    stopSpeaking();
    setIsPlayingAudio(false);

    try {
      const res = await fetch('/api/gemini/scan-bus-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: 'image/jpeg',
          currentDestinationStopId: destinationIdOverride !== undefined ? destinationIdOverride : (currentDestinationStopId || userSelectedDestId || null),
          userLanguage: language
        })
      });

      if (res.ok) {
        const data: ScanResult = await res.json();
        setScanResult(data);

        // Auto read aloud if readable
        if (data.isBoardReadable && data.spokenScript) {
          setIsPlayingAudio(true);
          speakText(data.spokenScript, language, () => {
            setIsPlayingAudio(false);
          });
        }
      } else {
        setScanResult({
          success: false,
          isBoardReadable: false,
          message: language === 'mr'
            ? 'फोटो तपासण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
            : language === 'hi'
            ? 'फ़ोटो स्कैन करने में समस्या हुई। कृपया दोबारा प्रयास करें।'
            : 'Error processing photo. Please try again.',
          spokenScript: 'Error processing photo.'
        });
      }
    } catch (err) {
      console.error('Scan photo error:', err);
      setScanResult({
        success: false,
        isBoardReadable: false,
        message: language === 'mr'
          ? 'नेटवर्क समस्या. कृपया इंटरनेट तपासा.'
          : language === 'hi'
          ? 'नेटवर्क त्रुटि। कृपया इंटरनेट कनेक्शन जांचें।'
          : 'Network error. Please check your connection.',
        spokenScript: 'Network error.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Re-check destination compatibility when user picks a destination in the modal
  const handleDestinationChange = (newDestId: string) => {
    setUserSelectedDestId(newDestId);
    onSelectDestination(newDestId);
    if (selectedImage) {
      processImage(selectedImage, newDestId);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    if (scanResult?.spokenScript) {
      setIsPlayingAudio(true);
      speakText(scanResult.spokenScript, language, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  // Pre-configured simulated sample bus photos for instant testing without camera
  const loadSampleBoard = (sampleType: '11_swargate' | '100_hinjewadi' | 'blurry') => {
    let mockSvg = '';
    if (sampleType === '11_swargate') {
      mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231a1a1a"/><rect x="20" y="20" width="360" height="160" rx="10" fill="%23000" stroke="%23f97316" stroke-width="4"/><text x="50" y="115" font-family="monospace" font-size="70" font-weight="900" fill="%23f59e0b">11</text><text x="160" y="85" font-family="sans-serif" font-size="28" font-weight="bold" fill="%23fef08a">स्वारगेट</text><text x="160" y="125" font-family="sans-serif" font-size="22" font-weight="bold" fill="%23fdba74">SWARGATE</text><text x="160" y="155" font-family="sans-serif" font-size="14" fill="%239ca3af">via Karve Rd / Nal Stop</text></svg>`;
    } else if (sampleType === '100_hinjewadi') {
      mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231a1a1a"/><rect x="20" y="20" width="360" height="160" rx="10" fill="%23000" stroke="%2310b981" stroke-width="4"/><text x="40" y="115" font-family="monospace" font-size="65" font-weight="900" fill="%2334d399">100</text><text x="180" y="85" font-family="sans-serif" font-size="26" font-weight="bold" fill="%236ee7b7">हिंजेवाडी फेज ३</text><text x="180" y="125" font-family="sans-serif" font-size="22" font-weight="bold" fill="%23a7f3d0">HINJEWADI</text><text x="180" y="155" font-family="sans-serif" font-size="14" fill="%239ca3af">IT Express</text></svg>`;
    } else {
      mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%23525252"/><filter id="b"><feGaussianBlur stdDeviation="12"/></filter><circle cx="200" cy="100" r="80" fill="%23f59e0b" filter="url(%23b)"/><text x="150" y="110" font-family="sans-serif" font-size="20" fill="%23ffffff" opacity="0.4" filter="url(%23b)">BLURRY BUS</text></svg>`;
    }

    setSelectedImage(mockSvg);
    processImage(mockSvg);
  };

  const currentDestObj = getStopById(userSelectedDestId || currentDestinationStopId || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'mr' ? 'बस फलक फोटो स्कॅनर' : language === 'hi' ? 'बस बोर्ड फ़ोटो स्कैनर' : 'Bus Board Photo Scanner'}
              </h2>
              <p className="text-xs text-amber-100">
                Powered by Gemini Vision (OCR)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Target Destination Check Bar */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {language === 'mr' ? 'तुमचे इच्छित गंतव्य थांबा:' : language === 'hi' ? 'आपकी मंज़िल का स्टॉप:' : 'Your Target Destination:'}
                </span>
              </label>
              {currentDestObj && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active
                </span>
              )}
            </div>

            <select
              value={userSelectedDestId || currentDestinationStopId || ''}
              onChange={e => handleDestinationChange(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-xl p-2 text-xs sm:text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- {language === 'mr' ? 'तुम्हाला कुठे जायचे आहे निवडा?' : language === 'hi' ? 'आपको कहाँ जाना है चुनें?' : 'Select where you want to go'} --</option>
              {PUNE_STOPS.map(stop => (
                <option key={stop.id} value={stop.id}>
                  {getStopName(stop)} ({stop.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Photo Capture / Upload Box */}
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedImage ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-orange-300 bg-stone-900 flex items-center justify-center max-h-48 shadow-inner">
                <img
                  src={selectedImage}
                  alt="Bus Board"
                  className="max-h-48 w-full object-contain"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setScanResult(null);
                    stopSpeaking();
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-full transition cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/50 hover:bg-orange-50 flex flex-col items-center justify-center gap-2 transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-100 group-hover:bg-orange-200 text-orange-700 flex items-center justify-center transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-stone-800 text-center">
                    {language === 'mr' ? 'कॅमेऱ्याने फोटो काढा' : language === 'hi' ? 'कैमरे से फ़ोटो लें' : 'Take Camera Photo'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 hover:bg-stone-100 flex flex-col items-center justify-center gap-2 transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-stone-200 group-hover:bg-stone-300 text-stone-700 flex items-center justify-center transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-stone-800 text-center">
                    {language === 'mr' ? 'गॅलरीतून फोटो निवडा' : language === 'hi' ? 'गैलरी से फ़ोटो चुनें' : 'Upload from Gallery'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Sample Photos for Testing */}
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block mb-1.5">
              {language === 'mr' ? 'थेट चाचणीसाठी नमुना बस फलक:' : language === 'hi' ? 'परीक्षण के लिए सैंपल बस बोर्ड:' : 'Try with sample bus photos (Instant test):'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => loadSampleBoard('11_swargate')}
                className="text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <span>🚌</span>
                <span>Bus 11 (स्वारगेट)</span>
              </button>
              <button
                type="button"
                onClick={() => loadSampleBoard('100_hinjewadi')}
                className="text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <span>🚌</span>
                <span>Bus 100 (हिंजेवाडी)</span>
              </button>
              <button
                type="button"
                onClick={() => loadSampleBoard('blurry')}
                className="text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <span>🌫️</span>
                <span>Blurry photo</span>
              </button>
            </div>
          </div>

          {/* Scanning In Progress */}
          {isScanning && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center space-y-2 animate-pulse">
              <RefreshCw className="w-7 h-7 text-orange-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-orange-950">
                {language === 'mr' ? 'जेमिनी व्हिजन बस फलक वाचत आहे...' : language === 'hi' ? 'जेमिनी विजन बस बोर्ड पढ़ रहा है...' : 'Gemini Vision is analyzing the bus board...'}
              </p>
              <p className="text-xs text-orange-700">
                Detecting route number & Marathi/English destination
              </p>
            </div>
          )}

          {/* Scan Results Card */}
          {scanResult && !isScanning && (
            <div className={`rounded-2xl p-4 border-2 shadow-sm space-y-3 transition-all ${
              !scanResult.isBoardReadable
                ? 'bg-red-50/80 border-red-300 text-red-950'
                : scanResult.goesToDestination === true
                ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                : scanResult.goesToDestination === false
                ? 'bg-amber-50/90 border-amber-400 text-amber-950'
                : 'bg-stone-50 border-stone-300 text-stone-900'
            }`}>
              {/* Header result row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {scanResult.isBoardReadable ? (
                    scanResult.goesToDestination === true ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : scanResult.goesToDestination === false ? (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    ) : (
                      <Bus className="w-6 h-6 text-orange-600 flex-shrink-0" />
                    )
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    {scanResult.isBoardReadable ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-stone-900">
                          Bus {scanResult.routeNumber}
                        </span>
                        <span className="text-xs font-bold text-stone-600 truncate">
                          ➔ {scanResult.destinationText}
                        </span>
                      </div>
                    ) : (
                      <h4 className="font-extrabold text-sm text-red-900">
                        {language === 'mr' ? 'फलक वाचता आला नाही' : language === 'hi' ? 'बोर्ड नहीं पढ़ा जा सका' : 'Board Unclear'}
                      </h4>
                    )}
                  </div>
                </div>

                {/* Speaker button to read aloud */}
                {scanResult.spokenScript && (
                  <button
                    type="button"
                    onClick={handleToggleAudio}
                    className={`p-2 rounded-xl border flex items-center gap-1 text-xs font-bold transition cursor-pointer ${
                      isPlayingAudio
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-white hover:bg-orange-50 text-orange-800 border-orange-300 shadow-xs'
                    }`}
                    title="Listen"
                  >
                    {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Message Explanation */}
              <p className="text-xs sm:text-sm font-bold leading-relaxed">
                {scanResult.message}
              </p>

              {/* Destination Compatibility Banner */}
              {scanResult.isBoardReadable && (
                <div>
                  {scanResult.goesToDestination === true ? (
                    <div className="bg-emerald-100 text-emerald-900 p-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>
                        {language === 'mr'
                          ? `योग्य बस! ही बस तुमच्या इच्छित स्थानी (${currentDestObj?.name_mr || currentDestObj?.name}) जाते.`
                          : language === 'hi'
                          ? `सही बस! यह आपके स्टॉप (${currentDestObj?.name_hi || currentDestObj?.name}) तक जाती है।`
                          : `Correct Bus! This goes to your stop (${currentDestObj?.name}).`}
                      </span>
                    </div>
                  ) : scanResult.goesToDestination === false ? (
                    <div className="bg-red-100 text-red-900 p-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border border-red-300">
                      <XCircle className="w-4 h-4 text-red-700" />
                      <span>
                        {language === 'mr'
                          ? `ही बस ${currentDestObj?.name_mr || currentDestObj?.name} ला जात नाही. कृपया दुसरी बस पहा.`
                          : language === 'hi'
                          ? `यह बस ${currentDestObj?.name_hi || currentDestObj?.name} नहीं जाती। कृपया दूसरी बस देखें।`
                          : `This bus does NOT go to ${currentDestObj?.name}. Please wait for another bus.`}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-stone-100 text-stone-800 p-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border border-stone-200">
                      <span>
                        {language === 'mr' ? 'तुम्हाला कुठे जायचे आहे निवडून तपासा.' : language === 'hi' ? 'अपनी मंज़िल चुनकर जांचें।' : 'Select a destination above to verify if this bus goes there.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Next 3 Stops of this bus */}
              {scanResult.nextStops && scanResult.nextStops.length > 0 && (
                <div className="bg-white/80 p-3 rounded-xl border border-stone-200 text-xs space-y-1.5">
                  <span className="font-extrabold text-stone-700 block uppercase text-[10px]">
                    {language === 'mr' ? 'या बसचे पुढील ३ थांबे:' : language === 'hi' ? 'इस बस के अगले 3 स्टॉप:' : 'Next 3 stops on this bus:'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {scanResult.nextStops.map((st, i) => (
                      <span key={st.id} className="inline-flex items-center gap-1 bg-stone-100 text-stone-900 font-bold px-2 py-1 rounded-md text-[11px]">
                        <span>{i + 1}.</span>
                        <span>{getStopName(st)}</span>
                        {i < scanResult.nextStops!.length - 1 && <ArrowRight className="w-3 h-3 text-stone-400" />}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Close */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-sm transition cursor-pointer"
            >
              {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
