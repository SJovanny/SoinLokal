import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GPSPoint {
  lat: number;
  lng: number;
}

export interface AppointmentWithGPS {
  time: string; // "HH:MM:SS" or "HH:MM"
  gps: GPSPoint | null;
  durationMin: number;
}

export interface SlotInfo {
  time: string;       // "HH:00" or "HH:30"
  label: string;      // "09:00"
  taken: boolean;
  isOptimal: boolean;
  addedDistance: number | null; // km added to tour if this slot is chosen
}

export interface TourLeg {
  fromIndex: number;
  toIndex: number;
  distanceKm: number;
  durationMin: number;
  departureTime: string; // "HH:MM" — when to leave to arrive on time
}

export interface TourResult {
  order: number[];       // indices into the original points array, in visit order
  totalDistanceKm: number;
  totalDurationMin: number;
  legs: TourLeg[];
  departureFromHome?: string | null; // "HH:MM" — when to leave home
  nurseAddress?: string | null;       // nurse's home address
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOT_DURATION_MINUTES = 30;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const MAPBOX_API_KEY = process.env.EXPO_PUBLIC_MAPBOX_API_KEY ?? '';
const ROUTING_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Haversine distance (km) — fallback
// ---------------------------------------------------------------------------

export function haversineDistance(a: GPSPoint, b: GPSPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ---------------------------------------------------------------------------
// Routing API (Mapbox Directions, fallback Haversine)
// ---------------------------------------------------------------------------

async function fetchRoute(from: GPSPoint, to: GPSPoint): Promise<{ distanceKm: number; durationMin: number } | null> {
  if (!MAPBOX_API_KEY) return null;

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&access_token=${MAPBOX_API_KEY}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.[0]) return null;

    return {
      distanceKm: Math.round((data.routes[0].distance / 1000) * 100) / 100,
      durationMin: Math.round((data.routes[0].duration / 60) * 10) / 10,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// OSRM distance matrix (pairwise calls, cached)
// ---------------------------------------------------------------------------
// For N points, fetches N*(N-1)/2 routes. With caching, each pair is fetched once.

export interface MatrixEntry {
  distanceKm: number;
  durationMin: number;
}

const matrixCache = new Map<string, MatrixEntry>();

function matrixKey(a: GPSPoint, b: GPSPoint): string {
  return `${a.lat.toFixed(4)},${a.lng.toFixed(4)}-${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
}

export async function getPairDistance(a: GPSPoint, b: GPSPoint): Promise<MatrixEntry> {
  const key = matrixKey(a, b);
  const cached = matrixCache.get(key);
  if (cached) return cached;

  const osrm = await fetchRoute(a, b);
  const entry: MatrixEntry = osrm ?? {
    distanceKm: Math.round(haversineDistance(a, b) * 100) / 100,
    durationMin: Math.round((haversineDistance(a, b) / 40) * 60 * 10) / 10, // ~40 km/h avg
  };

  matrixCache.set(key, entry);
  matrixCache.set(matrixKey(b, a), entry); // symmetric
  return entry;
}

// ---------------------------------------------------------------------------
// Nearest-neighbor tour (async, uses OSRM)
// ---------------------------------------------------------------------------
// Returns { order, totalDistance, totalDuration, legs }

export async function nearestNeighborTour(points: GPSPoint[]): Promise<TourResult> {
  if (points.length === 0) {
    return { order: [], totalDistanceKm: 0, totalDurationMin: 0, legs: [] };
  }
  if (points.length === 1) {
    return { order: [0], totalDistanceKm: 0, totalDurationMin: 0, legs: [] };
  }

  const visited = new Set<number>();
  const order: number[] = [0];
  visited.add(0);
  let current = 0;
  let totalDist = 0;
  let totalDur = 0;
  const legs: TourLeg[] = [];

  for (let step = 1; step < points.length; step++) {
    let nearest = -1;
    let nearestEntry: MatrixEntry = { distanceKm: Infinity, durationMin: Infinity };

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const entry = await getPairDistance(points[current], points[i]);
      if (entry.distanceKm < nearestEntry.distanceKm) {
        nearestEntry = entry;
        nearest = i;
      }
    }

    if (nearest >= 0) {
      legs.push({
        fromIndex: current,
        toIndex: nearest,
        distanceKm: nearestEntry.distanceKm,
        durationMin: nearestEntry.durationMin,
        departureTime: '', // filled later by caller
      });
      totalDist += nearestEntry.distanceKm;
      totalDur += nearestEntry.durationMin;
      visited.add(nearest);
      order.push(nearest);
      current = nearest;
    }
  }

  return {
    order,
    totalDistanceKm: Math.round(totalDist * 100) / 100,
    totalDurationMin: Math.round(totalDur),
    legs,
  };
}

// ---------------------------------------------------------------------------
// Chronological tour (respects appointment time order)
// ---------------------------------------------------------------------------
// Points: index 0 = nurse start, rest are patients in chronological order.
// Appointments: same order as points[1..n], with time and durationMin.

export interface ChronoAppointment {
  gps: GPSPoint;
  time: string;
  durationMin: number;
  originalIndex: number; // index in the original mapped array
}

export async function chronologicalTour(
  nurseGPS: GPSPoint,
  appointments: ChronoAppointment[]
): Promise<{ tour: TourResult; gpsIndices: number[] }> {
  // gpsIndices[0] = -1 (nurse), gpsIndices[i] = appointments[i-1].originalIndex
  const allPoints = [nurseGPS, ...appointments.map((a) => a.gps)];
  const gpsIndices = [-1, ...appointments.map((a) => a.originalIndex)];

  if (allPoints.length === 1) {
    return {
      tour: { order: [0], totalDistanceKm: 0, totalDurationMin: 0, legs: [] },
      gpsIndices,
    };
  }

  let totalDist = 0;
  let totalDur = 0;
  const legs: TourLeg[] = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const entry = await getPairDistance(allPoints[i], allPoints[i + 1]);
    legs.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm: entry.distanceKm,
      durationMin: entry.durationMin,
      departureTime: '',
    });
    totalDist += entry.distanceKm;
    totalDur += entry.durationMin;
  }

  const order = allPoints.map((_, i) => i);

  return {
    tour: {
      order,
      totalDistanceKm: Math.round(totalDist * 100) / 100,
      totalDurationMin: Math.round(totalDur),
      legs,
    },
    gpsIndices,
  };
}

// ---------------------------------------------------------------------------
// Flexible tour (distance-optimized, with optional fixed times)
// ---------------------------------------------------------------------------
// Used when nurses add patients without predefined times.
// Always optimizes by distance (nearest-neighbor), then calculates estimated
// arrival times based on departure time + travel + care duration.

export interface FlexibleTourStop {
  gps: GPSPoint;
  careType: string;
  durationMin: number;
  patientFileId: string;
  time?: string | null; // optional fixed time ("HH:MM" or "HH:MM:SS")
}

export interface FlexibleTourResult {
  order: number[];           // indices into the original stops array, in visit order
  legs: TourLeg[];
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedArrivals: string[]; // "HH:MM" estimated arrival at each stop (in original order)
}

export async function flexibleTour(
  nurseGPS: GPSPoint,
  stops: FlexibleTourStop[],
  departureTime: string, // "HH:MM"
): Promise<FlexibleTourResult> {
  if (stops.length === 0) {
    return {
      order: [],
      legs: [],
      totalDistanceKm: 0,
      totalDurationMin: 0,
      estimatedArrivals: [],
    };
  }

  // Build points array: [nurse, ...stops]
  const allPoints: GPSPoint[] = [nurseGPS, ...stops.map((s) => s.gps)];

  // Use nearest-neighbor to optimize order (always distance-based)
  const tour = await nearestNeighborTour(allPoints);

  // tour.order includes index 0 (nurse) as first element
  // Remove nurse (index 0) to get patient order
  const patientOrder = tour.order.filter((idx) => idx !== 0);
  // Convert from allPoints index to stops index (offset by 1)
  const stopOrder = patientOrder.map((idx) => idx - 1);

  // Calculate estimated arrival times
  const estimatedArrivals: string[] = new Array(stops.length).fill('');
  let currentMinutes = timeToMinutes(departureTime);

  // Legs from tour are indexed into allPoints (0 = nurse, 1..n = stops)
  // We need to walk through the legs in order and calculate times
  for (let i = 0; i < tour.legs.length; i++) {
    const leg = tour.legs[i];
    const toStopIdx = leg.toIndex - 1; // convert to stops index

    // Travel time to this stop
    currentMinutes += Math.ceil(leg.durationMin);
    estimatedArrivals[toStopIdx] = minutesToTime(currentMinutes);

    // Add care duration at this stop (if not the last stop)
    if (i < tour.legs.length - 1) {
      currentMinutes += stops[toStopIdx].durationMin;
    }
  }

  // Remap legs to use stops indices (0-based, not allPoints)
  const remappedLegs: TourLeg[] = tour.legs.map((leg) => ({
    fromIndex: leg.fromIndex - 1, // -1 = nurse start
    toIndex: leg.toIndex - 1,
    distanceKm: leg.distanceKm,
    durationMin: leg.durationMin,
    departureTime: '',
  }));

  // If any stop has a fixed time, adjust estimated arrivals
  // For now, fixed times are just noted but don't reorder the tour
  stops.forEach((stop, idx) => {
    if (stop.time) {
      estimatedArrivals[idx] = formatTimeHHMM(stop.time);
    }
  });

  return {
    order: stopOrder,
    legs: remappedLegs,
    totalDistanceKm: tour.totalDistanceKm,
    totalDurationMin: tour.totalDurationMin,
    estimatedArrivals,
  };
}

function formatTimeHHMM(time: string): string {
  return time.substring(0, 5);
}

// ---------------------------------------------------------------------------
// Calculate departure times for a tour
// ---------------------------------------------------------------------------
// Given the visit order and appointment times, calculates when to leave
// each stop to arrive at the next one on time.

export function calculateDepartureTimes(
  tour: TourResult,
  appointments: { time: string }[]
): TourLeg[] {
  if (tour.legs.length === 0) return [];

  const legs = [...tour.legs];

  // Process backwards: start from the last appointment, work backwards
  for (let i = legs.length - 1; i >= 0; i--) {
    const leg = legs[i];
    const arrivalTime = appointments[leg.toIndex]?.time;
    if (!arrivalTime) continue;

    const arrivalMinutes = timeToMinutes(arrivalTime);
    const departureMinutes = arrivalMinutes - Math.ceil(leg.durationMin);
    leg.departureTime = minutesToTime(Math.max(departureMinutes, 0));
  }

  return legs;
}

// ---------------------------------------------------------------------------
// Generate all 30min slots for a day
// ---------------------------------------------------------------------------

function generateAllSlots(): string[] {
  const slots: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Fetch existing appointments with GPS for a date
// ---------------------------------------------------------------------------

export async function fetchDayAppointmentsWithGPS(
  nurseId: string,
  dateISO: string
): Promise<AppointmentWithGPS[]> {
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('time, duration_min, patient_file_id, status')
    .eq('nurse_id', nurseId)
    .eq('date', dateISO)
    .in('status', ['pending', 'confirmed']);

  if (error || !appts || appts.length === 0) return [];

  const fileIds = [...new Set(appts.map((a: any) => a.patient_file_id))];
  const { data: files } = await supabase
    .from('patient_files')
    .select('id, patient_id')
    .in('id', fileIds);

  const fileToPatient: Record<string, string> = {};
  (files ?? []).forEach((f: any) => { fileToPatient[f.id] = f.patient_id; });

  const patientIds = [...new Set(Object.values(fileToPatient))];
  let gpsMap: Record<string, GPSPoint> = {};

  if (patientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('patient_profiles')
      .select('profile_id, gps_lat, gps_lng')
      .in('profile_id', patientIds);

    (profiles ?? []).forEach((p: any) => {
      if (p.gps_lat != null && p.gps_lng != null) {
        gpsMap[p.profile_id] = { lat: p.gps_lat, lng: p.gps_lng };
      }
    });
  }

  return appts.map((a: any) => {
    const patientId = fileToPatient[a.patient_file_id];
    return {
      time: a.time,
      gps: patientId ? gpsMap[patientId] ?? null : null,
      durationMin: a.duration_min ?? 60,
    };
  });
}

// ---------------------------------------------------------------------------
// Find optimal slot (async, uses OSRM)
// ---------------------------------------------------------------------------

export async function findOptimalSlot(
  existing: AppointmentWithGPS[],
  newPatientGPS: GPSPoint | null
): Promise<{ optimalTime: string; scores: Map<string, number> }> {
  const allSlots = generateAllSlots();

  // Block all slots that overlap with existing appointments (duration-aware)
  const takenMinutes = new Set<number>();
  for (const appt of existing) {
    const mins = timeToMinutes(appt.time);
    const duration = appt.durationMin ?? 60;
    for (let m = mins; m < mins + duration; m += SLOT_DURATION_MINUTES) {
      takenMinutes.add(m);
    }
  }

  const freeSlots = allSlots.filter((s) => {
    const mins = timeToMinutes(s);
    return !takenMinutes.has(mins);
  });

  if (freeSlots.length === 0) {
    return { optimalTime: '', scores: new Map() };
  }

  if (!newPatientGPS) {
    return { optimalTime: freeSlots[0], scores: new Map() };
  }

  // Base tour distance (existing patients only, chronological order)
  const existingSorted = existing
    .filter((a) => a.gps)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  let baseDistance = 0;
  if (existingSorted.length >= 1) {
    const chronoExisting = existingSorted.map((a, i) => ({
      gps: a.gps!,
      time: a.time,
      durationMin: a.durationMin ?? 60,
      originalIndex: i,
    }));
    const nurseGPS: GPSPoint = { lat: 0, lng: 0 }; // placeholder; delta is relative
    // For delta calc, use nearest-neighbor on existing only
    const existingPoints = existingSorted.map((a) => a.gps!);
    if (existingPoints.length >= 2) {
      const baseTour = await nearestNeighborTour(existingPoints);
      baseDistance = baseTour.totalDistanceKm;
    }
  }

  // Tour with new patient
  const existingPoints = existingSorted.map((a) => a.gps!);
  const allPointsWithNew = [...existingPoints, newPatientGPS];
  const newTour = await nearestNeighborTour(allPointsWithNew);
  const delta = Math.round((newTour.totalDistanceKm - baseDistance) * 100) / 100;

  const scores = new Map<string, number>();
  for (const slot of freeSlots) {
    scores.set(slot, delta);
  }

  const optimalTime = await findBestTimeSlot(existing, freeSlots, newPatientGPS);

  return { optimalTime, scores };
}

// ---------------------------------------------------------------------------
// Find best time slot (minimizes schedule disruption)
// ---------------------------------------------------------------------------

async function findBestTimeSlot(
  existing: AppointmentWithGPS[],
  freeSlots: string[],
  newPatientGPS: GPSPoint | null
): Promise<string> {
  if (existing.length === 0) return freeSlots[0];

  const getTravelMin = async (from: GPSPoint | null, to: GPSPoint | null): Promise<number> => {
    if (!from || !to) return 0;
    const entry = await getPairDistance(from, to);
    return Math.ceil(entry.durationMin);
  };

  const apptRanges = existing
    .map((a) => ({
      start: timeToMinutes(a.time),
      end: timeToMinutes(a.time) + (a.durationMin ?? 60),
      gps: a.gps,
    }))
    .sort((a, b) => a.start - b.start);

  const gaps: { start: number; end: number; size: number }[] = [];

  const slotStartMinutes = timeToMinutes(freeSlots[0]);
  const slotEndMinutes = timeToMinutes(freeSlots[freeSlots.length - 1]) + SLOT_DURATION_MINUTES;

  // Gap before first appointment
  if (apptRanges[0].start > slotStartMinutes) {
    const travelToNext = await getTravelMin(newPatientGPS, apptRanges[0].gps);
    const gapEnd = apptRanges[0].start - travelToNext;
    if (gapEnd > slotStartMinutes) {
      gaps.push({ start: slotStartMinutes, end: gapEnd, size: gapEnd - slotStartMinutes });
    }
  }

  // Gaps between appointments (adjusted by travel time)
  for (let i = 0; i < apptRanges.length - 1; i++) {
    const travelFromPrev = await getTravelMin(apptRanges[i].gps, newPatientGPS);
    const travelToNext = await getTravelMin(newPatientGPS, apptRanges[i + 1].gps);
    const gapStart = apptRanges[i].end + travelFromPrev;
    const gapEnd = apptRanges[i + 1].start - travelToNext;
    const gapSize = gapEnd - gapStart;
    if (gapSize >= SLOT_DURATION_MINUTES) {
      gaps.push({ start: gapStart, end: gapEnd, size: gapSize });
    }
  }

  // Gap after last appointment
  const lastEnd = apptRanges[apptRanges.length - 1].end;
  if (lastEnd < slotEndMinutes) {
    const travelFromPrev = await getTravelMin(apptRanges[apptRanges.length - 1].gps, newPatientGPS);
    const gapStart = lastEnd + travelFromPrev;
    if (gapStart < slotEndMinutes) {
      gaps.push({ start: gapStart, end: slotEndMinutes, size: slotEndMinutes - gapStart });
    }
  }

  if (gaps.length === 0) return freeSlots[0];

  const largestGap = gaps.reduce((best, gap) => gap.size > best.size ? gap : best, gaps[0]);
  const midPoint = Math.floor((largestGap.start + largestGap.end) / 2);
  const roundedMid = Math.floor(midPoint / SLOT_DURATION_MINUTES) * SLOT_DURATION_MINUTES;

  let bestSlot = freeSlots[0];
  let bestDist = Infinity;
  for (const slot of freeSlots) {
    const slotMin = timeToMinutes(slot);
    const dist = Math.abs(slotMin - roundedMid);
    if (dist < bestDist) {
      bestDist = dist;
      bestSlot = slot;
    }
  }

  return bestSlot;
}

// ---------------------------------------------------------------------------
// Build slot info array for UI (async)
// ---------------------------------------------------------------------------

export async function buildSlotInfos(
  existing: AppointmentWithGPS[],
  newPatientGPS: GPSPoint | null
): Promise<SlotInfo[]> {
  const allSlots = generateAllSlots();
  const { optimalTime, scores } = await findOptimalSlot(existing, newPatientGPS);

  const takenMinutes = new Set<number>();
  for (const appt of existing) {
    const mins = timeToMinutes(appt.time);
    const duration = appt.durationMin ?? 60;
    for (let m = mins; m < mins + duration; m += SLOT_DURATION_MINUTES) {
      takenMinutes.add(m);
    }
  }

  return allSlots.map((slot) => {
    const mins = timeToMinutes(slot);
    const taken = takenMinutes.has(mins);
    const isOptimal = slot === optimalTime && !taken;
    const addedDistance = scores.get(slot) ?? null;

    return {
      time: slot,
      label: slot,
      taken,
      isOptimal,
      addedDistance,
    };
  });
}
