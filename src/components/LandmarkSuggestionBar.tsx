import React from 'react';
import { Language } from '../types/pmpml';
import { PuneLandmark, formatNearestStopInfo } from '../utils/landmarkFinder';
import { MapPin, Navigation, Footprints, Check } from 'lucide-react';

interface LandmarkSuggestionBarProps {
  landmarks: PuneLandmark[];
  language: Language;
  onSelectLandmarkAsOrigin: (lm: PuneLandmark) => void;
  onSelectLandmarkAsDestination: (lm: PuneLandmark) => void;
  onDismiss: () => void;
}

export const LandmarkSuggestionBar: React.FC<LandmarkSuggestionBarProps> = ({
  landmarks,
  language,
  onSelectLandmarkAsOrigin,
  onSelectLandmarkAsDestination,
  onDismiss
}) => {
  if (!landmarks || landmarks.length === 0) return null;

  return (
    <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3 shadow-xs space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
        <span className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-orange-600" />
          <span>
            {landmarks.length > 1
              ? (language === 'mr' ? 'अनेक ठिकाणे आढळली (निवडा):' : language === 'hi' ? 'कई स्थान मिले (चुनें):' : 'Multiple landmarks found (select one):')
              : (language === 'mr' ? 'पुण्यातील प्रसिद्ध ठिकाण आढळले:' : language === 'hi' ? 'प्रसिद्ध स्थान मिला:' : 'Pune Landmark Recognized:')}
          </span>
        </span>
        <button
          onClick={onDismiss}
          className="text-stone-400 hover:text-stone-600 text-xs px-1"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {landmarks.slice(0, 3).map(lm => {
          const info = formatNearestStopInfo(lm, language);
          const lmName = language === 'mr' ? lm.name_mr : language === 'hi' ? lm.name_hi : lm.name;

          return (
            <div
              key={lm.id}
              className="bg-white p-2.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-extrabold text-stone-900 flex items-center gap-1">
                  <span>🏛️ {lmName}</span>
                  <span className="text-[10px] font-semibold text-stone-500">({lm.area})</span>
                </div>
                <div className="text-[11px] text-orange-800 font-semibold flex items-center gap-1 mt-0.5">
                  <Footprints className="w-3 h-3 text-orange-600" />
                  <span>{info.infoText}</span>
                </div>
              </div>

              {/* Tappable buttons: Set as Start or Destination */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectLandmarkAsOrigin(lm)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                >
                  {language === 'mr' ? 'येथून सुरुवात' : language === 'hi' ? 'यहाँ से शुरू' : 'From here'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLandmarkAsDestination(lm)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-xs transition cursor-pointer"
                >
                  {language === 'mr' ? 'येथे जा' : language === 'hi' ? 'यहाँ जाएं' : 'Go here'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
