/**
 * Solar position after the NOAA solar calculator (Meeus, low precision; well under 0.1°
 * for our purposes). Azimuth is degrees clockwise from true north; altitude is geometric
 * (no refraction) in degrees above the horizon.
 */
import type { SunCorrection } from '../types';
import { utcToZonedMinutes, zonedToUtc } from './timezone';

export interface SunPosition {
  altitudeDeg: number;
  azimuthDeg: number;
}

const rad = Math.PI / 180;
const deg = 180 / Math.PI;

interface SolarParams {
  declRad: number;
  eotMin: number;
}

function solarParams(date: Date): SolarParams {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360) + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * rad) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const declRad = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eot =
    y * Math.sin(2 * L0 * rad) -
    2 * e * Math.sin(M * rad) +
    4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
    0.5 * y * y * Math.sin(4 * L0 * rad) -
    1.25 * e * e * Math.sin(2 * M * rad);
  return { declRad, eotMin: 4 * eot * deg };
}

export function sunPosition(date: Date, lat: number, lon: number): SunPosition {
  const { declRad, eotMin } = solarParams(date);
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60000;
  const tst = utcMin + eotMin + 4 * lon;
  const ha = (tst / 4 - 180) * rad;
  const latR = lat * rad;
  const cosZ = Math.sin(latR) * Math.sin(declRad) + Math.cos(latR) * Math.cos(declRad) * Math.cos(ha);
  const altitudeDeg = 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) * deg;
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(declRad) * Math.cos(latR)) * deg + 180;
  return { altitudeDeg, azimuthDeg: ((az % 360) + 360) % 360 };
}

/** Apply a manual calibration (azimuth offset, altitude scale). */
export function applyCorrection(p: SunPosition, c: SunCorrection | undefined): SunPosition {
  if (!c?.enabled) return p;
  return {
    altitudeDeg: p.altitudeDeg > 0 ? p.altitudeDeg * c.altitudeFactor : p.altitudeDeg,
    azimuthDeg: (((p.azimuthDeg + c.azimuthOffsetDeg) % 360) + 360) % 360,
  };
}

export interface SunDay {
  /** Local minutes after midnight; null when the sun does not rise/set that day. */
  sunrise: number | null;
  sunset: number | null;
  solarNoon: number;
  noonAltitudeDeg: number;
  sunriseAzimuthDeg: number | null;
  sunsetAzimuthDeg: number | null;
}

/** Standard sunrise/sunset altitude (refraction + solar disc). */
const HORIZON = -0.833;

/** Sunrise, sunset and solar noon for a local date. */
export function sunDay(date: string, lat: number, lon: number, tz: string): SunDay {
  const start = zonedToUtc(date, 0, tz).getTime();
  const end = zonedToUtc(date, 24 * 60, tz).getTime();
  const alt = (t: number) => sunPosition(new Date(t), lat, lon).altitudeDeg;
  const step = 10 * 60000;
  let sunrise: number | null = null;
  let sunset: number | null = null;
  let noonT = start;
  let noonAlt = -90;
  let prevT = start;
  let prev = alt(start) - HORIZON;
  const refine = (a: number, b: number) => {
    let lo = a;
    let hi = b;
    const fa = alt(lo) - HORIZON;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (Math.sign(alt(mid) - HORIZON) === Math.sign(fa)) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  for (let t = start + step; t <= end; t += step) {
    const a = alt(t);
    const cur = a - HORIZON;
    if (prev < 0 && cur >= 0 && sunrise === null) sunrise = refine(prevT, t);
    if (prev >= 0 && cur < 0) sunset = refine(prevT, t);
    if (a > noonAlt) {
      noonAlt = a;
      noonT = t;
    }
    prev = cur;
    prevT = t;
  }
  // Golden-section refine of the maximum around the coarse noon.
  let lo = noonT - step;
  let hi = noonT + step;
  for (let i = 0; i < 40; i++) {
    const m1 = lo + (hi - lo) * 0.382;
    const m2 = lo + (hi - lo) * 0.618;
    if (alt(m1) < alt(m2)) lo = m1;
    else hi = m2;
  }
  noonT = (lo + hi) / 2;
  const toLocal = (t: number) => utcToZonedMinutes(new Date(t), tz);
  const azAt = (t: number) => sunPosition(new Date(t), lat, lon).azimuthDeg;
  return {
    sunrise: sunrise === null ? null : toLocal(sunrise),
    sunset: sunset === null ? null : toLocal(sunset),
    solarNoon: toLocal(noonT),
    noonAltitudeDeg: alt(noonT),
    sunriseAzimuthDeg: sunrise === null ? null : azAt(sunrise),
    sunsetAzimuthDeg: sunset === null ? null : azAt(sunset),
  };
}

/** Sun position at a local date + minutes in the garden's zone, with optional correction. */
export function sunAtLocal(
  date: string,
  minutes: number,
  loc: { lat: number; lon: number; timeZone: string },
  correction?: SunCorrection,
): SunPosition {
  return applyCorrection(sunPosition(zonedToUtc(date, minutes, loc.timeZone), loc.lat, loc.lon), correction);
}

/**
 * Derive a correction from observations: the observed sunrise/sunset compass bearings
 * give an azimuth offset (averaged), the observed midday altitude gives a scale factor.
 */
export function calibrate(
  observed: { sunriseBearingDeg?: number; sunsetBearingDeg?: number; noonAltitudeDeg?: number; date: string },
  loc: { lat: number; lon: number; timeZone: string },
): { azimuthOffsetDeg: number; altitudeFactor: number } {
  const day = sunDay(observed.date, loc.lat, loc.lon, loc.timeZone);
  const diffs: number[] = [];
  const angleDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
  if (observed.sunriseBearingDeg !== undefined && day.sunriseAzimuthDeg !== null) {
    diffs.push(angleDiff(observed.sunriseBearingDeg, day.sunriseAzimuthDeg));
  }
  if (observed.sunsetBearingDeg !== undefined && day.sunsetAzimuthDeg !== null) {
    diffs.push(angleDiff(observed.sunsetBearingDeg, day.sunsetAzimuthDeg));
  }
  const azimuthOffsetDeg = diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
  const altitudeFactor =
    observed.noonAltitudeDeg !== undefined && day.noonAltitudeDeg > 0 ? observed.noonAltitudeDeg / day.noonAltitudeDeg : 1;
  return { azimuthOffsetDeg, altitudeFactor };
}
