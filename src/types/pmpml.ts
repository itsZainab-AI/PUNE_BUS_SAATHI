export type Language = 'mr' | 'hi' | 'en';

export interface PuneStop {
  id: string;
  name: string;
  name_mr: string;
  name_hi: string;
  lat: number;
  lng: number;
  zone: string;
  popularLandmark: string;
  isMajorHub: boolean;
  isWellLit?: boolean;
  isQuietAtNight?: boolean;
  nightSafetyNote?: string;
  nightSafetyNote_mr?: string;
  nightSafetyNote_hi?: string;
}

export interface RouteStopItem {
  stopId: string;
  distFromPrevKm: number;
  minutesFromPrev: number;
}

export interface PuneRoute {
  id: string;
  routeNumber: string;
  name: string;
  name_mr: string;
  name_hi: string;
  category: 'Ordinary' | 'Rainbow BRTS' | 'IT Express' | 'Airport AC Abhi' | 'Express Ring';
  color: string;
  frequencyMinutes: number;
  firstBus: string;
  lastBus: string;
  stops: RouteStopItem[];
}

export interface RouteSegment {
  route: PuneRoute;
  direction: 'forward' | 'reverse';
  fromStop: PuneStop;
  toStop: PuneStop;
  intermediateStops: PuneStop[];
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  nextBusMinutes: number;
  followingBusMinutes: number;
  delayMinutes: number;
  liveConfidence: 'high' | 'medium' | 'low';
  crowdReportSummary?: string;
  currentCrowdStop?: PuneStop;
}

export interface RouteOption {
  id: string;
  segments: RouteSegment[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalFare: number;
  transferCount: number;
  transferStop?: PuneStop;
  transferWalkMinutes?: number;
  isDirect: boolean;
  overallDelayMinutes: number;
  estimatedArrivalMinutes: number;
  tag?: string;
}

export type OccupancyLevel = 'seats_available' | 'standing' | 'packed';
export type TrafficCondition = 'fast' | 'slow' | 'heavy_jam';

export interface CrowdReport {
  id: string;
  routeNumber: string;
  stopId: string;
  direction: 'forward' | 'reverse';
  occupancy: OccupancyLevel;
  trafficStatus: TrafficCondition;
  timestamp: number; // Unix ms
  reporterHash: string;
}

export interface CrowdVerificationResult {
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0 - 100
  verifiedReportsCount: number;
  estimatedDelayMinutes: number;
  dominantOccupancy: OccupancyLevel;
  explanation: string;
  explanation_mr: string;
  explanation_hi: string;
  lastReportedMinutesAgo: number;
  currentStopId?: string;
}

export interface QueryParseResult {
  originStopId: string | null;
  destinationStopId: string | null;
  originName: string;
  destinationName: string;
  detectedLanguage: Language;
  intent: 'route_search' | 'bus_timings' | 'fare_query' | 'general';
  confidence: number;
  aiNotes?: string;
}

export interface GeminiExplanation {
  headline: string;
  simpleSteps: string[];
  localTip: string;
  spokenScript: string;
  language: Language;
}
