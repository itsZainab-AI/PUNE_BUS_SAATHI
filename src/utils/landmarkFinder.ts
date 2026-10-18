import rawLandmarks from '../data/landmarks.json';
import { PuneStop, Language } from '../types/pmpml';
import { getStopById } from './routeFinder';

export interface PuneLandmark {
  id: string;
  name: string;
  name_mr: string;
  name_hi: string;
  aliases: string[];
  nearestStopId: string;
  walkingMinutes: number;
  walkingTimeMinutes?: number;
  area: string;
}

export const PUNE_LANDMARKS: PuneLandmark[] = (rawLandmarks as any[]).map(lm => ({
  ...lm,
  walkingMinutes: lm.walkingMinutes || lm.walkingTimeMinutes || 3
}));

// Strip common noise prefixes/suffixes like "near", "opposite", "opp", "close to", "ला", "जवळ", "समोर", "के पास", "के सामने"
export function cleanLandmarkQuery(query: string): string {
  if (!query) return '';
  let q = query.toLowerCase().trim();

  // English prepositions and common words
  q = q.replace(/^(near|opposite|opp|close to|around|behind|in front of|at|beside|to|from)\s+/i, '');
  q = q.replace(/\s+(near|opposite|opp|close to|around|behind|in front of)$/i, '');

  // Marathi suffixes / words
  q = q.replace(/(जवळ|समोर|मागे|शेजारी|येथे|ला|कडे|वरून|हून|पासून)$/g, '').trim();

  // Hindi suffixes / words
  q = q.replace(/(के पास|के सामने|के पीछे|को|तक|से)$/g, '').trim();

  return q.trim();
}

// Simple Levenshtein distance for handling user typing mistakes
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Fast local landmark matching supporting aliases, fuzzy substrings and typo tolerance
 */
export function matchLandmarksLocally(rawQuery: string): PuneLandmark[] {
  if (!rawQuery || !rawQuery.trim()) return [];
  const query = cleanLandmarkQuery(rawQuery).toLowerCase();
  if (query.length < 2) return [];

  const exactMatches: PuneLandmark[] = [];
  const aliasMatches: PuneLandmark[] = [];
  const partialMatches: PuneLandmark[] = [];
  const typoMatches: PuneLandmark[] = [];

  for (const lm of PUNE_LANDMARKS) {
    const nameEn = lm.name.toLowerCase();
    const nameMr = lm.name_mr.toLowerCase();
    const nameHi = lm.name_hi.toLowerCase();

    // 1. Exact or direct inclusion of landmark name
    if (nameEn.includes(query) || nameMr.includes(query) || nameHi.includes(query) || query.includes(nameEn)) {
      exactMatches.push(lm);
      continue;
    }

    // 2. Check aliases
    let aliasFound = false;
    for (const alias of lm.aliases) {
      const a = alias.toLowerCase();
      if (query === a || query.includes(a) || a.includes(query)) {
        aliasMatches.push(lm);
        aliasFound = true;
        break;
      }
    }
    if (aliasFound) continue;

    // 3. Word token overlap (e.g. "fergusson", "phoenix", "dagdusheth", "shaniwar", "symbiosis")
    const queryTokens = query.split(/\s+/).filter(t => t.length > 2);
    for (const token of queryTokens) {
      if (nameEn.includes(token) || lm.aliases.some(a => a.toLowerCase().includes(token))) {
        partialMatches.push(lm);
        break;
      }
    }

    // 4. Typo tolerance (Levenshtein distance <= 2 for words >= 5 chars)
    if (query.length >= 5) {
      for (const token of queryTokens) {
        if (token.length >= 5) {
          const nameTokens = nameEn.split(/\s+/);
          for (const nt of nameTokens) {
            if (nt.length >= 5 && levenshteinDistance(token, nt) <= 2) {
              typoMatches.push(lm);
              break;
            }
          }
          if (typoMatches.includes(lm)) break;

          for (const alias of lm.aliases) {
            const aliasTokens = alias.toLowerCase().split(/\s+/);
            for (const at of aliasTokens) {
              if (at.length >= 5 && levenshteinDistance(token, at) <= 2) {
                typoMatches.push(lm);
                break;
              }
            }
            if (typoMatches.includes(lm)) break;
          }
        }
      }
    }
  }

  // Combine and deduplicate
  const combined = [...exactMatches, ...aliasMatches, ...partialMatches, ...typoMatches];
  const uniqueMap = new Map<string, PuneLandmark>();
  combined.forEach(item => {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Ask Gemini to guess the landmark or nearest stop when local matching finds nothing
 */
export async function guessLandmarkWithGemini(
  rawQuery: string,
  userLanguage: Language = 'mr'
): Promise<PuneLandmark[]> {
  try {
    const res = await fetch('/api/gemini/guess-landmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeQuery: rawQuery,
        userLanguage
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.matchedLandmarks && Array.isArray(data.matchedLandmarks) && data.matchedLandmarks.length > 0) {
        return data.matchedLandmarks.map((lm: any) => ({
          ...lm,
          walkingMinutes: lm.walkingMinutes || lm.walkingTimeMinutes || 4
        }));
      }
    }
  } catch (err) {
    console.warn('Gemini landmark guess failed:', err);
  }
  return [];
}

/**
 * Format friendly landmark result string:
 * "Nearest stop: Deccan Gymkhana, about 4 min walk"
 */
export function formatNearestStopInfo(landmark: PuneLandmark, lang: Language): {
  stopName: string;
  walkingMinutes: number;
  stop: PuneStop | undefined;
  infoText: string;
} {
  const stop = getStopById(landmark.nearestStopId);
  const stopName = stop ? (lang === 'mr' ? stop.name_mr : lang === 'hi' ? stop.name_hi : stop.name) : landmark.nearestStopId;
  const minutes = landmark.walkingMinutes || landmark.walkingTimeMinutes || 3;

  let infoText = '';
  if (lang === 'mr') {
    infoText = `जवळचा थांबा: ${stopName}, साधारण ${minutes} मिनिटे पायी चालणे.`;
  } else if (lang === 'hi') {
    infoText = `निकटतम स्टॉप: ${stopName}, लगभग ${minutes} मिनट पैदल दूरी।`;
  } else {
    infoText = `Nearest stop: ${stopName}, about ${minutes} min walk.`;
  }

  return {
    stopName,
    walkingMinutes: minutes,
    stop,
    infoText
  };
}
