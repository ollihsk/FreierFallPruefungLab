export type ExamStudentStationId = 'alpha' | 'beta' | 'gamma';
export type TubeAtmosphereMode = 'vacuum' | 'air';

export interface ExamStationProfile {
  id: ExamStudentStationId;
  codeName: string;
  studentLabel: string;
  sectorTitle: string;
  description: string;
  /** True gravitational acceleration g_wahr in m/s² (NEVER shown to student!) */
  trueG: number;
  /** Systematic electromagnetic release delay at Photogate 1 in seconds (e.g. +0.017 s) */
  magnetDelayS: number;
  /** Maximum random photogate timing jitter (+/- seconds) */
  jitterAmplitudeS: number;
  /** Effective aerodynamic drag factor k_air in kg/m when tube is ventilated */
  airDragK: number;
  skyColors: {
    top: string;
    mid: string;
    horizon: string;
    ground: string;
    accent: string;
  };
}

export const EXAM_STATION_PROFILES: Record<ExamStudentStationId, ExamStationProfile> = {
  alpha: {
    id: 'alpha',
    codeName: 'PRÜFLING A',
    studentLabel: 'Prüfling 1 (Station Alpha)',
    sectorTitle: 'Forschungsstation „Sektor Alpha-1“',
    description: 'Unbekannter Himmelskörper Alpha-1 • Vertikale 5-m-Fallröhre mit Lichtschranken LS 1 & LS 2',
    trueG: 4.65,
    magnetDelayS: 0.018,
    jitterAmplitudeS: 0.008,
    airDragK: 0.018,
    skyColors: {
      top: '#0f172a',
      mid: '#1e3a5f',
      horizon: '#0284c7',
      ground: '#1e293b',
      accent: '#38bdf8',
    },
  },
  beta: {
    id: 'beta',
    codeName: 'PRÜFLING B',
    studentLabel: 'Prüfling 2 (Station Beta)',
    sectorTitle: 'Forschungsstation „Sektor Beta-2“',
    description: 'Unbekannter Himmelskörper Beta-2 • Vertikale 5-m-Fallröhre mit Lichtschranken LS 1 & LS 2',
    trueG: 6.35,
    magnetDelayS: 0.016,
    jitterAmplitudeS: 0.008,
    airDragK: 0.018,
    skyColors: {
      top: '#1e1b4b',
      mid: '#312e81',
      horizon: '#6366f1',
      ground: '#1e293b',
      accent: '#a855f7',
    },
  },
  gamma: {
    id: 'gamma',
    codeName: 'PRÜFLING C',
    studentLabel: 'Prüfling 3 (Station Gamma)',
    sectorTitle: 'Forschungsstation „Sektor Gamma-3“',
    description: 'Unbekannter Himmelskörper Gamma-3 • Vertikale 5-m-Fallröhre mit Lichtschranken LS 1 & LS 2',
    trueG: 11.85,
    magnetDelayS: 0.014,
    jitterAmplitudeS: 0.007,
    airDragK: 0.018,
    skyColors: {
      top: '#042f2e',
      mid: '#115e59',
      horizon: '#14b8a6',
      ground: '#1e293b',
      accent: '#10b981',
    },
  },
};

export interface DropMeasurementRow {
  id: string;
  trialNumber: number;
  timestamp: string;
  stationId: ExamStudentStationId;
  tubeMode: TubeAtmosphereMode;
  massKg: number;
  distanceM: number;
  measuredTimeS: number;
}

export interface StudentSeriesEntry {
  distanceM: string;
  t1S: string;
  t2S: string;
  t3S: string;
  meanTimeS: string;
  calculatedG: string;
}

export interface AttachedPhoto {
  id: string;
  fileName: string;
  caption: string;
  dataUrl: string;
  addedAt: string;
}

export interface ExamProtocolSubmission {
  submissionId: string;
  labId: string;
  studentName: string;
  schoolClass: string;
  stationId: ExamStudentStationId;
  submittedAt: string;
  timeSpentSeconds: number;
  focusLossCount: number;
  pasteCount: number;
  verificationCode: string;

  // Recorded raw photogate table
  measurements: DropMeasurementRow[];

  // Task 1: Series evaluation table (3 heights x 3 measurements + mean + g_exp)
  task1Series: [StudentSeriesEntry, StudentSeriesEntry, StudentSeriesEntry];
  finalStudentG: string;

  // Task 2: Mass independence in vacuum vs. air
  task2VacuumLightTimeS: string;
  task2VacuumHeavyTimeS: string;
  task2AirLightTimeS: string;
  task2AirHeavyTimeS: string;
  task2Reasoning: string;

  // Task 3: Short distance (0.5 m) systematic error analysis
  task3ShortDistMeanTimeS: string;
  task3ShortDistG: string;
  task3Reasoning: string;

  // Task 4: Handwritten calculation & diagram photos
  photos: AttachedPhoto[];
  additionalNotes: string;
}

/**
 * Calculates the physical fall time (before sensor jitter and magnet delay)
 * for a given distance s2, mass m, and tube mode (vacuum vs. ventilated air).
 */
export function calculatePhysicalFallTimeS(params: {
  stationId: ExamStudentStationId;
  distanceM: number;
  massKg: number;
  tubeMode: TubeAtmosphereMode;
}): number {
  const profile = EXAM_STATION_PROFILES[params.stationId];
  const s = Math.max(0.1, params.distanceM);
  const g = profile.trueG;

  if (params.tubeMode === 'vacuum') {
    return Math.sqrt((2 * s) / g);
  }

  // With air resistance F_L = k * v²:
  // s(t) = (v_inf² / g) * ln(cosh(g * t / v_inf))
  // => t = (v_inf / g) * acosh(exp(g * s / v_inf²))
  const m = Math.max(0.05, params.massKg);
  const k = profile.airDragK;
  const vInfSq = (m * g) / k;
  const vInf = Math.sqrt(vInfSq);
  const arg = Math.exp((g * s) / vInfSq);
  return (vInf / g) * Math.acosh(Math.max(1, arg));
}

/**
 * Generates a realistic photogate measurement time t_2 in seconds (rounded to 1 ms = 0.001 s)
 * combining physical fall time + systematic magnet release lag + realistic random sensor jitter.
 */
export function simulateRealisticPhotogateTimeS(params: {
  stationId: ExamStudentStationId;
  distanceM: number;
  massKg: number;
  tubeMode: TubeAtmosphereMode;
  /** Optional deterministic random number in [-1, 1] for unit testing */
  fixedJitterFactor?: number;
}): number {
  const profile = EXAM_STATION_PROFILES[params.stationId];
  const tPhys = calculatePhysicalFallTimeS(params);

  // Triangular distribution in [-1, 1] for natural Gaussian-like measurement scatter
  const jitterFactor =
    params.fixedJitterFactor !== undefined
      ? params.fixedJitterFactor
      : (Math.random() - Math.random()) * 0.95;

  const jitterS = jitterFactor * profile.jitterAmplitudeS;
  const rawTime = tPhys + profile.magnetDelayS + jitterS;
  return Math.max(0.05, Math.round(rawTime * 1000) / 1000);
}

/**
 * Evaluates a student's submission for the Teacher Dashboard:
 * Computes the true station g, the empirical g from the student's actual recorded table rows,
 * and checks experimental completeness.
 */
export interface TeacherSubmissionEvaluation {
  trueStationG: number;
  expectedGAt4mVacuum: number;
  expectedGAt05mVacuum: number;
  empiricalMeanGFromStudentTable: number | null;
  studentSubmittedG: number | null;
  deviationFromTablePercent: number | null;
  deviationFromTruePercent: number | null;
  vacuumTrialsCount: number;
  airTrialsCount: number;
  shortDistTrialsCount: number;
  distinctDistancesCount: number;
}

export function evaluateStudentSubmission(
  sub: ExamProtocolSubmission
): TeacherSubmissionEvaluation {
  const profile = EXAM_STATION_PROFILES[sub.stationId] || EXAM_STATION_PROFILES.alpha;
  const trueStationG = profile.trueG;

  // Expected measured g at 4.0 m and 0.5 m including systematic magnet release delay
  const t4m = calculatePhysicalFallTimeS({
    stationId: sub.stationId,
    distanceM: 4.0,
    massKg: 1.0,
    tubeMode: 'vacuum',
  }) + profile.magnetDelayS;
  const expectedGAt4mVacuum = (2 * 4.0) / (t4m * t4m);

  const t05m = calculatePhysicalFallTimeS({
    stationId: sub.stationId,
    distanceM: 0.5,
    massKg: 1.0,
    tubeMode: 'vacuum',
  }) + profile.magnetDelayS;
  const expectedGAt05mVacuum = (2 * 0.5) / (t05m * t05m);

  const vacuumRows = sub.measurements.filter((m) => m.tubeMode === 'vacuum');
  const airRows = sub.measurements.filter((m) => m.tubeMode === 'air');
  const shortRows = sub.measurements.filter((m) => m.distanceM <= 0.6);
  const distinctDistances = new Set(sub.measurements.map((m) => m.distanceM.toFixed(1)));

  // Empirical g from student's own vacuum measurements at s >= 1.0 m
  const validVacuumRows = vacuumRows.filter((m) => m.distanceM >= 1.0 && m.measuredTimeS > 0);
  let empiricalMeanGFromStudentTable: number | null = null;
  if (validVacuumRows.length > 0) {
    const sumG = validVacuumRows.reduce(
      (acc, r) => acc + (2 * r.distanceM) / (r.measuredTimeS * r.measuredTimeS),
      0
    );
    empiricalMeanGFromStudentTable = sumG / validVacuumRows.length;
  }

  const parsedStudentG = parseFloat(String(sub.finalStudentG || '').replace(',', '.'));
  const studentSubmittedG =
    !isNaN(parsedStudentG) && parsedStudentG > 0 ? parsedStudentG : null;

  const deviationFromTablePercent =
    studentSubmittedG !== null && empiricalMeanGFromStudentTable !== null
      ? ((studentSubmittedG - empiricalMeanGFromStudentTable) / empiricalMeanGFromStudentTable) * 100
      : null;

  const deviationFromTruePercent =
    studentSubmittedG !== null
      ? ((studentSubmittedG - trueStationG) / trueStationG) * 100
      : null;

  return {
    trueStationG,
    expectedGAt4mVacuum,
    expectedGAt05mVacuum,
    empiricalMeanGFromStudentTable,
    studentSubmittedG,
    deviationFromTablePercent,
    deviationFromTruePercent,
    vacuumTrialsCount: vacuumRows.length,
    airTrialsCount: airRows.length,
    shortDistTrialsCount: shortRows.length,
    distinctDistancesCount: distinctDistances.size,
  };
}

export function generateVerificationCode(
  studentName: string,
  stationId: string,
  measurementCount: number
): string {
  const clean = `${studentName.trim().toUpperCase()}|${stationId}|${measurementCount}`;
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `FF10-${stationId.toUpperCase().slice(0, 3)}-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
