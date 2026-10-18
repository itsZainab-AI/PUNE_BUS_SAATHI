import React, { useState, useEffect } from 'react';
import { Language } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { getTrustedContacts, createSosEmergencyUrl } from '../utils/safetyMode';
import { alightReminderManager } from '../utils/reminder';
import { ShieldAlert, Phone, X, MessageSquare, AlertTriangle, ExternalLink } from 'lucide-react';

interface SosCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const SosCountdownModal: React.FC<SosCountdownModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [emergencyUrl, setEmergencyUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setIsTriggered(false);
      return;
    }

    // Prepare emergency URL with first contact or broad dispatch
    const contacts = getTrustedContacts();
    const primaryPhone = contacts.length > 0 ? contacts[0].phone : undefined;
    createSosEmergencyUrl(primaryPhone).then(url => {
      setEmergencyUrl(url);
    });

    // 5-second countdown timer
    let remaining = 5;
    setCountdown(5);
    setIsTriggered(false);

    const timer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      alightReminderManager.playSubtleBeep();

      if (remaining <= 0) {
        clearInterval(timer);
        setIsTriggered(true);
        alightReminderManager.playTransitChime();

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([600, 200, 600, 200, 800]);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-red-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-4 border-red-600 overflow-hidden text-center p-6 space-y-4">
        {!isTriggered ? (
          /* Countdown State */
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 border-4 border-red-500 flex items-center justify-center text-red-600 shadow-xl animate-pulse">
              <span className="text-4xl font-black">{countdown}</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-red-700 leading-tight">
                {language === 'mr' ? 'आणीबाणी SOS सक्रिय होत आहे...' : language === 'hi' ? 'आपातकालीन SOS सक्रिय हो रहा है...' : 'Triggering Emergency SOS...'}
              </h2>
              <p className="text-xs text-stone-600 mt-1 font-semibold">
                {language === 'mr'
                  ? 'अनावधानाने दाबले असल्यास खालील बटण दाबून रद्द करा.'
                  : language === 'hi'
                  ? 'गलती से दबा हो तो नीचे दिए गए बटन से तुरंत रद्द करें।'
                  : 'If pressed accidentally, cancel below within 5 seconds.'}
              </p>
            </div>

            {/* Cancel Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-stone-900 hover:bg-black text-white font-extrabold py-3.5 rounded-2xl text-sm transition cursor-pointer shadow-md"
              >
                {language === 'mr' ? '❌ रद्द करा (Cancel SOS)' : language === 'hi' ? '❌ रद्द करें (Cancel SOS)' : '❌ Cancel SOS'}
              </button>
            </div>
          </div>
        ) : (
          /* Triggered Emergency Action State */
          <div className="space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg animate-bounce">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-red-700 leading-tight">
                {language === 'mr' ? 'मदत संदेश तयार आहे!' : language === 'hi' ? 'मदद संदेश तैयार है!' : 'SOS Emergency Alert Ready!'}
              </h2>
              <p className="text-xs text-stone-700 font-bold mt-1">
                {language === 'mr'
                  ? 'खालील बटण दाबून त्वरित पोलीस किंवा संपर्कांशी संपर्क साधा.'
                  : language === 'hi'
                  ? 'नीचे दिए गए बटन से तुरंत पुलिस या परिजनों से संपर्क करें।'
                  : 'Tap below to dispatch your live location to contacts or call emergency helplines.'}
              </p>
            </div>

            {/* Dispatch to Contacts via WhatsApp */}
            {emergencyUrl && (
              <a
                href={emergencyUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {language === 'mr' ? 'व्हॉट्सॲपवर स्थान पाठवा' : language === 'hi' ? 'व्हाट्सएप पर लोकेशन भेजें' : 'Send Live Location on WhatsApp'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Direct Call Helplines */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="tel:112"
                className="bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md transition"
              >
                <Phone className="w-5 h-5" />
                <span className="text-xs">112 (पोलीस)</span>
              </a>

              <a
                href="tel:1091"
                className="bg-pink-700 hover:bg-pink-800 text-white font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md transition"
              >
                <Phone className="w-5 h-5" />
                <span className="text-xs">1091 (महिला हेल्पलाईन)</span>
              </a>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-stone-600 hover:text-stone-900 underline"
              >
                {language === 'mr' ? 'थांबवा / स्क्रीन बंद करा' : language === 'hi' ? 'रोकें / बंद करें' : 'Dismiss Alert'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
