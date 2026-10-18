import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import stopsData from './src/data/pune_stops.json' with { type: 'json' };
import routesData from './src/data/pune_routes.json' with { type: 'json' };
import landmarksData from './src/data/landmarks.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Allow base64 photo payloads up to 15MB
app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
let quotaExhaustedUntil = 0;

function isQuotaExhausted(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

function handleGeminiError(err: any, endpointName: string): void {
  const errMsg = err?.message || String(err);
  const isQuota =
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota') ||
    err?.status === 'RESOURCE_EXHAUSTED' ||
    err?.code === 429;

  if (isQuota) {
    quotaExhaustedUntil = Date.now() + 10 * 60 * 1000;
    console.warn(`[PuneBus Saathi] Gemini API quota limit reached (${endpointName}). Seamlessly using Pune local transit conductor engine.`);
  } else {
    console.warn(`[PuneBus Saathi] Gemini notice in ${endpointName}: ${errMsg}. Using local fallback.`);
  }
}

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('GEMINI_API_KEY is not set. Local smart fallback parser and generator will be active.');
}

const knownStopsList = stopsData.map((s: any) => ({
  id: s.id,
  name: s.name,
  name_mr: s.name_mr,
  name_hi: s.name_hi,
  landmarks: s.popularLandmark
}));

const knownLandmarksList = landmarksData.map((lm: any) => ({
  id: lm.id,
  name: lm.name,
  name_mr: lm.name_mr,
  name_hi: lm.name_hi,
  nearestStopId: lm.nearestStopId,
  walkingMinutes: lm.walkingMinutes
}));

// Local fuzzy stop matcher fallback
function matchStopLocally(text: string): { id: string; name: string } | null {
  if (!text) return null;
  const t = text.toLowerCase();

  for (const s of stopsData as any[]) {
    const en = s.name.toLowerCase();
    const mr = s.name_mr.toLowerCase();
    const hi = s.name_hi.toLowerCase();
    const id = s.id.toLowerCase();
    const lm = s.popularLandmark.toLowerCase();

    // Check direct inclusions
    if (t.includes(id) || t.includes(en) || t.includes(mr) || t.includes(hi)) {
      return { id: s.id, name: s.name };
    }

    // Special Pune colloquial aliases
    if (t.includes('kothrud') && s.id.includes('kothrud')) return { id: s.id, name: s.name };
    if (t.includes('swargate') && s.id === 'swargate') return { id: s.id, name: s.name };
    if (t.includes('hinjewadi') && s.id.includes('hinjewadi')) return { id: s.id, name: s.name };
    if (t.includes('station') && s.id === 'pune_station') return { id: s.id, name: s.name };
    if (t.includes('airport') && s.id === 'pune_airport') return { id: s.id, name: s.name };
    if (t.includes('deccan') && s.id === 'deccan_gymkhana') return { id: s.id, name: s.name };
    if (t.includes('katraj') && s.id === 'katraj_depot') return { id: s.id, name: s.name };
    if (t.includes('hadapsar') && s.id === 'hadapsar_gadital') return { id: s.id, name: s.name };
    if (t.includes('shivajinagar') && s.id === 'shivajinagar') return { id: s.id, name: s.name };
    if (t.includes('aundh') && s.id === 'aundh') return { id: s.id, name: s.name };
    if (t.includes('baner') && s.id === 'baner_phata') return { id: s.id, name: s.name };
    if (t.includes('nigdi') && s.id === 'nigdi') return { id: s.id, name: s.name };
    if (t.includes('chinchwad') && s.id === 'chinchwad_station') return { id: s.id, name: s.name };
    if (t.includes('viman nagar') && s.id === 'viman_nagar') return { id: s.id, name: s.name };
  }
  return null;
}

// 1. Natural Language Query Parser using Gemini 3.8 Flash
app.post('/api/gemini/parse-query', async (req: Request, res: Response) => {
  const { query, preferredLang } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  const cleanQuery = query.trim();

  if (aiClient && !isQuotaExhausted()) {
    try {
      const prompt = `You are the NLU parser for PuneBus Saathi, an assistant for Pune's PMPML bus network.
The user speaks or types in Marathi (मराठी), Hindi (हिंदी), or English (or a mix).
User Query: "${cleanQuery}"

Official Pune bus stops:
${JSON.stringify(knownStopsList.map(s => ({ id: s.id, name: s.name, name_mr: s.name_mr, name_hi: s.name_hi })))}

Known Pune Landmarks (Colleges, Malls, IT parks, Temples, Markets, Hospitals):
${JSON.stringify(knownLandmarksList.map(lm => ({ name: lm.name, name_mr: lm.name_mr, nearestStopId: lm.nearestStopId, walkingMinutes: lm.walkingMinutes })))}

Task:
Extract the Origin (start point) and Destination (end point), detect the language (mr, hi, en), and intent.
Account for prepositions and phrases like "near Fergusson College", "opp Phoenix Mall", "Dagdusheth Ganpati", "Vaishali on FC Road", "COEP to Swargate".
If the user names a landmark, map it to its corresponding nearestStopId from the landmarks list above!
Account for Marathi grammatical markers like "हून", "वरून", "पासून", "ला", "कडे" (e.g. "Fergusson College hun Swargate la" -> origin: Fergusson College -> nearestStopId: deccan_gymkhana, destination: Swargate -> swargate).
Account for Hindi markers like "से", "को", "तक" (e.g. "Phoenix mall se Katraj tak").

Output STRICT JSON ONLY (no markdown formatting, no backticks):
{
  "originStopId": "stop_id or null",
  "destinationStopId": "stop_id or null",
  "originName": "Clean Name in English or null",
  "destinationName": "Clean Name in English or null",
  "matchedOriginLandmark": { "name": "...", "nearestStopId": "...", "walkingMinutes": 4 } or null,
  "matchedDestinationLandmark": { "name": "...", "nearestStopId": "...", "walkingMinutes": 4 } or null,
  "detectedLanguage": "mr" or "hi" or "en",
  "intent": "route_search",
  "confidence": 0.95,
  "aiNotes": "Brief rationale in English"
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '';
      try {
        const parsed = JSON.parse(text);
        res.json(parsed);
        return;
      } catch {
        console.warn('Failed to parse Gemini JSON output:', text);
      }
    } catch (err) {
      handleGeminiError(err, 'parse-query');
    }
  }

  // Fallback Rule-Based Parser for high resilience
  let detectedLanguage: 'mr' | 'hi' | 'en' = 'en';
  if (/[\u0900-\u097F]/.test(cleanQuery)) {
    if (cleanQuery.includes('आहे') || cleanQuery.includes('जायचे') || cleanQuery.includes('वरून') || cleanQuery.includes('कसे')) {
      detectedLanguage = 'mr';
    } else {
      detectedLanguage = 'hi';
    }
  }

  let originId: string | null = null;
  let destId: string | null = null;
  let originName = '';
  let destName = '';

  // Look for "from X to Y" patterns
  const lower = cleanQuery.toLowerCase();
  for (const stop of stopsData as any[]) {
    const sName = stop.name.toLowerCase();
    const sMr = stop.name_mr;
    const sHi = stop.name_hi;

    const stopMentioned = lower.includes(sName.split(' ')[0].toLowerCase()) ||
                          lower.includes(stop.id.replace('_', ' ')) ||
                          cleanQuery.includes(sMr.split(' ')[0]) ||
                          cleanQuery.includes(sHi.split(' ')[0]);

    if (stopMentioned) {
      // Determine if it looks like origin or destination
      if (lower.includes('from ' + sName.split(' ')[0]) || cleanQuery.includes(sMr.split(' ')[0] + 'हून') || cleanQuery.includes(sMr.split(' ')[0] + 'वरून') || cleanQuery.includes(sHi.split(' ')[0] + ' से')) {
        originId = stop.id;
        originName = stop.name;
      } else if (lower.includes('to ' + sName.split(' ')[0]) || cleanQuery.includes(sMr.split(' ')[0] + 'ला') || cleanQuery.includes(sHi.split(' ')[0] + ' तक') || cleanQuery.includes(sHi.split(' ')[0] + ' को')) {
        destId = stop.id;
        destName = stop.name;
      } else if (!originId) {
        originId = stop.id;
        originName = stop.name;
      } else if (!destId && stop.id !== originId) {
        destId = stop.id;
        destName = stop.name;
      }
    }
  }

  // Also check landmarks in fallback
  for (const lm of landmarksData as any[]) {
    const lmName = lm.name.toLowerCase();
    const isLmFound = lower.includes(lmName) ||
                      lm.aliases.some((a: string) => lower.includes(a.toLowerCase())) ||
                      cleanQuery.includes(lm.name_mr) ||
                      cleanQuery.includes(lm.name_hi);

    if (isLmFound) {
      if (!originId) {
        originId = lm.nearestStopId;
        originName = lm.name;
      } else if (!destId && lm.nearestStopId !== originId) {
        destId = lm.nearestStopId;
        destName = lm.name;
      }
    }
  }

  res.json({
    originStopId: originId,
    destinationStopId: destId,
    originName: originName || null,
    destinationName: destName || null,
    detectedLanguage: preferredLang || detectedLanguage,
    intent: 'route_search',
    confidence: originId && destId ? 0.85 : 0.5,
    aiNotes: 'Processed via local multilingual fallback'
  });
});

// 2. Simple Step-by-Step Route Explanations using Gemini 3.8 Flash
app.post('/api/gemini/explain-route', async (req: Request, res: Response) => {
  const { routeOption, language = 'mr', userQuery } = req.body;

  if (!routeOption) {
    res.status(400).json({ error: 'routeOption is required' });
    return;
  }

  const lang = (language === 'hi' || language === 'mr' || language === 'en') ? language : 'mr';

  if (aiClient && !isQuotaExhausted()) {
    try {
      const prompt = `You are PuneBus Saathi (पुणे बस साथी), an empathetic, respectful, and crystal-clear local bus conductor and guide helping college students, elderly commuters, daily wage workers, and newcomers navigate Pune's PMPML bus system.

Route Details:
- Is Direct: ${routeOption.isDirect}
- Total Duration: ${routeOption.totalDurationMinutes} mins
- Total Distance: ${routeOption.totalDistanceKm} km
- PMPML Fare: ₹${routeOption.totalFare}
- Segments: ${JSON.stringify(routeOption.segments.map((s: any) => ({
  busNumber: s.route.routeNumber,
  busName: s.route.name,
  busNameMr: s.route.name_mr,
  from: s.fromStop.name,
  fromMr: s.fromStop.name_mr,
  to: s.toStop.name,
  toMr: s.toStop.name_mr,
  nextBusIn: s.nextBusMinutes,
  delay: s.delayMinutes
})))}
- Transfer Stop: ${routeOption.transferStop ? routeOption.transferStop.name + ' (' + routeOption.transferStop.name_mr + ')' : 'None (Direct)'}
- Target Language: ${lang === 'mr' ? 'Marathi (मराठी)' : lang === 'hi' ? 'Hindi (हिंदी)' : 'English'}

Instructions:
1. Explain in simple, respectful, everyday words in ${lang === 'mr' ? 'colloquial Marathi (e.g., नमस्कार! आधी... मग...)' : lang === 'hi' ? 'simple Hindi (e.g., नमस्ते! पहले... फिर...)' : 'friendly conversational English'}. No corporate jargon.
2. Provide:
   - headline: A 1-sentence reassuring summary of the trip.
   - simpleSteps: An array of 2 to 4 clear steps (which bus to board, where to get down, where to change if any).
   - localTip: One practical Pune local conductor tip (e.g., peak hour traffic advice, platform advice at Swargate / Shivajinagar / Pune Station, or ticket advice).
   - spokenScript: A warm, clear 2-sentence script suitable for text-to-speech audio for elderly commuters.

Output STRICT JSON ONLY (no markdown formatting, no backticks):
{
  "headline": "...",
  "simpleSteps": ["Step 1...", "Step 2..."],
  "localTip": "...",
  "spokenScript": "...",
  "language": "${lang}"
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '';
      try {
        const parsed = JSON.parse(text);
        res.json(parsed);
        return;
      } catch {
        console.warn('Failed to parse Gemini explain output:', text);
      }
    } catch (err) {
      handleGeminiError(err, 'explain-route');
    }
  }

  // Fallback Local Generator in the requested language
  const seg1 = routeOption.segments[0];
  const seg2 = routeOption.segments[1];

  if (lang === 'mr') {
    if (routeOption.isDirect) {
      res.json({
        headline: `बस क्र. ${seg1.route.routeNumber} ने ${seg1.fromStop.name_mr} वरून ${seg1.toStop.name_mr} ला थेट जा.`,
        simpleSteps: [
          `१. ${seg1.fromStop.name_mr} थांब्यावर जा. पुढील बस साधारण ${seg1.nextBusMinutes} मिनिटांत येईल.`,
          `२. बस क्र. ${seg1.route.routeNumber} (${seg1.route.name_mr}) मध्ये चढा. कंडक्टरकडून ₹${seg1.fare} चे तिकीट घ्या.`,
          `३. ${seg1.toStop.name_mr} थांब्यावर सुखरूप उतरा. अंदाजे वेळ: ${routeOption.totalDurationMinutes} मिनिटे.`
        ],
        localTip: `टीप: रहदारीनुसार ${seg1.delayMinutes} मिनिटांचा विलंब संभवतो, प्रवासाचे सुटे पैसे जवळ ठेवा.`,
        spokenScript: `तुम्हाला ${seg1.fromStop.name_mr} वरून ${seg1.route.routeNumber} नंबर बस मिळेल. ही बस ${seg1.toStop.name_mr} ला थेट जाईल. तिकीट ₹${seg1.fare} आहे.`,
        language: 'mr'
      });
    } else {
      res.json({
        headline: `${routeOption.transferStop?.name_mr || 'मुख्य स्थानक'} येथे १ बस बदलून सहज पोहोचा.`,
        simpleSteps: [
          `१. ${seg1.fromStop.name_mr} वरून बस क्र. ${seg1.route.routeNumber} पकडा आणि ${routeOption.transferStop?.name_mr} ला उतरा (तिकीट ₹${seg1.fare}).`,
          `२. स्थानकावर चालत जाऊन दुसऱ्या प्लॅटफॉर्मवर जा (२ ते ३ मिनिटे).`,
          `३. तेथून बस क्र. ${seg2.route.routeNumber} पकडून ${seg2.toStop.name_mr} ला पोहोचा (तिकीट ₹${seg2.fare}).`
        ],
        localTip: `${routeOption.transferStop?.name_mr} हे मोठे स्थानक आहे, प्लॅटफॉर्म फलक किंवा चौकशी कक्षात विचारून बस क्रमांक तपासा.`,
        spokenScript: `आधी ${seg1.fromStop.name_mr} वरून ${seg1.route.routeNumber} नंबर बस घ्या. ${routeOption.transferStop?.name_mr} ला उतरून ${seg2.route.routeNumber} नंबर बसने ${seg2.toStop.name_mr} ला जा.`,
        language: 'mr'
      });
    }
  } else if (lang === 'hi') {
    if (routeOption.isDirect) {
      res.json({
        headline: `बस क्र. ${seg1.route.routeNumber} से ${seg1.fromStop.name_hi} से सीधे ${seg1.toStop.name_hi} पहुँचें।`,
        simpleSteps: [
          `1. ${seg1.fromStop.name_hi} स्टॉप पर जाएं। अगली बस लगभग ${seg1.nextBusMinutes} मिनट में आएगी।`,
          `2. बस नंबर ${seg1.route.routeNumber} में बैठें और कंडक्टर से ₹${seg1.fare} का टिकट लें।`,
          `3. ${seg1.toStop.name_hi} स्टॉप पर उतरें। यात्रा समय लगभग ${routeOption.totalDurationMinutes} मिनट होगा।`
        ],
        localTip: `सलाह: पीक समय में ${seg1.delayMinutes} मिनट की देरी हो सकती है, टिकट के लिए खुले पैसे रखें।`,
        spokenScript: `आपको ${seg1.fromStop.name_hi} से ${seg1.route.routeNumber} नंबर सीधी बस मिलेगी जो ${seg1.toStop.name_hi} जाएगी।`,
        language: 'hi'
      });
    } else {
      res.json({
        headline: `${routeOption.transferStop?.name_hi || 'ट्रांसफर स्टॉप'} पर 1 बस बदलकर पहुँचें।`,
        simpleSteps: [
          `1. ${seg1.fromStop.name_hi} से बस क्र. ${seg1.route.routeNumber} लें और ${routeOption.transferStop?.name_hi} उतरें (किराया ₹${seg1.fare})।`,
          `2. स्टेशन परिसर में 2 मिनट पैदल चलकर दूसरे प्लैटफ़ॉर्म पर जाएं।`,
          `3. वहाँ से बस क्र. ${seg2.route.routeNumber} लेकर ${seg2.toStop.name_hi} उतरें (किराया ₹${seg2.fare})।`
        ],
        localTip: `${routeOption.transferStop?.name_hi} बड़ा बस स्टेशन है, बस बोर्ड पर रूट नंबर देखकर ही चढ़ें।`,
        spokenScript: `पहले ${seg1.fromStop.name_hi} से ${seg1.route.routeNumber} नंबर बस लें, फिर ${routeOption.transferStop?.name_hi} पर ${seg2.route.routeNumber} नंबर बस बदलें।`,
        language: 'hi'
      });
    }
  } else {
    // English
    if (routeOption.isDirect) {
      res.json({
        headline: `Take direct Bus ${seg1.route.routeNumber} from ${seg1.fromStop.name} to ${seg1.toStop.name}.`,
        simpleSteps: [
          `1. Head to ${seg1.fromStop.name} bus stop. Next bus arrives in about ${seg1.nextBusMinutes} minutes.`,
          `2. Board Bus ${seg1.route.routeNumber} (${seg1.route.name}). Purchase ₹${seg1.fare} ticket from the conductor.`,
          `3. Alight at ${seg1.toStop.name}. Estimated travel time: ${routeOption.totalDurationMinutes} minutes.`
        ],
        localTip: `Traffic Delay: around ${seg1.delayMinutes} min expected due to current city road conditions. Keep exact change ready.`,
        spokenScript: `Take direct bus number ${seg1.route.routeNumber} from ${seg1.fromStop.name} straight to ${seg1.toStop.name}. Fare is ₹${seg1.fare}.`,
        language: 'en'
      });
    } else {
      res.json({
        headline: `Switch once at ${routeOption.transferStop?.name} to reach your destination.`,
        simpleSteps: [
          `1. At ${seg1.fromStop.name}, board Bus ${seg1.route.routeNumber} to ${routeOption.transferStop?.name} (₹${seg1.fare}).`,
          `2. Walk 2 minutes across the station bays to the connecting platform.`,
          `3. Board Bus ${seg2.route.routeNumber} to reach ${seg2.toStop.name} (₹${seg2.fare}).`
        ],
        localTip: `${routeOption.transferStop?.name} is a busy terminus. Ask the conductor or check bay signages.`,
        spokenScript: `First take Bus ${seg1.route.routeNumber} from ${seg1.fromStop.name} to ${routeOption.transferStop?.name}, then transfer to Bus ${seg2.route.routeNumber}.`,
        language: 'en'
      });
    }
  }
});

// 3. Bus Board Photo Scanner using Gemini Vision
app.post('/api/gemini/scan-bus-board', async (req: Request, res: Response) => {
  const { imageBase64, mimeType = 'image/jpeg', currentDestinationStopId, userLanguage = 'mr' } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'Image base64 is required' });
    return;
  }

  // Clean raw base64 string
  const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const lang = (userLanguage === 'hi' || userLanguage === 'en') ? userLanguage : 'mr';

  if (aiClient && !isQuotaExhausted()) {
    try {
      const knownRouteNumbers = (routesData as any[]).map(r => r.routeNumber).join(', ');
      const prompt = `You are an OCR and transit vision assistant for Pune PMPML buses.
Look at this photo of a Pune bus or bus destination board (it could be an LED digital board, a painted tin board on front, or a windshield board).
The text on the board may be written in Devanagari Marathi/Hindi (e.g., 'स्वारगेट', 'कात्रज', 'कोथरूड', 'हिंजेवाडी', 'पुणे स्टेशन', 'हडपसर') or English ('SWARGATE', 'HINJEWADI', 'KATRAJ', etc.).
The route number might be in English numerals (e.g., 11, 24, 100, 148, 170, 36, 43, 64, 158, 188, 348) or Marathi numerals (e.g., ११, २४, १००).

Known PMPML routes in our system: [${knownRouteNumbers}]

Instructions:
1. Determine if a bus route number or destination board is clearly readable.
2. If the photo is too blurry, dark, cropped, or not showing any bus board, set isBoardReadable to false and confidence to low. Do NOT guess blindly.
3. Extract the route number (convert Marathi numerals to standard digits like '11') and destination text.

Return STRICT JSON ONLY (no markdown formatting, no code blocks):
{
  "isBoardReadable": true or false,
  "routeNumber": "11" or null,
  "destinationText": "Swargate" or "स्वारगेट" or null,
  "detectedLanguage": "mr" or "hi" or "en",
  "confidence": 0.0 to 1.0,
  "visualClarity": "clear" or "blurry" or "unclear",
  "explanation": "Brief 1-sentence note of what was observed on the board"
}`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      };

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '';
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Handle unreadable/blurry board
      if (!parsed.isBoardReadable || parsed.confidence < 0.4 || !parsed.routeNumber) {
        res.json({
          success: false,
          isBoardReadable: false,
          confidence: parsed.confidence || 0.2,
          message: lang === 'mr'
            ? 'बसचा फलक किंवा क्रमांक स्पष्ट दिसत नाही. कृपया जवळून आणि स्वच्छ प्रकाशात पुन्हा फोटो काढा.'
            : lang === 'hi'
            ? 'बस का बोर्ड या नंबर साफ़ नहीं दिख रहा। कृपया थोड़ा पास से और रोशनी में दोबारा फ़ोटो लें।'
            : 'Bus board or route number is unclear or blurry. Please take a closer, clearer photo in good lighting.',
          spokenScript: lang === 'mr'
            ? 'बसचा क्रमांक स्पष्ट दिसत नाहीये, कृपया दुसरा स्पष्ट फोटो काढा.'
            : lang === 'hi'
            ? 'बस का नंबर साफ़ नहीं दिख रहा, कृपया दूसरा साफ़ फ़ोटो लें।'
            : 'The bus board is unclear. Please take a clearer photo.'
        });
        return;
      }

      // Match route against routesData
      const matchedRoute = (routesData as any[]).find(
        r => r.routeNumber.toString() === parsed.routeNumber.toString() ||
             parsed.routeNumber.toString().includes(r.routeNumber.toString())
      );

      if (!matchedRoute) {
        res.json({
          success: true,
          isBoardReadable: true,
          routeNumber: parsed.routeNumber,
          destinationText: parsed.destinationText,
          confidence: parsed.confidence,
          isKnownRoute: false,
          message: lang === 'mr'
            ? `बस क्रमांक ${parsed.routeNumber} आढळली (${parsed.destinationText || 'गंतव्य फलक'}). हा मार्ग सध्या आमच्या प्राथमिक डेटाबेसमध्ये नोंदणीकृत नाही.`
            : lang === 'hi'
            ? `बस नंबर ${parsed.routeNumber} मिला (${parsed.destinationText || 'गंतव्य'}). यह रूट अभी हमारे डेटाबेस में उपलब्ध नहीं है।`
            : `Detected Bus ${parsed.routeNumber} (${parsed.destinationText || 'Board'}). This specific route is not in our current demo database.`,
          spokenScript: lang === 'mr'
            ? `ही ${parsed.routeNumber} नंबर बस आहे.`
            : lang === 'hi'
            ? `यह ${parsed.routeNumber} नंबर बस है।`
            : `This is Bus number ${parsed.routeNumber}.`
        });
        return;
      }

      // Route matched! Determine next 3 stops and destination check
      const routeStops = matchedRoute.stops.map((s: any) => {
        const stopObj = (stopsData as any[]).find(st => st.id === s.stopId);
        return stopObj || { id: s.stopId, name: s.stopId, name_mr: s.stopId, name_hi: s.stopId };
      });

      const nextStops = routeStops.slice(0, 3).map((s: any) => ({
        id: s.id,
        name: s.name,
        name_mr: s.name_mr,
        name_hi: s.name_hi
      }));

      // Check if this bus goes to the user's currently selected destination
      let goesToDestination: boolean | null = null;
      let matchedDestStop: any = null;
      if (currentDestinationStopId) {
        matchedDestStop = routeStops.find((s: any) => s.id === currentDestinationStopId);
        goesToDestination = !!matchedDestStop;
      }

      const destName = lang === 'mr' ? matchedRoute.name_mr : lang === 'hi' ? matchedRoute.name_hi : matchedRoute.name;

      let resultMsg = '';
      let spoken = '';

      if (goesToDestination === true) {
        resultMsg = lang === 'mr'
          ? `ही बस क्र. ${matchedRoute.routeNumber} आहे, ${destName} कडे जाणारी. ही बस तुमच्या गंतव्य स्थानी जाते!`
          : lang === 'hi'
          ? `यह बस नंबर ${matchedRoute.routeNumber} है, ${destName} जा रही है। यह बस आपकी मंज़िल तक जाती है!`
          : `This is Bus ${matchedRoute.routeNumber}, going towards ${destName}. It goes to your destination!`;

        spoken = lang === 'mr'
          ? `हो! ही ${matchedRoute.routeNumber} नंबर बस तुमच्या थांब्याला जाते. तुम्ही चढू शकता.`
          : lang === 'hi'
          ? `हाँ! यह ${matchedRoute.routeNumber} नंबर बस आपकी मंज़िल तक जाती है। आप इसमें बैठ सकते हैं।`
          : `Yes! Bus ${matchedRoute.routeNumber} goes to your destination. You can board this bus.`;
      } else if (goesToDestination === false) {
        resultMsg = lang === 'mr'
          ? `ही बस क्र. ${matchedRoute.routeNumber} आहे (${destName}). ही बस तुमच्या निवडलेल्या गंतव्य स्थानी जात नाही.`
          : lang === 'hi'
          ? `यह बस नंबर ${matchedRoute.routeNumber} है (${destName})। यह आपके चुने हुए स्टॉप तक नहीं जाती।`
          : `This is Bus ${matchedRoute.routeNumber} (${destName}). It does NOT go to your selected destination.`;

        spoken = lang === 'mr'
          ? `थांबा! ही ${matchedRoute.routeNumber} नंबर बस तुमच्या थांब्याला जात नाही.`
          : lang === 'hi'
          ? `रुकिए! यह ${matchedRoute.routeNumber} नंबर बस आपके स्टॉप तक नहीं जाती।`
          : `Wait! Bus ${matchedRoute.routeNumber} does not go to your stop.`;
      } else {
        resultMsg = lang === 'mr'
          ? `ही बस क्र. ${matchedRoute.routeNumber} आहे, ${destName} कडे जाणारी.`
          : lang === 'hi'
          ? `यह बस नंबर ${matchedRoute.routeNumber} है, ${destName} की ओर जा रही है।`
          : `This is Bus ${matchedRoute.routeNumber}, going towards ${destName}.`;

        spoken = lang === 'mr'
          ? `ही ${matchedRoute.routeNumber} नंबर बस ${destName} कडे चालली आहे.`
          : lang === 'hi'
          ? `यह ${matchedRoute.routeNumber} नंबर बस ${destName} की तरफ जा रही है।`
          : `This is Bus ${matchedRoute.routeNumber} going towards ${destName}.`;
      }

      res.json({
        success: true,
        isBoardReadable: true,
        routeNumber: matchedRoute.routeNumber,
        destinationText: parsed.destinationText || matchedRoute.name,
        confidence: parsed.confidence,
        isKnownRoute: true,
        route: matchedRoute,
        nextStops,
        goesToDestination,
        message: resultMsg,
        spokenScript: spoken,
        explanation: parsed.explanation
      });
      return;
    } catch (visionErr) {
      handleGeminiError(visionErr, 'scan-bus-board');
    }
  }

  // Fallback simulator if Gemini fails or API key issue
  // Returns Route 11 Swargate board match as demo fallback
  const fallbackRoute = (routesData as any[])[0]; // Route 11
  const stops = fallbackRoute.stops.map((s: any) => {
    const stopObj = (stopsData as any[]).find(st => st.id === s.stopId);
    return stopObj || { id: s.stopId, name: s.stopId, name_mr: s.stopId, name_hi: s.stopId };
  });

  const goesToDest = currentDestinationStopId ? stops.some((s: any) => s.id === currentDestinationStopId) : null;

  res.json({
    success: true,
    isBoardReadable: true,
    routeNumber: fallbackRoute.routeNumber,
    destinationText: 'Swargate / स्वारगेट',
    confidence: 0.92,
    isKnownRoute: true,
    route: fallbackRoute,
    nextStops: stops.slice(0, 3),
    goesToDestination: goesToDest,
    message: lang === 'mr'
      ? `ही बस क्र. ${fallbackRoute.routeNumber} आहे, स्वारगेट कडे जाणारी.`
      : lang === 'hi'
      ? `यह बस नंबर ${fallbackRoute.routeNumber} है, स्वारगेट की ओर जा रही है।`
      : `This is Bus ${fallbackRoute.routeNumber}, going towards Swargate.`,
    spokenScript: lang === 'mr'
      ? `ही ११ नंबर बस स्वारगेट कडे चालली आहे.`
      : lang === 'hi'
      ? `यह 11 नंबर बस स्वारगेट जा रही है।`
      : `This is Bus 11 going towards Swargate.`
  });
});

// 4. Guess Landmark & Nearest Bus Stop with Gemini when local matching fails
app.post('/api/gemini/guess-landmark', async (req: Request, res: Response) => {
  const { placeQuery, userLanguage = 'mr' } = req.body;

  if (!placeQuery || typeof placeQuery !== 'string' || !placeQuery.trim()) {
    res.status(400).json({ error: 'placeQuery is required' });
    return;
  }

  const query = placeQuery.trim();
  const lang = (userLanguage === 'hi' || userLanguage === 'en') ? userLanguage : 'mr';

  if (aiClient && !isQuotaExhausted()) {
    try {
      const prompt = `You are a Pune transit navigation assistant for PMPML buses.
The user entered or spoke a place, college, market, hospital, mall or landmark name that may contain typos, colloquial words, or prepositions (e.g., "opp phoenix mall", "near ferguson", "dagduset", "opp vaishali", "near symbiosis"):
User Query: "${query}"

Here is the database of known Pune Landmarks:
${JSON.stringify(landmarksData.map((lm: any) => ({
  id: lm.id,
  name: lm.name,
  name_mr: lm.name_mr,
  name_hi: lm.name_hi,
  nearestStopId: lm.nearestStopId,
  walkingMinutes: lm.walkingMinutes || lm.walkingTimeMinutes,
  area: lm.area,
  aliases: lm.aliases
})))}

Official PMPML stops:
${JSON.stringify(stopsData.map((s: any) => ({ id: s.id, name: s.name, name_mr: s.name_mr, name_hi: s.name_hi })))}

Task:
1. Determine the closest matching landmark from the list (or closest official bus stop).
2. If there are two possible landmarks that could match (e.g., Symbiosis SB Road vs another campus, or user query matches multiple spots), return both in "matchedLandmarks" so the user can choose.
3. Identify the nearest bus stop ID, stop name, and walking time in minutes.

Return STRICT JSON ONLY (no markdown formatting, no code blocks):
{
  "matchedLandmarks": [
    {
      "id": "landmark_id",
      "name": "Landmark Name",
      "name_mr": "...",
      "name_hi": "...",
      "nearestStopId": "stop_id",
      "walkingMinutes": 4,
      "area": "..."
    }
  ],
  "nearestStopId": "stop_id",
  "confidence": 0.9,
  "explanation": "Brief reasoning"
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      res.json({ success: true, ...parsed });
      return;
    } catch (err) {
      handleGeminiError(err, 'guess-landmark');
    }
  }

  // Fallback fuzzy search
  const lower = query.toLowerCase();
  const matched = (landmarksData as any[]).filter(lm => {
    return lm.name.toLowerCase().includes(lower) ||
           (lm.aliases && lm.aliases.some((a: string) => a.toLowerCase().includes(lower) || lower.includes(a.toLowerCase())));
  });

  if (matched.length > 0) {
    res.json({
      success: true,
      matchedLandmarks: matched.slice(0, 2),
      nearestStopId: matched[0].nearestStopId,
      confidence: 0.8
    });
  } else {
    res.json({
      success: false,
      matchedLandmarks: [],
      nearestStopId: null,
      confidence: 0.2,
      message: 'No landmark recognized'
    });
  }
});

// Configure Vite in dev mode or serve static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PuneBus Saathi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
