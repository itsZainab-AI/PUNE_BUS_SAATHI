import { Language, PuneRoute, PuneStop } from '../types/pmpml';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

const STORAGE_CONTACTS_KEY = 'punebus_trusted_contacts_v1';
const STORAGE_SAFETY_MODE_KEY = 'punebus_safety_mode_active_v1';

export function getTrustedContacts(): TrustedContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONTACTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return [];
}

export function saveTrustedContacts(contacts: TrustedContact[]) {
  try {
    localStorage.setItem(STORAGE_CONTACTS_KEY, JSON.stringify(contacts.slice(0, 3)));
  } catch {
    // Ignore
  }
}

export function isSafetyModeEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_SAFETY_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSafetyModeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_SAFETY_MODE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

/**
 * Get current browser geolocation coordinates
 */
export async function getCurrentCoordinates(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  });
}

/**
 * Generate WhatsApp share message with trip details, bus number, ETA and live GPS link
 */
export async function createTripShareUrl(params: {
  routeNumber: string;
  routeName: string;
  destinationStopName: string;
  etaMinutes: number;
  lang: Language;
}): Promise<string> {
  const coords = await getCurrentCoordinates();
  const mapsLink = coords
    ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
    : `Pune Transit Route ${params.routeNumber}`;

  let text = '';
  if (params.lang === 'mr') {
    text = `🚨 मी पीएमपीएमएल बस क्र. ${params.routeNumber} (${params.routeName}) मध्ये प्रवास करत आहे.\n` +
      `📍 गंतव्य: ${params.destinationStopName}\n` +
      `⏱️ अंदाजे पोहोचण्याची वेळ: पुढील ${params.etaMinutes} मिनिटांत.\n` +
      `📌 माझे थेट स्थान: ${mapsLink}\n\n(पुणे बस साथी - सुरक्षित प्रवास)`;
  } else if (params.lang === 'hi') {
    text = `🚨 मैं पीएमपीएमएल बस नंबर ${params.routeNumber} (${params.routeName}) में यात्रा कर रही हूँ।\n` +
      `📍 गंतव्य: ${params.destinationStopName}\n` +
      `⏱️ संभावित समय: लगभग ${params.etaMinutes} मिनट में।\n` +
      `📌 मेरा लाइव लोकेशन: ${mapsLink}\n\n(पुणे बस साथी - सुरक्षा मोड)`;
  } else {
    text = `🚨 I am traveling on PMPML Bus ${params.routeNumber} (${params.routeName}).\n` +
      `📍 Destination: ${params.destinationStopName}\n` +
      `⏱️ Expected Arrival: in ~${params.etaMinutes} mins.\n` +
      `📌 My Live Location: ${mapsLink}\n\n(PuneBus Saathi - Safety Mode)`;
  }

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Create SOS message for emergency contacts
 */
export async function createSosEmergencyUrl(contactPhone?: string): Promise<string> {
  const coords = await getCurrentCoordinates();
  const mapsLink = coords
    ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
    : `Pune`;

  const msg = `EMERGENCY SOS! I need urgent help while traveling on Pune bus. My live location: ${mapsLink} (Calling 112 / 1091)`;
  const phone = contactPhone ? contactPhone.replace(/\D/g, '') : '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
