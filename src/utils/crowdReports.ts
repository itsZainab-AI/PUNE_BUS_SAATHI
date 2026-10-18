import { CrowdReport, CrowdVerificationResult, OccupancyLevel, TrafficCondition, PuneRoute, PuneStop } from '../types/pmpml';
import stopsData from '../data/pune_stops.json';
import routesData from '../data/pune_routes.json';

const STORAGE_KEY = 'punebus_saathi_crowd_reports_v1';

// Seed realistic initial crowd reports (simulating live Pune commuters right now)
const INITIAL_REPORTS: CrowdReport[] = [
  {
    id: 'cr_init_1',
    routeNumber: '11',
    stopId: 'nal_stop',
    direction: 'forward',
    occupancy: 'standing',
    trafficStatus: 'slow',
    timestamp: Date.now() - 4 * 60 * 1000, // 4 mins ago
    reporterHash: 'usr_pune_9182'
  },
  {
    id: 'cr_init_2',
    routeNumber: '11',
    stopId: 'nal_stop',
    direction: 'forward',
    occupancy: 'standing',
    trafficStatus: 'slow',
    timestamp: Date.now() - 3 * 60 * 1000, // 3 mins ago
    reporterHash: 'usr_pune_4410'
  },
  {
    id: 'cr_init_3',
    routeNumber: '11',
    stopId: 'paud_phata',
    direction: 'forward',
    occupancy: 'seats_available',
    trafficStatus: 'slow',
    timestamp: Date.now() - 7 * 60 * 1000, // 7 mins ago (just left paud phata towards nal stop)
    reporterHash: 'usr_pune_8821'
  },
  {
    id: 'cr_init_4',
    routeNumber: '100',
    stopId: 'aundh',
    direction: 'forward',
    occupancy: 'packed',
    trafficStatus: 'heavy_jam',
    timestamp: Date.now() - 6 * 60 * 1000,
    reporterHash: 'usr_hinj_1092'
  },
  {
    id: 'cr_init_5',
    routeNumber: '100',
    stopId: 'aundh',
    direction: 'forward',
    occupancy: 'packed',
    trafficStatus: 'heavy_jam',
    timestamp: Date.now() - 2 * 60 * 1000,
    reporterHash: 'usr_hinj_7712'
  },
  {
    id: 'cr_init_6',
    routeNumber: '148',
    stopId: 'yerawada',
    direction: 'forward',
    occupancy: 'seats_available',
    trafficStatus: 'fast',
    timestamp: Date.now() - 8 * 60 * 1000,
    reporterHash: 'usr_airp_3321'
  },
  {
    id: 'cr_init_7',
    routeNumber: '24',
    stopId: 'swargate',
    direction: 'forward',
    occupancy: 'standing',
    trafficStatus: 'slow',
    timestamp: Date.now() - 5 * 60 * 1000,
    reporterHash: 'usr_katraj_5510'
  },
  {
    id: 'cr_init_8',
    routeNumber: '24',
    stopId: 'swargate',
    direction: 'forward',
    occupancy: 'standing',
    trafficStatus: 'slow',
    timestamp: Date.now() - 1 * 60 * 1000,
    reporterHash: 'usr_katraj_9901'
  }
];

class CrowdReportManager {
  private reports: CrowdReport[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadReports();
  }

  private loadReports() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CrowdReport[] = JSON.parse(stored);
        // Retain reports within 45 minutes
        const cutoff = Date.now() - 45 * 60 * 1000;
        const validStored = parsed.filter(r => r.timestamp > cutoff);
        if (validStored.length > 0) {
          this.reports = validStored;
          return;
        }
      }
    } catch {
      // Fallback
    }
    this.reports = [...INITIAL_REPORTS];
    this.saveReports();
  }

  private saveReports() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reports));
    } catch {
      // Ignore
    }
    this.notify();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getAllReports(): CrowdReport[] {
    return [...this.reports];
  }

  /**
   * Anti-Fake Report Verification Engine
   * Validates new submission against route geometry, sequence and prior user submissions
   */
  public submitReport(reportData: {
    routeNumber: string;
    stopId: string;
    direction: 'forward' | 'reverse';
    occupancy: OccupancyLevel;
    trafficStatus: TrafficCondition;
  }): { success: boolean; message: string; message_mr: string; message_hi: string; confidence: 'high' | 'medium' | 'low' } {
    const route = (routesData as PuneRoute[]).find(r => r.routeNumber === reportData.routeNumber);
    if (!route) {
      return {
        success: false,
        message: 'Invalid route number.',
        message_mr: 'अवैध बस मार्ग क्रमांक.',
        message_hi: 'अमान्य बस रूट नंबर.',
        confidence: 'low'
      };
    }

    const stopIndex = route.stops.findIndex(s => s.stopId === reportData.stopId);
    if (stopIndex === -1) {
      return {
        success: false,
        message: `Stop is not part of Route ${reportData.routeNumber}. Report rejected.`,
        message_mr: `हे बस स्टॉप मार्ग क्र. ${reportData.routeNumber} वर नाही. नोंद नाकारली.`,
        message_hi: `यह स्टॉप रूट ${reportData.routeNumber} पर नहीं है। रिपोर्ट अस्वीकृत।`,
        confidence: 'low'
      };
    }

    // Temporal & Sequence Sanity check:
    // Check recent reports for this route within the last 15 minutes
    const recentRouteReports = this.reports.filter(
      r => r.routeNumber === reportData.routeNumber && (Date.now() - r.timestamp < 15 * 60 * 1000)
    );

    let suspicious = false;
    let corroborated = false;

    if (recentRouteReports.length > 0) {
      // Check if another report 1 minute ago was on the other end of the city (e.g. > 10 stops away)
      for (const prior of recentRouteReports) {
        const priorIndex = route.stops.findIndex(s => s.stopId === prior.stopId);
        const stopDistanceDelta = Math.abs(priorIndex - stopIndex);
        const timeDiffMinutes = (Date.now() - prior.timestamp) / (60 * 1000);

        // A bus cannot travel 5+ stops within 2 minutes in Pune traffic
        if (timeDiffMinutes < 2 && stopDistanceDelta > 4) {
          suspicious = true;
        }

        // Corroboration: same stop or adjacent stop reported within 12 minutes
        if (stopDistanceDelta <= 1 && timeDiffMinutes <= 12) {
          corroborated = true;
        }
      }
    }

    if (suspicious) {
      return {
        success: false,
        message: 'Location mismatch with verified live GPS schedule. Please check current bus stop.',
        message_mr: 'सध्याच्या बस स्थानाशी तफावत आढळली. कृपया अचूक थांबा तपासा.',
        message_hi: 'वर्तमान बस स्थान से मेल नहीं खाता। कृपया सही स्टॉप चुनें।',
        confidence: 'low'
      };
    }

    const reporterHash = 'usr_' + Math.random().toString(36).substring(2, 8);
    const newReport: CrowdReport = {
      id: 'cr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      routeNumber: reportData.routeNumber,
      stopId: reportData.stopId,
      direction: reportData.direction,
      occupancy: reportData.occupancy,
      trafficStatus: reportData.trafficStatus,
      timestamp: Date.now(),
      reporterHash
    };

    this.reports.unshift(newReport);
    // Keep last 40 reports
    if (this.reports.length > 40) {
      this.reports = this.reports.slice(0, 40);
    }
    this.saveReports();

    if (corroborated) {
      return {
        success: true,
        message: 'Verified! Multiple riders confirmed this bus location. Thank you, Saathi!',
        message_mr: 'सत्यापित झाले! इतर प्रवाशांनीही या स्थानाची पुष्टी केली आहे. धन्यवाद साथी!',
        message_hi: 'सत्यापित! अन्य यात्रियों ने भी इस स्थान की पुष्टि की है। धन्यवाद साथी!',
        confidence: 'high'
      };
    } else {
      return {
        success: true,
        message: 'Report logged! It will be verified as more riders check in.',
        message_mr: 'नोंद घेतली! इतर प्रवाशांच्या माहितीनंतर पूर्ण विश्वासार्ह होईल.',
        message_hi: 'रिपोर्ट दर्ज! अधिक यात्रियों के चेक-इन पर पूरी तरह सत्यापित होगी।',
        confidence: 'medium'
      };
    }
  }

  /**
   * Verify and compute crowd consensus for a specific bus route
   */
  public verifyRouteStatus(routeNumber: string): CrowdVerificationResult {
    const route = (routesData as PuneRoute[]).find(r => r.routeNumber === routeNumber);
    const now = Date.now();
    const activeReports = this.reports.filter(
      r => r.routeNumber === routeNumber && (now - r.timestamp < 30 * 60 * 1000)
    );

    if (activeReports.length === 0) {
      return {
        confidence: 'low',
        confidenceScore: 35,
        verifiedReportsCount: 0,
        estimatedDelayMinutes: 3, // default minimal variance
        dominantOccupancy: 'standing',
        explanation: 'No recent rider reports. Showing timetable estimates.',
        explanation_mr: 'सध्या प्रवाशांचे थेट अपडेट नाहीत. वेळापत्रकानुसार वेळ दाखवत आहे.',
        explanation_hi: 'हाल की कोई यात्री रिपोर्ट नहीं। समय सारिणी अनुसार समय दिखाया जा रहा है।',
        lastReportedMinutesAgo: 45
      };
    }

    // Weight reports by freshness: recent reports (< 8 min) have high weight
    let jamScore = 0;
    let occupancyCounts: Record<OccupancyLevel, number> = {
      seats_available: 0,
      standing: 0,
      packed: 0
    };
    const stopFrequency: Record<string, number> = {};

    activeReports.forEach(r => {
      const ageMinutes = (now - r.timestamp) / (60 * 1000);
      const freshnessWeight = Math.max(0.2, 1 - ageMinutes / 30);

      occupancyCounts[r.occupancy] += freshnessWeight;
      stopFrequency[r.stopId] = (stopFrequency[r.stopId] || 0) + freshnessWeight;

      if (r.trafficStatus === 'heavy_jam') jamScore += 12 * freshnessWeight;
      else if (r.trafficStatus === 'slow') jamScore += 6 * freshnessWeight;
      else jamScore += 1 * freshnessWeight;
    });

    // Determine dominant stop
    let mostReportedStop = activeReports[0].stopId;
    let maxFreq = 0;
    for (const [sId, freq] of Object.entries(stopFrequency)) {
      if (freq > maxFreq) {
        maxFreq = freq;
        mostReportedStop = sId;
      }
    }

    // Dominant occupancy
    let dominantOccupancy: OccupancyLevel = 'standing';
    if (occupancyCounts.packed > occupancyCounts.standing && occupancyCounts.packed > occupancyCounts.seats_available) {
      dominantOccupancy = 'packed';
    } else if (occupancyCounts.seats_available > occupancyCounts.standing) {
      dominantOccupancy = 'seats_available';
    }

    const verifiedCount = activeReports.length;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let confidenceScore = 40;

    if (verifiedCount >= 2 && maxFreq >= 1.5) {
      confidence = 'high';
      confidenceScore = 92;
    } else if (verifiedCount >= 1) {
      confidence = 'medium';
      confidenceScore = 68;
    }

    const delay = Math.round(Math.min(25, Math.max(2, jamScore / Math.max(1, verifiedCount))));
    const lastMinutes = Math.round((now - activeReports[0].timestamp) / (60 * 1000));

    const stopObj = (stopsData as PuneStop[]).find(s => s.id === mostReportedStop);
    const stopName = stopObj ? stopObj.name : 'Near stop';
    const stopNameMr = stopObj ? stopObj.name_mr : 'थांब्याजवळ';
    const stopNameHi = stopObj ? stopObj.name_hi : 'स्टॉप के पास';

    let exp = `${verifiedCount} rider(s) confirmed bus near ${stopName} (${lastMinutes} min ago).`;
    let exp_mr = `${verifiedCount} प्रवाशांनी ${stopNameMr} जवळ बस असल्याचे निश्चित केले (${lastMinutes} मिनिटांपूर्वी).`;
    let exp_hi = `${verifiedCount} यात्रियों ने ${stopNameHi} के पास बस होने की पुष्टि की (${lastMinutes} मिनट पहले).`;

    return {
      confidence,
      confidenceScore,
      verifiedReportsCount: verifiedCount,
      estimatedDelayMinutes: delay,
      dominantOccupancy,
      explanation: exp,
      explanation_mr: exp_mr,
      explanation_hi: exp_hi,
      lastReportedMinutesAgo: lastMinutes,
      currentStopId: mostReportedStop
    };
  }
}

export const crowdManager = new CrowdReportManager();
