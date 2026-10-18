import React, { useState, useEffect } from 'react';
import { Language } from '../types/pmpml';
import { getTranslation } from '../utils/i18n';
import { TrustedContact, getTrustedContacts, saveTrustedContacts } from '../utils/safetyMode';
import { Shield, ShieldCheck, UserPlus, Trash2, X, Lock, Phone, User, Check } from 'lucide-react';

interface SafetyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onContactsUpdated: () => void;
}

export const SafetyContactsModal: React.FC<SafetyContactsModalProps> = ({
  isOpen,
  onClose,
  language,
  onContactsUpdated
}) => {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContacts(getTrustedContacts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nameInput.trim() || !phoneInput.trim()) {
      setErrorMsg(language === 'mr' ? 'कृपया नाव आणि फोन नंबर भरा.' : language === 'hi' ? 'कृपया नाम और फोन नंबर दर्ज करें।' : 'Please enter name and phone.');
      return;
    }

    if (contacts.length >= 3) {
      setErrorMsg(language === 'mr' ? 'कमाल ३ संपर्क जोडता येतात.' : language === 'hi' ? 'अधिकतम 3 संपर्क जोड़े जा सकते हैं।' : 'Maximum 3 trusted contacts allowed.');
      return;
    }

    const newContact: TrustedContact = {
      id: 'tc_' + Date.now(),
      name: nameInput.trim(),
      phone: phoneInput.trim()
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveTrustedContacts(updated);
    setNameInput('');
    setPhoneInput('');
    onContactsUpdated();
  };

  const handleDelete = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveTrustedContacts(updated);
    onContactsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'mr' ? 'सुरक्षित संपर्क (Trusted Contacts)' : language === 'hi' ? 'विश्वसनीय संपर्क (Trusted Contacts)' : 'Trusted Safety Contacts'}
              </h2>
              <p className="text-xs text-rose-100">
                Women's Safety Mode
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

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Privacy Guarantee Banner */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-900 font-semibold">
            <Lock className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">
                {language === 'mr'
                  ? 'तुमचे संपर्क आणि स्थान फक्त तुमच्या फोनवर सुरक्षित राहतात.'
                  : language === 'hi'
                  ? 'आपके संपर्क और स्थान केवल आपके फोन पर सुरक्षित रहते हैं।'
                  : 'Your contacts and location stay on your phone. Nothing is sent to any server.'}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-normal">
                {language === 'mr'
                  ? 'आणीबाणीच्या वेळी एका क्लिकवर व्हॉट्सॲप व एसएमएसद्वारे स्थान शेअर केले जाते.'
                  : language === 'hi'
                  ? 'आपातकाल में एक क्लिक पर व्हाट्सएप या एसएमएस से लोकेशन भेजी जाती है।'
                  : 'Used only for 1-tap WhatsApp location sharing and emergency SOS dispatch.'}
              </p>
            </div>
          </div>

          {/* Current Contacts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>
                {language === 'mr' ? 'जतन केलेले संपर्क' : language === 'hi' ? 'सहेजे गए संपर्क' : 'Saved Contacts'} ({contacts.length}/3)
              </span>
            </div>

            {contacts.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-center text-xs text-stone-500">
                {language === 'mr' ? 'अद्याप कोणतेही संपर्क जोडलेले नाहीत. खाली नाव आणि नंबर जोडा.' : language === 'hi' ? 'अभी कोई संपर्क नहीं जोड़ा गया है। नीचे नाम और नंबर जोड़ें।' : 'No trusted contacts added yet. Add family or friends below.'}
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div key={c.id} className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-extrabold text-stone-900">{c.name}</p>
                        <p className="text-stone-500 font-mono text-[11px]">{c.phone}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Contact Form */}
          {contacts.length < 3 && (
            <form onSubmit={handleAddContact} className="bg-rose-50/50 border border-rose-200 rounded-2xl p-3.5 space-y-3">
              <span className="text-xs font-extrabold text-rose-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-rose-700" />
                <span>
                  {language === 'mr' ? 'नवीन संपर्क जोडा' : language === 'hi' ? 'नया संपर्क जोड़ें' : 'Add Trusted Contact'}
                </span>
              </span>

              <div className="space-y-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder={language === 'mr' ? 'नाव (उदा. आई, भाऊ, मित्र)' : language === 'hi' ? 'नाम (उदा. माँ, भाई, मित्र)' : 'Name (e.g. Mom, Brother, Friend)'}
                    className="w-full bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder={language === 'mr' ? 'मोबाईल नंबर (उदा. 9822012345)' : language === 'hi' ? 'मोबाइल नंबर (उदा. 9822012345)' : 'Mobile Number (e.g. 9822012345)'}
                    className="w-full bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-bold text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'संपर्क जतन करा' : language === 'hi' ? 'संपर्क सहेजें' : 'Save Contact'}</span>
              </button>
            </form>
          )}

          {/* Quick Helplines */}
          <div className="bg-stone-100 p-3 rounded-2xl border border-stone-200 text-xs space-y-1.5">
            <span className="font-bold text-stone-700 block uppercase text-[10px]">
              {language === 'mr' ? 'पुणे पोलीस तत्काळ हेल्पलाईन:' : language === 'hi' ? 'पुणे पुलिस आपातकालीन हेल्पलाइन:' : 'Pune Police Emergency Helplines:'}
            </span>
            <div className="flex items-center justify-between gap-2">
              <a
                href="tel:112"
                className="flex-1 bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 font-bold p-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5 text-rose-700" />
                <span>112 (पोलीस / Police)</span>
              </a>
              <a
                href="tel:1091"
                className="flex-1 bg-white hover:bg-pink-50 border border-pink-300 text-pink-900 font-bold p-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5 text-pink-700" />
                <span>1091 (महिला हेल्पलाईन)</span>
              </a>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs transition cursor-pointer"
            >
              {language === 'mr' ? 'पूर्ण झाले' : language === 'hi' ? 'हो गया' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
