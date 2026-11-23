import React, { useState, useEffect, useRef } from 'react';
import {
  ExamStudentStationId,
  TubeAtmosphereMode,
  EXAM_STATION_PROFILES,
  DropMeasurementRow,
  StudentSeriesEntry,
  AttachedPhoto,
  ExamProtocolSubmission,
  simulateRealisticPhotogateTimeS,
  generateVerificationCode,
} from './physics/freeFallExamEngine';
import {
  uploadProtocolToServer,
  downloadSubmissionAsJson,
  compressImageFileToDataUrl,
} from './utils/protocolApi';
import { TeacherInboxModal } from './components/TeacherInboxModal';
import {
  Play,
  RotateCcw,
  Lock,
  Clock,
  User,
  GraduationCap,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Download,
  Printer,
  Send,
  Wind,
  Gauge,
  FileText,
} from 'lucide-react';

const STORAGE_DRAFT_KEY = 'ff_exam_student_draft_v1';

const DEFAULT_SERIES: [StudentSeriesEntry, StudentSeriesEntry, StudentSeriesEntry] = [
  { distanceM: '1,5', t1S: '', t2S: '', t3S: '', meanTimeS: '', calculatedG: '' },
  { distanceM: '3,0', t1S: '', t2S: '', t3S: '', meanTimeS: '', calculatedG: '' },
  { distanceM: '4,5', t1S: '', t2S: '', t3S: '', meanTimeS: '', calculatedG: '' },
];

export const App: React.FC = () => {
  // Student Identity & Station
  const [studentName, setStudentName] = useState<string>('');
  const [schoolClass, setSchoolClass] = useState<string>('10');
  const [stationId, setStationId] = useState<ExamStudentStationId>('alpha');

  // Experimental Apparatus Parameters
  const [tubeMode, setTubeMode] = useState<TubeAtmosphereMode>('vacuum');
  const [gate2DistM, setGate2DistM] = useState<number>(2.0); // 0.5 .. 5.0 m
  const [dropMassKg, setDropMassKg] = useState<number>(1.0); // 0.1 .. 5.0 kg
  const fallHeightM = 5.0;

  // Live Drop Animation State
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [currentYM, setCurrentYM] = useState<number>(0);
  const [displayStopwatchS, setDisplayStopwatchS] = useState<number | null>(null);
  const [gate2Triggered, setGate2Triggered] = useState<boolean>(false);

  // Recorded Raw Measurements
  const [measurements, setMeasurements] = useState<DropMeasurementRow[]>([]);

  // Exam Tasks Answers
  const [task1Series, setTask1Series] =
    useState<[StudentSeriesEntry, StudentSeriesEntry, StudentSeriesEntry]>(DEFAULT_SERIES);
  const [finalStudentG, setFinalStudentG] = useState<string>('');

  const [task2VacuumLightTimeS, setTask2VacuumLightTimeS] = useState<string>('');
  const [task2VacuumHeavyTimeS, setTask2VacuumHeavyTimeS] = useState<string>('');
  const [task2AirLightTimeS, setTask2AirLightTimeS] = useState<string>('');
  const [task2AirHeavyTimeS, setTask2AirHeavyTimeS] = useState<string>('');
  const [task2Reasoning, setTask2Reasoning] = useState<string>('');

  const [task3ShortDistMeanTimeS, setTask3ShortDistMeanTimeS] = useState<string>('');
  const [task3ShortDistG, setTask3ShortDistG] = useState<string>('');
  const [task3Reasoning, setTask3Reasoning] = useState<string>('');

  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [additionalNotes] = useState<string>('');

  // Telemetry & Anti-Cheat Counters
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  const [pasteCount, setPasteCount] = useState<number>(0);

  // Submission Status & Teacher Modal
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<{
    ok: boolean;
    message: string;
    code: string;
    time: string;
  } | null>(null);
  const [showTeacherModal, setShowTeacherModal] = useState<boolean>(false);

  const profile = EXAM_STATION_PROFILES[stationId];

  // Load saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.studentName) setStudentName(d.studentName);
      if (d.schoolClass) setSchoolClass(d.schoolClass);
      if (d.stationId && EXAM_STATION_PROFILES[d.stationId as ExamStudentStationId]) {
        setStationId(d.stationId);
      }
      if (Array.isArray(d.measurements)) setMeasurements(d.measurements);
      if (Array.isArray(d.task1Series) && d.task1Series.length === 3) setTask1Series(d.task1Series);
      if (d.finalStudentG) setFinalStudentG(d.finalStudentG);
      if (d.task2VacuumLightTimeS) setTask2VacuumLightTimeS(d.task2VacuumLightTimeS);
      if (d.task2VacuumHeavyTimeS) setTask2VacuumHeavyTimeS(d.task2VacuumHeavyTimeS);
      if (d.task2AirLightTimeS) setTask2AirLightTimeS(d.task2AirLightTimeS);
      if (d.task2AirHeavyTimeS) setTask2AirHeavyTimeS(d.task2AirHeavyTimeS);
      if (d.task2Reasoning) setTask2Reasoning(d.task2Reasoning);
      if (d.task3ShortDistMeanTimeS) setTask3ShortDistMeanTimeS(d.task3ShortDistMeanTimeS);
      if (d.task3ShortDistG) setTask3ShortDistG(d.task3ShortDistG);
      if (d.task3Reasoning) setTask3Reasoning(d.task3Reasoning);
      if (Array.isArray(d.photos)) setPhotos(d.photos);
      if (typeof d.secondsElapsed === 'number') setSecondsElapsed(d.secondsElapsed);
    } catch {
      // Ignore draft errors
    }
  }, []);

  // Save draft automatically
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_DRAFT_KEY,
        JSON.stringify({
          studentName,
          schoolClass,
          stationId,
          measurements,
          task1Series,
          finalStudentG,
          task2VacuumLightTimeS,
          task2VacuumHeavyTimeS,
          task2AirLightTimeS,
          task2AirHeavyTimeS,
          task2Reasoning,
          task3ShortDistMeanTimeS,
          task3ShortDistG,
          task3Reasoning,
          photos,
          secondsElapsed,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [
    studentName,
    schoolClass,
    stationId,
    measurements,
    task1Series,
    finalStudentG,
    task2VacuumLightTimeS,
    task2VacuumHeavyTimeS,
    task2AirLightTimeS,
    task2AirHeavyTimeS,
    task2Reasoning,
    task3ShortDistMeanTimeS,
    task3ShortDistG,
    task3Reasoning,
    photos,
  ]);

  // Timer & Focus-Loss Tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setFocusLossCount((c) => c + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Animation Refs
  const animRef = useRef<number | null>(null);
  const dropPlanRef = useRef<{
    startTime: number;
    targetGate2TimeS: number;
    totalTubeTimeS: number;
    gate2Done: boolean;
  } | null>(null);

  const handleResetBall = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsDropping(false);
    setCurrentYM(0);
    setDisplayStopwatchS(null);
    setGate2Triggered(false);
    dropPlanRef.current = null;
  };

  const handleStartDrop = () => {
    if (isDropping) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    // Pre-compute the realistic noisy photogate time t2 for this trial!
    const noisyGate2TimeS = simulateRealisticPhotogateTimeS({
      stationId,
      distanceM: gate2DistM,
      massKg: dropMassKg,
      tubeMode,
    });

    const noisyTotalTimeS = Math.max(
      noisyGate2TimeS + 0.05,
      noisyGate2TimeS * Math.sqrt(fallHeightM / gate2DistM)
    );

    setCurrentYM(0);
    setDisplayStopwatchS(0);
    setGate2Triggered(false);
    setIsDropping(true);

    dropPlanRef.current = {
      startTime: performance.now(),
      targetGate2TimeS: noisyGate2TimeS,
      totalTubeTimeS: noisyTotalTimeS,
      gate2Done: false,
    };

    const step = (now: number) => {
      const plan = dropPlanRef.current;
      if (!plan) return;
      const elapsedS = (now - plan.startTime) / 1000;

      // Quadratic vertical progress reaching gate2DistM at exact targetGate2TimeS
      const effG = (2 * gate2DistM) / (plan.targetGate2TimeS * plan.targetGate2TimeS);
      const yNow = Math.min(fallHeightM, 0.5 * effG * elapsedS * elapsedS);
      setCurrentYM(yNow);

      if (!plan.gate2Done) {
        if (elapsedS >= plan.targetGate2TimeS) {
          plan.gate2Done = true;
          setGate2Triggered(true);
          setDisplayStopwatchS(plan.targetGate2TimeS);

          // Automatically append to raw measurements table
          const nowStr = new Date().toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setMeasurements((prev) => [
            ...prev,
            {
              id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              trialNumber: prev.length + 1,
              timestamp: nowStr,
              stationId,
              tubeMode,
              massKg: dropMassKg,
              distanceM: gate2DistM,
              measuredTimeS: plan.targetGate2TimeS,
            },
          ]);
        } else {
          setDisplayStopwatchS(elapsedS);
        }
      }

      if (yNow >= fallHeightM || elapsedS >= plan.totalTubeTimeS) {
        setCurrentYM(fallHeightM);
        setIsDropping(false);
        return;
      }

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
  };

  const updateSeriesField = (
    rowIndex: 0 | 1 | 2,
    field: keyof StudentSeriesEntry,
    value: string
  ) => {
    setTask1Series((prev) => {
      const copy: [StudentSeriesEntry, StudentSeriesEntry, StudentSeriesEntry] = [
        { ...prev[0] },
        { ...prev[1] },
        { ...prev[2] },
      ];
      copy[rowIndex][field] = value;
      return copy;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      if (photos.length + i >= 3) break;
      const file = files[i];
      try {
        const dataUrl = await compressImageFileToDataUrl(file);
        setPhotos((prev) => [
          ...prev,
          {
            id: `ph_${Date.now()}_${i}`,
            fileName: file.name,
            caption: `Handschriftlicher Rechenweg / Skizze (${prev.length + 1})`,
            dataUrl,
            addedAt: new Date().toISOString(),
          },
        ]);
      } catch {
        alert('Foto konnte nicht verarbeitet werden.');
      }
    }
    e.target.value = '';
  };

  const buildCurrentSubmission = (): ExamProtocolSubmission => {
    const verCode = generateVerificationCode(
      studentName || 'Unbekannt',
      stationId,
      measurements.length
    );
    return {
      submissionId: `sub_${stationId}_${(studentName || 'schueler')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}`,
      labId: 'freier-fall-pruefung',
      studentName: studentName.trim(),
      schoolClass: schoolClass.trim(),
      stationId,
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: secondsElapsed,
      focusLossCount,
      pasteCount,
      verificationCode: verCode,
      measurements,
      task1Series,
      finalStudentG,
      task2VacuumLightTimeS,
      task2VacuumHeavyTimeS,
      task2AirLightTimeS,
      task2AirHeavyTimeS,
      task2Reasoning,
      task3ShortDistMeanTimeS,
      task3ShortDistG,
      task3Reasoning,
      photos,
      additionalNotes,
    };
  };

  const handleOnlineSubmit = async () => {
    if (!studentName.trim()) {
      alert('Bitte trage zuerst oben deinen Vor- und Nachnamen ein!');
      return;
    }
    if (measurements.length < 3) {
      alert('Bitte führe zuerst deine Messungen an der Fallröhre durch (mindestens 3 Messwerte in der Tabelle).');
      return;
    }
    setIsSubmitting(true);
    const sub = buildCurrentSubmission();
    const res = await uploadProtocolToServer(sub);
    setIsSubmitting(false);
    setSubmitStatus({
      ok: res.ok,
      message: res.message,
      code: sub.verificationCode,
      time: new Date().toLocaleTimeString('de-DE'),
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Exam Header Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 shadow-lg sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-100">
                  Prüfungs<span className="text-cyan-400">Labor</span>: Freier Fall
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-700/60 uppercase">
                  Prüfungsmodus (Ohne Formelvorgabe)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Experimentelle Bestimmung eines unbekannten Ortsfaktors <i>g</i> mit Fehler- &amp; Streuungsanalyse
              </p>
            </div>
          </div>

          {/* Student Name, Timer & Teacher Inbox Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-cyan-400">
              <User size={14} className="text-cyan-400" />
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Vor- und Nachname..."
                className="bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none w-40 sm:w-48 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-amber-300">
              <Clock size={13} />
              <span>{formatTimer(secondsElapsed)}</span>
            </div>

            <button
              onClick={() => setShowTeacherModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all"
              title="Eingegangene Schülerprotokolle als Lehrkraft abrufen"
            >
              <GraduationCap size={15} />
              <span>📬 Lehrer-Abruf</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Step 1: Select Assigned Student Exam Station (A, B, or C) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                1. Zugewiesene Prüfungsstation wählen (Prüfling A, B oder C)
              </h2>
              <p className="text-xs text-slate-400">
                Jeder der drei Prüflinge untersucht einen eigenen unbekannten Himmelskörper mit individuellem Ortsfaktor{' '}
                <i>g</i>. Wähle deine zugewiesene Station:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['alpha', 'beta', 'gamma'] as ExamStudentStationId[]).map((id) => {
              const st = EXAM_STATION_PROFILES[id];
              const active = stationId === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    handleResetBall();
                    setStationId(id);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-500/30">
                      {st.codeName}
                    </span>
                    {active && <span className="text-xs text-emerald-400 font-bold">● Aktiv</span>}
                  </div>
                  <div className="font-bold text-sm text-slate-100">{st.sectorTitle}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ortsfaktor <i>g</i> = ? m/s² (experimentell zu bestimmen)
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Spoiler-Free 5-m Drop Tube Simulation with Realistic Jitter & Magnet Delay */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-5 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
                <Gauge className="text-cyan-400" size={19} />
                <span>2. Messstation: Vertikale 5,0-m-Fallröhre ({profile.sectorTitle})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Lichtschranke 1 (<span className="font-mono text-cyan-300"><i>s</i>₁ = 0,0 m</span>) startet beim Öffnen des Haltemagneten die Zeitmessung. Lichtschranke 2 stoppt bei der eingestellten Fallstrecke{' '}
                <span className="font-mono text-cyan-300"><i>s</i>₂</span> die Fallzeit <span className="font-mono text-amber-300"><i>t</i>₂</span>.
              </p>
            </div>

            {/* Vacuum vs. Ventilated Air Switch */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  handleResetBall();
                  setTubeMode('vacuum');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tubeMode === 'vacuum'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🧪 Evakuiert (Vakuum, 0 mbar)
              </button>
              <button
                onClick={() => {
                  handleResetBall();
                  setTubeMode('air');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  tubeMode === 'air'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wind size={13} />
                <span>Belüftet (Luft, 1 013 mbar)</span>
              </button>
            </div>
          </div>

          {/* SVG Drop Tube & Raw Apparatus Telemetry (NO FORMULA SPOILERS!) */}
          <div className="relative w-full aspect-[860/360] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 860 360" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="stationSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={profile.skyColors.top} />
                  <stop offset="55%" stopColor={profile.skyColors.mid} />
                  <stop offset="88%" stopColor={profile.skyColors.horizon} />
                  <stop offset="92%" stopColor={profile.skyColors.ground} />
                  <stop offset="100%" stopColor="#090d16" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="860" height="360" fill="url(#stationSky)" />

              {/* Stars in upper sky */}
              {Array.from({ length: 24 }).map((_, i) => (
                <circle
                  key={i}
                  cx={(i * 67 + 23) % 330}
                  cy={(i * 41 + 19) % 240}
                  r={i % 3 === 0 ? 1.5 : 1.0}
                  fill="#f8fafc"
                  opacity={0.45}
                />
              ))}

              {/* Horizon Terrain */}
              <path
                d="M 0,322 Q 85,305 170,318 Q 260,304 345,322 L 345,360 L 0,360 Z"
                fill="#0f172a"
                opacity="0.9"
              />

              {/* 5.0 m Glass Fall Tube (x: 185..235, y: 36..306) */}
              {(() => {
                const tubeX1 = 185;
                const tubeX2 = 235;
                const tubeTopY = 36;
                const tubeBotY = 306;
                const tubeH = tubeBotY - tubeTopY;
                const g2Y = tubeTopY + (gate2DistM / fallHeightM) * tubeH;
                const ballY = tubeTopY + (currentYM / fallHeightM) * tubeH;
                const ballRadius = 8 + Math.min(7, dropMassKg * 1.3);

                return (
                  <g>
                    {/* Tube Body */}
                    <rect
                      x={tubeX1}
                      y={tubeTopY}
                      width={tubeX2 - tubeX1}
                      height={tubeH}
                      rx="8"
                      fill={tubeMode === 'vacuum' ? '#38bdf8' : '#f59e0b'}
                      fillOpacity={tubeMode === 'vacuum' ? 0.08 : 0.16}
                      stroke={tubeMode === 'vacuum' ? '#38bdf8' : '#f59e0b'}
                      strokeWidth="2"
                    />

                    {/* Air molecules dots if tubeMode === 'air' */}
                    {tubeMode === 'air' &&
                      Array.from({ length: 28 }).map((_, ai) => (
                        <circle
                          key={ai}
                          cx={tubeX1 + 8 + ((ai * 17) % 34)}
                          cy={tubeTopY + 12 + ((ai * 29) % (tubeH - 20))}
                          r="1.3"
                          fill="#fde68a"
                          opacity="0.55"
                        />
                      ))}

                    {/* Top Electromagnet Release Holder */}
                    <rect
                      x={tubeX1 - 8}
                      y={tubeTopY - 14}
                      width={tubeX2 - tubeX1 + 16}
                      height="14"
                      rx="3"
                      fill="#334155"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    <text x="210" y={tubeTopY - 4} fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">
                      HALTEMAGNET
                    </text>

                    {/* Ruler Marks every 1.0 m */}
                    {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((mVal) => {
                      const yPos = tubeTopY + (mVal / fallHeightM) * tubeH;
                      const isMajor = Number.isInteger(mVal);
                      return (
                        <g key={mVal}>
                          <line
                            x1={tubeX1 - (isMajor ? 18 : 10)}
                            y1={yPos}
                            x2={tubeX1 - 2}
                            y2={yPos}
                            stroke={isMajor ? '#cbd5e1' : '#64748b'}
                            strokeWidth={isMajor ? 1.5 : 1}
                          />
                          {isMajor && (
                            <text
                              x={tubeX1 - 22}
                              y={yPos + 3}
                              fill="#e2e8f0"
                              fontSize="9.5"
                              fontWeight="bold"
                              textAnchor="end"
                            >
                              {mVal.toFixed(1).replace('.', ',')} m
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Photogate 1 (s1 = 0.0 m) */}
                    <line
                      x1={tubeX1 - 4}
                      y1={tubeTopY}
                      x2={tubeX2 + 4}
                      y2={tubeTopY}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                    <rect x={tubeX2 + 8} y={tubeTopY - 9} width="72" height="18" rx="4" fill="#0284c7" />
                    <text x={tubeX2 + 44} y={tubeTopY + 3} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">
                      LS 1 (0,0 m)
                    </text>

                    {/* Photogate 2 (s2 = gate2DistM) */}
                    <line
                      x1={tubeX1 - 4}
                      y1={g2Y}
                      x2={tubeX2 + 4}
                      y2={g2Y}
                      stroke={gate2Triggered ? '#10b981' : '#f59e0b'}
                      strokeWidth="2.5"
                      strokeDasharray="3,3"
                    />
                    <rect
                      x={tubeX2 + 8}
                      y={g2Y - 9}
                      width="84"
                      height="18"
                      rx="4"
                      fill={gate2Triggered ? '#059669' : '#d97706'}
                    />
                    <text x={tubeX2 + 50} y={g2Y + 3} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">
                      LS 2 ({gate2DistM.toFixed(1).replace('.', ',')} m)
                    </text>

                    {/* Dropping Sphere */}
                    <circle
                      cx="210"
                      cy={ballY}
                      r={ballRadius}
                      fill={profile.skyColors.accent}
                      stroke="#ffffff"
                      strokeWidth="1.8"
                    />
                  </g>
                );
              })()}

              {/* Right Panel: Pure Laboratory Instrument Readout (No formula hints!) */}
              <g transform="translate(345, 22)">
                <rect
                  x="0"
                  y="0"
                  width="495"
                  height="316"
                  rx="12"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                  opacity="0.96"
                />

                <text x="20" y="28" fill="#38bdf8" fontSize="14" fontWeight="bold">
                  {profile.codeName}: {profile.sectorTitle.toUpperCase()}
                </text>
                <text x="20" y="45" fill="#94a3b8" fontSize="10">
                  Digitales Lichtschranken-Zeitmessgerät (Auflösung: 1 ms = 0,001 s)
                </text>
                <line x1="20" y1="55" x2="475" y2="55" stroke="#1e293b" strokeWidth="1.5" />

                {/* 3 Raw Instrument Readout Cards */}
                <g transform="translate(20, 70)">
                  {/* Card 1: Messstrecke s2 */}
                  <rect x="0" y="0" width="142" height="74" rx="8" fill="#1e293b" stroke="#334155" />
                  <text x="12" y="19" fill="#94a3b8" fontSize="9.5" fontWeight="bold">
                    FALLSTRECKE s<tspan dy="2" fontSize="7.5">2</tspan>
                  </text>
                  <text x="12" y="48" fill="#38bdf8" fontSize="20" fontWeight="bold">
                    {gate2DistM.toFixed(2).replace('.', ',')} m
                  </text>
                  <text x="12" y="64" fill="#64748b" fontSize="8.5">
                    Abstand LS 1 → LS 2
                  </text>

                  {/* Card 2: Kugelmasse m */}
                  <g transform="translate(156, 0)">
                    <rect x="0" y="0" width="142" height="74" rx="8" fill="#1e293b" stroke="#334155" />
                    <text x="12" y="19" fill="#94a3b8" fontSize="9.5" fontWeight="bold">
                      KUGELMASSE m
                    </text>
                    <text x="12" y="48" fill="#e2e8f0" fontSize="20" fontWeight="bold">
                      {dropMassKg.toFixed(1).replace('.', ',')} kg
                    </text>
                    <text x="12" y="64" fill="#64748b" fontSize="8.5">
                      {tubeMode === 'vacuum' ? 'Röhre: Evakuiert (0 mbar)' : 'Röhre: Luft (1 013 mbar)'}
                    </text>
                  </g>

                  {/* Card 3: Gemessene Fallzeit t2 */}
                  <g transform="translate(312, 0)">
                    <rect
                      x="0"
                      y="0"
                      width="143"
                      height="74"
                      rx="8"
                      fill="#1e293b"
                      stroke={gate2Triggered ? '#10b981' : '#f59e0b'}
                      strokeWidth="1.5"
                    />
                    <text x="12" y="19" fill="#fbbf24" fontSize="9.5" fontWeight="bold">
                      STOPPUHR LS 2 (t<tspan dy="2" fontSize="7.5">2</tspan>)
                    </text>
                    <text
                      x="12"
                      y="48"
                      fill={gate2Triggered ? '#34d399' : '#fbbf24'}
                      fontSize="20"
                      fontWeight="bold"
                    >
                      {displayStopwatchS !== null
                        ? `${displayStopwatchS.toFixed(3).replace('.', ',')} s`
                        : '— s'}
                    </text>
                    <text x="12" y="64" fill="#94a3b8" fontSize="8.5">
                      {gate2Triggered ? '✓ Messwert gespeichert' : 'Wartet auf Abwurf'}
                    </text>
                  </g>
                </g>

                {/* Laboratory Notes Box inside SVG */}
                <g transform="translate(20, 162)">
                  <rect x="0" y="0" width="455" height="134" rx="8" fill="#020617" stroke="#1e293b" />
                  <text x="14" y="22" fill="#22d3ee" fontSize="10.5" fontWeight="bold">
                    📋 HINWEISE ZUR MESSAPPARATUR (REALER LABORBETRIEB):
                  </text>
                  <text x="14" y="44" fill="#cbd5e1" fontSize="9.5">
                    1. Wie bei jeder realen Lichtschranken-Messung unterliegt die Zeitmessung t<tspan dy="2" fontSize="7.5">2</tspan><tspan dy="-2"> einer kleinen</tspan>
                  </text>
                  <text x="26" y="59" fill="#cbd5e1" fontSize="9.5">
                    statistischen Messstreuung (wenige Millisekunden). Führe daher stets Mehrfachmessungen
                  </text>
                  <text x="26" y="74" fill="#cbd5e1" fontSize="9.5">
                    durch und bilde den arithmetischen Mittelwert t̄<tspan dy="2" fontSize="7.5">2</tspan><tspan dy="-2">!</tspan>
                  </text>
                  <text x="14" y="96" fill="#cbd5e1" fontSize="9.5">
                    2. Der elektromagnetische Kugelhalter an LS 1 besitzt beim Abschalten des Spulenstroms
                  </text>
                  <text x="26" y="111" fill="#cbd5e1" fontSize="9.5">
                    eine kleine mechanische Auslöseverzögerung (beachte dies in Teilaufgabe 3!).
                  </text>
                </g>
              </g>
            </svg>
          </div>

          {/* Controls & Sliders */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div className="lg:col-span-5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleStartDrop}
                disabled={isDropping}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Play size={16} />
                <span>{isDropping ? 'Kugel fällt...' : 'Kugel abwerfen (Messung starten)'}</span>
              </button>

              <button
                onClick={handleResetBall}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Zurück an LS 1</span>
              </button>
            </div>

            <div className="lg:col-span-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Position Lichtschranke 2 (Fallstrecke <i>s</i>₂):</span>
                <span className="font-mono font-bold text-cyan-400">{gate2DistM.toFixed(1).replace('.', ',')} m</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.5}
                value={gate2DistM}
                onChange={(e) => {
                  handleResetBall();
                  setGate2DistM(Number(e.target.value));
                }}
              />
            </div>

            <div className="lg:col-span-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Kugelmasse <i>m</i>:</span>
                <span className="font-mono font-bold text-amber-400">{dropMassKg.toFixed(1).replace('.', ',')} kg</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={5.0}
                step={0.1}
                value={dropMassKg}
                onChange={(e) => {
                  handleResetBall();
                  setDropMassKg(Number(e.target.value));
                }}
              />
            </div>
          </div>

          {/* Raw Recorded Measurements Table */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>📊 Automatisch erfasste Roh-Messwerte ({measurements.length} Abwürfe)</span>
              </h3>
              {measurements.length > 0 && (
                <button
                  onClick={() => setMeasurements([])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-[11px] cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Tabelle leeren</span>
                </button>
              )}
            </div>

            {measurements.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Noch keine Abwürfe durchgeführt. Klicke auf „Kugel abwerfen“, um Messwerte aufzunehmen.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-2.5">#</th>
                      <th className="py-2 px-2.5">Zeitpunkt</th>
                      <th className="py-2 px-2.5">Station</th>
                      <th className="py-2 px-2.5">Röhre</th>
                      <th className="py-2 px-2.5">Masse <i>m</i></th>
                      <th className="py-2 px-2.5 text-cyan-300">Fallstrecke <i>s</i>₂</th>
                      <th className="py-2 px-2.5 text-amber-300">Gemessene Fallzeit <i>t</i>₂</th>
                      <th className="py-2 px-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {measurements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-2.5 text-slate-400">{m.trialNumber}</td>
                        <td className="py-1.5 px-2.5 text-slate-400">{m.timestamp}</td>
                        <td className="py-1.5 px-2.5 uppercase">{m.stationId}</td>
                        <td className="py-1.5 px-2.5">
                          {m.tubeMode === 'vacuum' ? (
                            <span className="text-cyan-300">Vakuum</span>
                          ) : (
                            <span className="text-amber-300">Luft (1 013 mbar)</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5">{m.massKg.toFixed(1).replace('.', ',')} kg</td>
                        <td className="py-1.5 px-2.5 text-cyan-300 font-bold">
                          {m.distanceM.toFixed(1).replace('.', ',')} m
                        </td>
                        <td className="py-1.5 px-2.5 text-amber-300 font-bold">
                          {m.measuredTimeS.toFixed(3).replace('.', ',')} s
                        </td>
                        <td className="py-1.5 px-2.5 text-right">
                          <button
                            onClick={() =>
                              setMeasurements((prev) => prev.filter((x) => x.id !== m.id))
                            }
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Messung löschen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Exam Protocol Tasks (AI-Resistant, Bound to Student's Own Session Measurements) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-2">
                <FileText className="text-cyan-400" size={20} />
                <span>3. Prüfungsprotokoll &amp; Auswertungsaufgaben ({profile.codeName})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Alle Antworten müssen zwingend mit deinen oben aufgenommenen Messwerten aus deiner Tabelle begründet werden.
              </p>
            </div>
          </div>

          {/* Task 1 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-cyan-400">
              Aufgabe 1: Messreihe im Vakuum, Mittelwertbildung &amp; Bestimmung des Ortsfaktors <i>g</i>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wähle im <strong>Vakuum (0 mbar)</strong> drei unterschiedliche Fallstrecken{' '}
              <i>s</i>₂ (z. B. <span className="font-mono">1,5 m</span>, <span className="font-mono">3,0 m</span> und{' '}
              <span className="font-mono">4,5 m</span>). Führe für jede Fallstrecke <strong>3 Wiederholungsmessungen</strong> durch, berechne den Mittelwert{' '}
              <i>t̄</i>₂ und bestimme daraus mit dem Weg-Zeit-Gesetz des freien Falls jeweils die Fallbeschleunigung{' '}
              <i>g</i><sub>exp</sub>.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2">Fallstrecke <i>s</i>₂ (in m)</th>
                    <th className="p-2">Messung 1: <i>t</i><sub>2,1</sub> (in s)</th>
                    <th className="p-2">Messung 2: <i>t</i><sub>2,2</sub> (in s)</th>
                    <th className="p-2">Messung 3: <i>t</i><sub>2,3</sub> (in s)</th>
                    <th className="p-2 text-cyan-300">Mittelwert <i>t̄</i>₂ (in s)</th>
                    <th className="p-2 text-amber-300">Berechnetes <i>g</i><sub>exp</sub> (in m/s²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {([0, 1, 2] as const).map((idx) => (
                    <tr key={idx}>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={task1Series[idx].distanceM}
                          onChange={(e) => updateSeriesField(idx, 'distanceM', e.target.value)}
                          placeholder="z.B. 1,5"
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={task1Series[idx].t1S}
                          onChange={(e) => updateSeriesField(idx, 't1S', e.target.value)}
                          placeholder="0,..."
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={task1Series[idx].t2S}
                          onChange={(e) => updateSeriesField(idx, 't2S', e.target.value)}
                          placeholder="0,..."
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={task1Series[idx].t3S}
                          onChange={(e) => updateSeriesField(idx, 't3S', e.target.value)}
                          placeholder="0,..."
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={task1Series[idx].meanTimeS}
                          onChange={(e) => updateSeriesField(idx, 'meanTimeS', e.target.value)}
                          placeholder="t̄₂"
                          className="w-24 bg-slate-900 border border-cyan-500/40 rounded-lg px-2 py-1 text-cyan-300 font-bold outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={task1Series[idx].calculatedG}
                          onChange={(e) => updateSeriesField(idx, 'calculatedG', e.target.value)}
                          placeholder="g_exp"
                          className="w-28 bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-amber-300 font-bold outline-none focus:border-amber-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-200">
                Dein ermittelter Ortsfaktor für {profile.sectorTitle}:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-1.5">
                <span className="text-xs font-mono font-bold text-amber-400"><i>g</i> =</span>
                <input
                  type="text"
                  value={finalStudentG}
                  onChange={(e) => setFinalStudentG(e.target.value)}
                  placeholder="z.B. 5,42"
                  className="w-24 bg-transparent text-xs font-mono font-extrabold text-amber-300 outline-none text-right"
                />
                <span className="text-xs font-mono text-slate-400">m/s²</span>
              </div>
            </div>
          </div>

          {/* Task 2 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-amber-400">
              Aufgabe 2: Untersuchung der Massenunabhängigkeit (Vakuum vs. belüftete Fallröhre)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Stelle die Fallstrecke fest auf <span className="font-mono text-cyan-300"><i>s</i>₂ = 4,0 m</span> ein. Miss die Fallzeit{' '}
              <i>t</i>₂ für eine sehr leichte Kugel (<span className="font-mono"><i>m</i>₁ = 0,1 kg</span>) und eine schwere Kugel (<span className="font-mono"><i>m</i>₂ = 5,0 kg</span>) sowohl im <strong>Vakuum (0 mbar)</strong> als auch in der <strong>belüfteten Röhre (1 013 mbar)</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <label className="block text-slate-400 text-[11px] mb-1">
                  1. Vakuum • leichte Kugel (0,1 kg):
                </label>
                <div className="flex items-center gap-1 font-mono">
                  <span><i>t</i>₂ =</span>
                  <input
                    type="text"
                    value={task2VacuumLightTimeS}
                    onChange={(e) => setTask2VacuumLightTimeS(e.target.value)}
                    placeholder="0,..."
                    className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                  />
                  <span>s</span>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <label className="block text-slate-400 text-[11px] mb-1">
                  2. Vakuum • schwere Kugel (5,0 kg):
                </label>
                <div className="flex items-center gap-1 font-mono">
                  <span><i>t</i>₂ =</span>
                  <input
                    type="text"
                    value={task2VacuumHeavyTimeS}
                    onChange={(e) => setTask2VacuumHeavyTimeS(e.target.value)}
                    placeholder="0,..."
                    className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                  />
                  <span>s</span>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <label className="block text-amber-300/90 text-[11px] mb-1">
                  3. Mit Luft • leichte Kugel (0,1 kg):
                </label>
                <div className="flex items-center gap-1 font-mono">
                  <span><i>t</i>₂ =</span>
                  <input
                    type="text"
                    value={task2AirLightTimeS}
                    onChange={(e) => setTask2AirLightTimeS(e.target.value)}
                    placeholder="0,..."
                    className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                  />
                  <span>s</span>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <label className="block text-amber-300/90 text-[11px] mb-1">
                  4. Mit Luft • schwere Kugel (5,0 kg):
                </label>
                <div className="flex items-center gap-1 font-mono">
                  <span><i>t</i>₂ =</span>
                  <input
                    type="text"
                    value={task2AirHeavyTimeS}
                    onChange={(e) => setTask2AirHeavyTimeS(e.target.value)}
                    placeholder="0,..."
                    className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                  />
                  <span>s</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Auswertung &amp; Begründung anhand deiner Messstreuung:
              </label>
              <p className="text-[11px] text-slate-400 mb-1.5">
                Vergleiche die Zeitdifferenz Δ<i>t</i> zwischen 0,1 kg und 5,0 kg im Vakuum mit der typischen Spannweite (Streuung) deiner Dreifachmessungen aus Aufgabe 1. Begründe mit deinen Zahlenwerten, warum die Messung im Vakuum die Massenunabhängigkeit bestätigt, während in der belüfteten Röhre ein echter physikalischer Unterschied auftritt!
              </p>
              <textarea
                rows={3}
                value={task2Reasoning}
                onPaste={() => setPasteCount((c) => c + 1)}
                onChange={(e) => setTask2Reasoning(e.target.value)}
                placeholder="Begründe hier konkret mit deinen gemessenen Zeitdifferenzen (in ms)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Task 3 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-purple-400">
              Aufgabe 3: Systematische Fehleranalyse bei sehr kurzer Fallstrecke (<i>s</i>₂ = 0,5 m)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Stelle Lichtschranke 2 im Vakuum auf die kürzeste Fallstrecke{' '}
              <span className="font-mono text-cyan-300"><i>s</i>₂ = 0,5 m</span> ein. Führe 3 Messungen durch, bilde den Mittelwert{' '}
              <i>t̄</i>₂(0,5 m) und berechne daraus den scheinbaren Ortsfaktor <i>g</i><sub>exp</sub>(0,5 m):
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono">
                <span className="text-slate-300">Mittelwert <i>t̄</i>₂(0,5 m) =</span>
                <input
                  type="text"
                  value={task3ShortDistMeanTimeS}
                  onChange={(e) => setTask3ShortDistMeanTimeS(e.target.value)}
                  placeholder="0,..."
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                />
                <span>s</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono">
                <span className="text-purple-300">Berechnetes <i>g</i><sub>exp</sub>(0,5 m) =</span>
                <input
                  type="text"
                  value={task3ShortDistG}
                  onChange={(e) => setTask3ShortDistG(e.target.value)}
                  placeholder="z.B. ..."
                  className="w-24 bg-slate-950 border border-purple-500/40 rounded px-2 py-1 text-purple-300 font-bold outline-none"
                />
                <span>m/s²</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Physikalische Fehlererklärung:
              </label>
              <p className="text-[11px] text-slate-400 mb-1.5">
                Vergleiche <i>g</i><sub>exp</sub>(0,5 m) mit deinen Werten bei großen Fallstrecken aus Aufgabe 1. Erkläre, warum die kleine Auslöseverzögerung des Haltemagneten an LS 1 dazu führt, dass der berechnete Wert für <i>g</i> bei 0,5 m systematisch kleiner ausfällt als bei 4,5 m!
              </p>
              <textarea
                rows={3}
                value={task3Reasoning}
                onPaste={() => setPasteCount((c) => c + 1)}
                onChange={(e) => setTask3Reasoning(e.target.value)}
                placeholder="Erkläre den Einfluss der Haltemagnet-Verzögerung auf kurze vs. lange Fallzeiten..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Task 4: Photo Upload of Handwritten Formula Derivation & s(t)/v(t) Sketch */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Camera size={16} />
                  <span>Aufgabe 4: Foto-Upload deines handschriftlichen Rechenwegs &amp; der Diagramm-Skizze</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Schreibe auf ein Blatt Papier: (1) das Weg-Zeit-Gesetz des freien Falls und die Umstellung nach <i>g</i>, (2) eine vollständige Beispielrechnung mit deinen Messwerten und Einheiten sowie (3) eine Skizze des{' '}
                  <i>s</i>(<i>t</i>)- und <i>v</i>(<i>t</i>)-Diagramms. Lade hier 1–3 Fotos davon hoch:
                </p>
              </div>

              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/20">
                <Upload size={15} />
                <span>📷 Foto aufnehmen / Bilddatei wählen</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {photos.map((ph) => (
                  <div key={ph.id} className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 space-y-2">
                    <img
                      src={ph.dataUrl}
                      alt={ph.caption}
                      className="w-full h-44 object-contain bg-black rounded-lg"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={ph.caption}
                        onChange={(e) =>
                          setPhotos((prev) =>
                            prev.map((x) => (x.id === ph.id ? { ...x, caption: e.target.value } : x))
                          )
                        }
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                      />
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== ph.id))}
                        className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="Foto entfernen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission Bar */}
          <div className="bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 border border-cyan-500/40 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-100">
                Fertig mit allen Messungen und Aufgaben?
              </h4>
              <p className="text-xs text-slate-300">
                Mit einem Klick auf <strong>„Protokoll jetzt online abgeben“</strong> wird dein gesamtes Protokoll direkt an deine Lehrkraft übermittelt.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => downloadSubmissionAsJson(buildCurrentSubmission())}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                title="Speichert eine Sicherheitskopie deines Protokolls als Datei"
              >
                <Download size={14} />
                <span>Backup-Datei (.json)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Printer size={14} />
                <span>Drucken / PDF</span>
              </button>

              <button
                onClick={handleOnlineSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-500/25 cursor-pointer"
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Wird übertragen...' : '🚀 Protokoll jetzt online abgeben'}</span>
              </button>
            </div>
          </div>

          {/* Confirmation Banner after Upload */}
          {submitStatus && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                submitStatus.ok
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
              }`}
            >
              {submitStatus.ok ? (
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <div className="font-bold text-sm">{submitStatus.message}</div>
                <div className="font-mono text-[11px]">
                  Abgabe-Zeitpunkt: <strong>{submitStatus.time}</strong> • Verifikations-Code:{' '}
                  <strong className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/30">
                    {submitStatus.code}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <TeacherInboxModal isOpen={showTeacherModal} onClose={() => setShowTeacherModal(false)} />
    </div>
  );
};

export default App;
