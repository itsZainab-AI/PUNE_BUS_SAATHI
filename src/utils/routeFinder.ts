import { PuneStop, PuneRoute, RouteOption, RouteSegment, RouteStopItem } from '../types/pmpml';
import rawStops from '../data/pune_stops.json';
import rawRoutes from '../data/pune_routes.json';
import { crowdManager } from './crowdReports';

export const PUNE_STOPS: PuneStop[] = rawStops as PuneStop[];
export const PUNE_ROUTES: PuneRoute[] = rawRoutes as PuneRoute[];

// PMPML Stage Fare Slabs (in INR)
export function calculatePMPMLFare(distanceKm: number, category: string = 'Ordinary'): number {
  let baseFare = 5;
  if (distanceKm <= 2) baseFare = 5;
  else if (distanceKm <= 4) baseFare = 10;
  else if (distanceKm <= 8) baseFare = 15;
  else if (distanceKm <= 12) baseFare = 20;
  else if (distanceKm <= 16) baseFare = 25;
  else if (distanceKm <= 20) baseFare = 30;
  else baseFare = 35;

  if (category === 'Airport AC Abhi') {
    return Math.max(50, baseFare * 2);
  }
  return baseFare;
}

// Time-of-day traffic congestion multiplier for Pune roads
export function getTimeOfDayTrafficDelay(): { multiplier: number; peakLabel: string; peakLabel_mr: string } {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  // Morning Peak: 8:30 AM to 11:30 AM
  if (hour >= 8.5 && hour <= 11.5) {
    return {
      multiplier: 1.4,
      peakLabel: 'Morning Rush Hour (University & Swargate congested)',
      peakLabel_mr: 'सकाळची गर्दी (विद्यापीठ व स्वारगेट चौकात संथ वाहतूक)'
    };
  }
  // Evening Peak: 5:30 PM to 8:45 PM
  if (hour >= 17.5 && hour <= 20.75) {
    return {
      multiplier: 1.5,
      peakLabel: 'Evening Peak (Karve Rd & Hinjewadi slow)',
      peakLabel_mr: 'संध्याकाळची गर्दी (कर्वे रस्ता व हिंजेवाडीकडे गर्दी)'
    };
  }
  // Off-peak
  return {
    multiplier: 1.0,
    peakLabel: 'Normal Traffic (Smooth Flow)',
    peakLabel_mr: 'नेहमीची वाहतूक (सुरळीत)'
  };
}

// Estimate next bus arrival minutes
export function getNextBusMinutes(route: PuneRoute): { next: number; following: number } {
  const now = new Date();
  const currentMinutes = now.getMinutes();
  const freq = route.frequencyMinutes || 12;

  // Derive pseudo-deterministic next bus based on frequency
  const rem = currentMinutes % freq;
  let next = freq - rem;
  if (next < 2) next += freq;
  const following = next + freq;

  return { next, following };
}

// Stop lookup helper
export function getStopById(stopId: string): PuneStop | undefined {
  return PUNE_STOPS.find(s => s.id === stopId);
}

// Helper to find segment details on a route
function extractSegment(
  route: PuneRoute,
  fromId: string,
  toId: string
): RouteSegment | null {
  const stopsList = route.stops;
  const fromIndex = stopsList.findIndex(s => s.stopId === fromId);
  const toIndex = stopsList.findIndex(s => s.stopId === toId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null;
  }

  const isForward = fromIndex < toIndex;
  const orderedStops: RouteStopItem[] = isForward
    ? stopsList.slice(fromIndex, toIndex + 1)
    : stopsList.slice(toIndex, fromIndex + 1).reverse();

  let distanceKm = 0;
  let durationMinutes = 0;

  for (let i = 1; i < orderedStops.length; i++) {
    distanceKm += orderedStops[i].distFromPrevKm;
    durationMinutes += orderedStops[i].minutesFromPrev;
  }

  // Round distance to 1 decimal place
  distanceKm = Math.round(distanceKm * 10) / 10;

  // Apply traffic delay
  const traffic = getTimeOfDayTrafficDelay();
  const crowd = crowdManager.verifyRouteStatus(route.routeNumber);
  const effectiveDelay = Math.max(crowd.estimatedDelayMinutes, Math.round(durationMinutes * (traffic.multiplier - 1)));

  durationMinutes = Math.round(durationMinutes * traffic.multiplier);

  const { next, following } = getNextBusMinutes(route);
  const fare = calculatePMPMLFare(distanceKm, route.category);

  const fromStop = getStopById(fromId)!;
  const toStop = getStopById(toId)!;
  const intermediateStops = orderedStops
    .slice(1, -1)
    .map(s => getStopById(s.stopId)!)
    .filter(Boolean);

  let currentCrowdStop: PuneStop | undefined = undefined;
  if (crowd.currentStopId) {
    currentCrowdStop = getStopById(crowd.currentStopId);
  }

  return {
    route,
    direction: isForward ? 'forward' : 'reverse',
    fromStop,
    toStop,
    intermediateStops,
    distanceKm,
    durationMinutes,
    fare,
    nextBusMinutes: next,
    followingBusMinutes: following,
    delayMinutes: effectiveDelay,
    liveConfidence: crowd.confidence,
    crowdReportSummary: crowd.explanation,
    currentCrowdStop
  };
}

/**
 * Find direct and transfer routes between origin and destination
 */
export function findRoutes(originStopId: string, destStopId: string): RouteOption[] {
  if (!originStopId || !destStopId || originStopId === destStopId) {
    return [];
  }

  const results: RouteOption[] = [];

  // 1. Direct Routes
  for (const route of PUNE_ROUTES) {
    const seg = extractSegment(route, originStopId, destStopId);
    if (seg) {
      results.push({
        id: `direct_${route.id}`,
        segments: [seg],
        totalDistanceKm: seg.distanceKm,
        totalDurationMinutes: seg.durationMinutes,
        totalFare: seg.fare,
        transferCount: 0,
        isDirect: true,
        overallDelayMinutes: seg.delayMinutes,
        estimatedArrivalMinutes: seg.nextBusMinutes + seg.durationMinutes + seg.delayMinutes,
        tag: 'Direct Bus (थेट बस)'
      });
    }
  }

  // 2. Transfer Routes (1 transfer via major hubs)
  // Identify candidate interchange hubs where routes intersect
  const interchangeHubs = PUNE_STOPS.filter(
    s => s.isMajorHub && s.id !== originStopId && s.id !== destStopId
  );

  for (const hub of interchangeHubs) {
    for (const route1 of PUNE_ROUTES) {
      const seg1 = extractSegment(route1, originStopId, hub.id);
      if (!seg1) continue;

      for (const route2 of PUNE_ROUTES) {
        if (route1.id === route2.id) continue;
        const seg2 = extractSegment(route2, hub.id, destStopId);
        if (!seg2) continue;

        const totalDist = Math.round((seg1.distanceKm + seg2.distanceKm) * 10) / 10;
        const walkTransferMin = 4; // realistic walk between platforms at Swargate/Shivajinagar/etc.
        const totalDuration = seg1.durationMinutes + seg2.durationMinutes + walkTransferMin + Math.min(8, seg2.nextBusMinutes);
        const totalFare = seg1.fare + seg2.fare;
        const totalDelay = Math.max(seg1.delayMinutes, seg2.delayMinutes);

        results.push({
          id: `transfer_${hub.id}_${route1.id}_${route2.id}`,
          segments: [seg1, seg2],
          totalDistanceKm: totalDist,
          totalDurationMinutes: totalDuration,
          totalFare,
          transferCount: 1,
          transferStop: hub,
          transferWalkMinutes: walkTransferMin,
          isDirect: false,
          overallDelayMinutes: totalDelay,
          estimatedArrivalMinutes: seg1.nextBusMinutes + totalDuration + totalDelay,
          tag: `Switch at ${hub.name}`
        });
      }
    }
  }

  // Sort results: direct routes first, then by totalDurationMinutes
  results.sort((a, b) => {
    if (a.isDirect && !b.isDirect) return -1;
    if (!a.isDirect && b.isDirect) return 1;
    return a.totalDurationMinutes - b.totalDurationMinutes;
  });

  // Deduplicate and return top 4 best options
  const seenPairs = new Set<string>();
  const filtered: RouteOption[] = [];

  for (const r of results) {
    const key = r.segments.map(s => s.route.routeNumber).join('->');
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      filtered.push(r);
    }
    if (filtered.length >= 4) break;
  }

  return filtered;
}

/**
 * Fuzzy search stops by name in English, Marathi, or Hindi
 */
export function searchStops(query: string): PuneStop[] {
  if (!query || query.trim().length === 0) return PUNE_STOPS.slice(0, 8);
  const q = query.trim().toLowerCase();

  return PUNE_STOPS.filter(s => {
    return (
      s.name.toLowerCase().includes(q) ||
      s.name_mr.includes(query) ||
      s.name_hi.includes(query) ||
      s.popularLandmark.toLowerCase().includes(q) ||
      s.zone.toLowerCase().includes(q)
    );
  });
}
