import React, { useState } from 'react';
import { RouteOption, Language, PuneStop } from '../types/pmpml';
import { PUNE_STOPS, getStopById } from '../utils/routeFinder';
import { getTranslation } from '../utils/i18n';
import { Bus, MapPin, ZoomIn, ZoomOut, RotateCcw, Navigation } from 'lucide-react';

interface PuneTransitMapProps {
  selectedRouteOption: RouteOption | null;
  originStopId: string | null;
  destinationStopId: string | null;
  language: Language;
  onSelectStop: (stopId: string) => void;
}

// Bounding box for Pune metropolitan area stops
// Lat: ~18.44 (Katraj) to ~18.66 (Nigdi)
// Lng: ~73.68 (Hinjewadi P3) to ~73.94 (Hadapsar/Airport)
const MIN_LAT = 18.44;
const MAX_LAT = 18.67;
const MIN_LNG = 73.68;
const MAX_LNG = 73.95;

const SVG_WIDTH = 900;
const SVG_HEIGHT = 650;
const PADDING = 60;

function projectCoords(lat: number, lng: number) {
  const x = PADDING + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (SVG_WIDTH - 2 * PADDING);
  // Invert Y because latitude increases North (upwards), while SVG Y increases downwards
  const y = SVG_HEIGHT - (PADDING + ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * (SVG_HEIGHT - 2 * PADDING));
  return { x, y };
}

export const PuneTransitMap: React.FC<PuneTransitMapProps> = ({
  selectedRouteOption,
  originStopId,
  destinationStopId,
  language,
  onSelectStop
}) => {
  const t = getTranslation(language);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredStop, setHoveredStop] = useState<PuneStop | null>(null);

  const getStopName = (stop: PuneStop) => {
    if (language === 'mr') return stop.name_mr;
    if (language === 'hi') return stop.name_hi;
    return stop.name;
  };

  // Build route lines for active segments
  const activeSegments = selectedRouteOption?.segments || [];

  return (
    <div className="bg-stone-900 rounded-3xl overflow-hidden shadow-xl border border-stone-800 relative">
      {/* Map Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-700 pointer-events-auto text-xs text-stone-200 flex items-center gap-2 shadow-md">
          <Navigation className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-bold">{t.mapTitle}</span>
          {selectedRouteOption && (
            <span className="bg-orange-600/80 text-white font-extrabold px-1.5 py-0.5 rounded text-[10px]">
              {selectedRouteOption.segments.map(s => `Bus ${s.route.routeNumber}`).join(' ➔ ')}
            </span>
          )}
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-1 bg-stone-900/90 backdrop-blur-md p-1 rounded-xl border border-stone-700 pointer-events-auto shadow-md">
          <button
            onClick={() => setZoomLevel(prev => Math.min(2.2, prev + 0.2))}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.2))}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="w-full h-[400px] sm:h-[480px] overflow-hidden relative cursor-grab active:cursor-grabbing bg-radial from-stone-900 via-stone-950 to-black">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full transition-transform duration-200 ease-out select-none"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#262626" strokeWidth="0.5" />
            </pattern>

            {/* Glowing filter for active bus route */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#grid)" />

          {/* Mula-Mutha River Geographic Stylized Path */}
          <path
            d="M 50,340 C 220,330 320,380 430,340 C 510,310 610,340 730,310 L 880,315"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="8"
            strokeOpacity="0.35"
            strokeLinecap="round"
          />
          <text x="740" y="300" fill="#3b82f6" opacity="0.4" fontSize="10" fontWeight="bold">
            Mula-Mutha River (मुळा-मुठा नदी)
          </text>

          {/* Background Network Connectivity lines */}
          <g stroke="#404040" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.3">
            {/* Swargate to Hadapsar */}
            <line x1={projectCoords(18.5018, 73.8586).x} y1={projectCoords(18.5018, 73.8586).y} x2={projectCoords(18.5020, 73.9285).x} y2={projectCoords(18.5020, 73.9285).y} />
            {/* Swargate to Katraj */}
            <line x1={projectCoords(18.5018, 73.8586).x} y1={projectCoords(18.5018, 73.8586).y} x2={projectCoords(18.4529, 73.8554).x} y2={projectCoords(18.4529, 73.8554).y} />
            {/* Swargate to Kothrud */}
            <line x1={projectCoords(18.5018, 73.8586).x} y1={projectCoords(18.5018, 73.8586).y} x2={projectCoords(18.5074, 73.8077).x} y2={projectCoords(18.5074, 73.8077).y} />
            {/* Shivajinagar to Hinjewadi */}
            <line x1={projectCoords(18.5314, 73.8446).x} y1={projectCoords(18.5314, 73.8446).y} x2={projectCoords(18.5835, 73.6982).x} y2={projectCoords(18.5835, 73.6982).y} />
            {/* Shivajinagar to Nigdi */}
            <line x1={projectCoords(18.5314, 73.8446).x} y1={projectCoords(18.5314, 73.8446).y} x2={projectCoords(18.6534, 73.7712).x} y2={projectCoords(18.6534, 73.7712).y} />
            {/* Pune Station to Airport */}
            <line x1={projectCoords(18.5284, 73.8744).x} y1={projectCoords(18.5284, 73.8744).y} x2={projectCoords(18.5807, 73.9197).x} y2={projectCoords(18.5807, 73.9197).y} />
          </g>

          {/* Active Highlighted Route Paths */}
          {activeSegments.map((seg, sIdx) => {
            const allSegStops = [seg.fromStop, ...seg.intermediateStops, seg.toStop];
            const points = allSegStops.map(s => {
              const p = projectCoords(s.lat, s.lng);
              return `${p.x},${p.y}`;
            }).join(' ');

            const routeColor = seg.route.color || '#E65100';

            return (
              <g key={sIdx}>
                {/* Glow layer */}
                <polyline
                  points={points}
                  fill="none"
                  stroke={routeColor}
                  strokeWidth="10"
                  strokeOpacity="0.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Crisp active line with animation */}
                <polyline
                  points={points}
                  fill="none"
                  stroke={routeColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* All Bus Stops Nodes */}
          {PUNE_STOPS.map(stop => {
            const p = projectCoords(stop.lat, stop.lng);
            const isOrigin = stop.id === originStopId;
            const isDest = stop.id === destinationStopId;
            const isSelectedRouteStop = activeSegments.some(seg =>
              seg.fromStop.id === stop.id ||
              seg.toStop.id === stop.id ||
              seg.intermediateStops.some(i => i.id === stop.id)
            );
            const isTransfer = selectedRouteOption?.transferStop?.id === stop.id;

            return (
              <g
                key={stop.id}
                className="cursor-pointer group"
                onClick={() => onSelectStop(stop.id)}
                onMouseEnter={() => setHoveredStop(stop)}
                onMouseLeave={() => setHoveredStop(null)}
              >
                {/* Outer halo if selected */}
                {(isOrigin || isDest || isTransfer) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isOrigin || isDest ? "14" : "11"}
                    fill={isOrigin ? "#10b981" : isDest ? "#ef4444" : "#f59e0b"}
                    fillOpacity="0.3"
                    className="animate-ping"
                  />
                )}

                {/* Stop Circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isOrigin || isDest ? "7" : stop.isMajorHub ? "5.5" : isSelectedRouteStop ? "4.5" : "3.5"}
                  fill={
                    isOrigin
                      ? "#10b981" // Emerald for origin
                      : isDest
                      ? "#ef4444" // Red for destination
                      : isTransfer
                      ? "#f59e0b" // Amber for transfer hub
                      : isSelectedRouteStop
                      ? "#fb923c"
                      : stop.isMajorHub
                      ? "#e5e7eb"
                      : "#737373"
                  }
                  stroke={isSelectedRouteStop ? "#ffffff" : "#171717"}
                  strokeWidth="1.5"
                />

                {/* Stop Label (Visible for major hubs or active route stops) */}
                {(stop.isMajorHub || isSelectedRouteStop || isOrigin || isDest) && (
                  <text
                    x={p.x}
                    y={p.y + (isOrigin || isDest ? 16 : 13)}
                    textAnchor="middle"
                    fill={
                      isOrigin
                        ? "#34d399"
                        : isDest
                        ? "#f87171"
                        : isSelectedRouteStop
                        ? "#fcd34d"
                        : "#d1d5db"
                    }
                    fontSize={isOrigin || isDest ? "12" : stop.isMajorHub ? "10.5" : "9.5"}
                    fontWeight={isOrigin || isDest || stop.isMajorHub ? "bold" : "normal"}
                    className="pointer-events-none drop-shadow-md select-none"
                  >
                    {getStopName(stop)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Live Verified Buses moving on the map */}
          {activeSegments.map((seg, sIdx) => {
            const currentStop = seg.currentCrowdStop || seg.fromStop;
            const p = projectCoords(currentStop.lat, currentStop.lng);

            return (
              <g key={`live_bus_${sIdx}`} transform={`translate(${p.x - 14}, ${p.y - 14})`}>
                {/* Radar Pulse */}
                <circle cx="14" cy="14" r="18" fill={seg.route.color} fillOpacity="0.25" className="animate-ping" />
                {/* Bus Badge */}
                <rect width="28" height="28" rx="8" fill={seg.route.color || '#E65100'} stroke="#ffffff" strokeWidth="1.5" className="shadow-lg" />
                <text x="14" y="18" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                  {seg.route.routeNumber}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip for Hovered Stop */}
        {hoveredStop && (
          <div className="absolute bottom-3 left-3 bg-stone-900/95 border border-stone-700 text-white p-2.5 rounded-xl shadow-xl text-xs max-w-xs pointer-events-none">
            <p className="font-extrabold text-orange-400 text-sm">
              {getStopName(hoveredStop)}
            </p>
            <p className="text-stone-300 text-[11px] mt-0.5">
              {hoveredStop.popularLandmark}
            </p>
            <p className="text-[10px] text-stone-400 mt-1">
              {language === 'mr' ? 'क्लिक करून थांबा निवडा' : language === 'hi' ? 'क्लिक करके स्टॉप चुनें' : 'Click to select as stop'}
            </p>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="bg-stone-950 px-4 py-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{language === 'mr' ? 'सुरुवात थांबा' : language === 'hi' ? 'शुरुआती स्टॉप' : 'Origin'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span>{language === 'mr' ? 'गंतव्य' : language === 'hi' ? 'मंज़िल' : 'Destination'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>{language === 'mr' ? 'बस बदला' : language === 'hi' ? 'बस बदलें' : 'Transfer Hub'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300 inline-block" />
            <span>{language === 'mr' ? 'प्रमुख स्थानक' : language === 'hi' ? 'प्रमुख हब' : 'Major Terminus'}</span>
          </span>
        </div>

        <div className="text-stone-400 italic">
          {language === 'mr' ? 'लाइव्ह बस स्थान: प्रवाशांच्या नोंदींवरून' : language === 'hi' ? 'लाइव बस स्थिति: यात्री रिपोर्ट आधारित' : 'Live Bus Pins: Crowd Verified'}
        </div>
      </div>
    </div>
  );
};
