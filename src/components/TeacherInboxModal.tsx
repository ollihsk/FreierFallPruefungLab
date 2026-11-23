import React, { useState, useEffect } from 'react';
import {
  ExamProtocolSubmission,
  EXAM_STATION_PROFILES,
  evaluateStudentSubmission,
} from '../physics/freeFallExamEngine';
import {
  fetchAllProtocolsForTeacher,
  deleteProtocolAsTeacher,
  saveLocalSubmission,
  uploadProtocolToServer,
} from '../utils/protocolApi';
import {
  GraduationCap,
  X,
  RefreshCw,
  Trash2,
  Printer,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface TeacherInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherInboxModal: React.FC<TeacherInboxModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<ExamProtocolSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromServer, setFromServer] = useState<boolean>(false);

  const loadProtocols = async (activePin: string) => {
    setLoading(true);
    setAuthError(null);
    const res = await fetchAllProtocolsForTeacher(activePin);
    setLoading(false);
    if (!res.ok) {
      setAuthError(res.error || 'Zugriff verweigert.');
      return;
    }
    setIsUnlocked(true);
    setSubmissions(res.submissions);
    setFromServer(res.fromServer);
    if (res.submissions.length > 0 && !selectedId) {
      setSelectedId(res.submissions[0].submissionId);
    }
  };

  useEffect(() => {
    if (isOpen && isUnlocked && pin) {
      loadProtocols(pin);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedSub = submissions.find((s) => s.submissionId === selectedId) || submissions[0] || null;
  const evaluation = selectedSub ? evaluateStudentSubmission(selectedSub) : null;
  const profile = selectedSub
    ? EXAM_STATION_PROFILES[selectedSub.stationId] || EXAM_STATION_PROFILES.alpha
    : null;

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ExamProtocolSubmission;
        if (parsed && parsed.studentName && Array.isArray(parsed.measurements)) {
          saveLocalSubmission(parsed);
          await uploadProtocolToServer(parsed);
          setSubmissions((prev) => {
            const filtered = prev.filter((s) => s.submissionId !== parsed.submissionId);
            return [parsed, ...filtered];
          });
          setSelectedId(parsed.submissionId);
        } else {
          alert('Ungültige Protokolldatei.');
        }
      } catch {
        alert('JSON-Datei konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                <span>📬 Lehrer-Cockpit: Abgerufene Prüfungsprotokolle (Freier Fall)</span>
                {isUnlocked && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                      fromServer
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {fromServer ? '✓ Zentraler SchoolLabs-Server aktiv' : '⚠️ Nur lokaler Browser-Speicher'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Automatischer Soll-Ist-Abgleich der 3 Prüflings-Stationen (Alpha, Beta, Gamma) &amp; Plausibilitätsprüfung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* PIN Login View */}
        {!isUnlocked ? (
          <div className="p-8 max-w-md mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldCheck size={28} />
            </div>
            <h4 className="font-bold text-base text-slate-100">Lehrer-Authentifizierung</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gib die Lehrer-PIN ein, um die eingegangenen Prüfungsprotokolle deiner Schüler sowie die wahren Stations-Ortsfaktoren{' '}
              <i>g</i><sub>wahr</sub> abzurufen.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadProtocols(pin);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Lehrer-PIN..."
                autoFocus
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-center font-mono text-slate-100 focus:border-amber-400 outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {loading ? 'Lädt...' : 'Freischalten'}
              </button>
            </form>
            {authError && <p className="text-xs text-rose-400 font-semibold">{authError}</p>}
          </div>
        ) : (
          /* Unlocked Teacher Inbox */
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {!fromServer && (
              <div className="bg-amber-950/50 border border-amber-500/50 rounded-xl p-3.5 text-amber-200 flex items-start gap-2.5 no-print">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-amber-300">
                    Wichtig: SchoolLabs-Hauptserver einmal aktualisieren &amp; neu starten!
                  </strong>
                  <p className="text-[11px] leading-relaxed">
                    Die zentrale Server-Schnittstelle (<code className="text-amber-300">/api/exam-protocols</code>) antwortet auf deinem SchoolLabs-Server noch nicht, weil der SchoolLabs-Hauptserver nach dem GitHub-Update noch nicht neu gestartet wurde. Öffne in <strong>SchoolLabs</strong> einmal den Tab <strong>„Server-Verwaltung“</strong> und klicke auf <strong>„Update installieren“ + „Server neu starten“</strong> – danach werden alle Abgaben aus Inkognito-Tabs und von Schülergeräten zentral auf dem Server gespeichert!
                  </p>
                </div>
              </div>
            )}

            {/* Reference Cheat Sheet for the 3 Stations */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block">
                  🔑 Referenzwerte der 3 Prüfungsstationen (für Schüler unsichtbar):
                </span>
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-200">
                  <span>
                    <strong className="text-sky-400">Prüfling A (Alpha-1):</strong>{' '}
                    <i>g</i><sub>wahr</sub> = 4,65 m/s² (Δ<i>t</i><sub>Magnet</sub> = +18 ms)
                  </span>
                  <span>
                    <strong className="text-purple-400">Prüfling B (Beta-2):</strong>{' '}
                    <i>g</i><sub>wahr</sub> = 6,35 m/s² (Δ<i>t</i><sub>Magnet</sub> = +16 ms)
                  </span>
                  <span>
                    <strong className="text-emerald-400">Prüfling C (Gamma-3):</strong>{' '}
                    <i>g</i><sub>wahr</sub> = 11,85 m/s² (Δ<i>t</i><sub>Magnet</sub> = +14 ms)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadProtocols(pin)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Aktualisieren</span>
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-500/40 cursor-pointer">
                  <Upload size={13} />
                  <span>JSON-Protokoll importieren</span>
                  <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
                </label>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="p-10 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                <FileText size={32} className="text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-slate-300">
                  Noch keine abgegebenen Prüfungsprotokolle vorhanden
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Sobald deine Schüler im Protokoll-Fenster auf „🚀 Protokoll jetzt online bei Lehrkraft abgeben“ klicken, erscheinen ihre Abgaben hier automatisch.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Sidebar: Student Submissions List (3 cols) */}
                <div className="lg:col-span-3 space-y-2 no-print">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] block">
                    Eingegangene Abgaben ({submissions.length})
                  </span>
                  {submissions.map((sub) => {
                    const active = selectedSub?.submissionId === sub.submissionId;
                    const stProf = EXAM_STATION_PROFILES[sub.stationId] || EXAM_STATION_PROFILES.alpha;
                    return (
                      <button
                        key={sub.submissionId}
                        onClick={() => setSelectedId(sub.submissionId)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                          active
                            ? 'bg-cyan-950/50 border-cyan-400 text-slate-100 shadow-lg'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{sub.studentName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                            {stProf.codeName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>{sub.measurements.length} Messungen</span>
                          <span><i>g</i> = {sub.finalStudentG || '—'} m/s²</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(sub.submittedAt).toLocaleString('de-DE')}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Detail Panel: Full Graded Protocol (9 cols) */}
                {selectedSub && evaluation && profile && (
                  <div className="lg:col-span-9 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
                    {/* Top Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-extrabold text-slate-100">
                            {selectedSub.studentName}
                          </h4>
                          {selectedSub.schoolClass && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-cyan-300 font-bold">
                              Klasse {selectedSub.schoolClass}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                            {profile.codeName} ({profile.sectorTitle})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Abgegeben: {new Date(selectedSub.submittedAt).toLocaleString('de-DE')} • Signatur:{' '}
                          {selectedSub.verificationCode}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 no-print">
                        <button
                          onClick={() => window.print()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          <Printer size={14} />
                          <span>Drucken / PDF</span>
                        </button>
                        <button
                          onClick={async () => {
                            await deleteProtocolAsTeacher(selectedSub.submissionId, pin);
                            setSubmissions((prev) =>
                              prev.filter((s) => s.submissionId !== selectedSub.submissionId)
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>Löschen</span>
                        </button>
                      </div>
                    </div>

                    {/* Automatic Teacher Soll-Ist & Anti-AI Plausibility Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">
                          Wahrer Ortsfaktor <i>g</i><sub>wahr</sub> ({profile.codeName})
                        </span>
                        <span className="text-base font-extrabold font-mono text-amber-400">
                          {evaluation.trueStationG.toFixed(2).replace('.', ',')} m/s²
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Erwartet bei 4 m: {evaluation.expectedGAt4mVacuum.toFixed(2).replace('.', ',')} m/s²
                        </span>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">
                          Aus Schülertabelle berechnet (<i>g</i><sub>Tab</sub>)
                        </span>
                        <span className="text-base font-extrabold font-mono text-cyan-400">
                          {evaluation.empiricalMeanGFromStudentTable !== null
                            ? `${evaluation.empiricalMeanGFromStudentTable.toFixed(2).replace('.', ',')} m/s²`
                            : 'Keine Vakuum-Daten'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Erwartet bei 0,5 m: {evaluation.expectedGAt05mVacuum.toFixed(2).replace('.', ',')} m/s²
                        </span>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">
                          Vom Schüler eingetragen (<i>g</i><sub>Schüler</sub>)
                        </span>
                        <span className="text-base font-extrabold font-mono text-emerald-400">
                          {selectedSub.finalStudentG ? `${selectedSub.finalStudentG} m/s²` : 'Nicht eingetragen'}
                        </span>
                        {evaluation.deviationFromTablePercent !== null && (
                          <span className="text-[10px] text-slate-300 block mt-0.5">
                            Abw. zur eigenen Tabelle:{' '}
                            <strong>{evaluation.deviationFromTablePercent.toFixed(1).replace('.', ',')} %</strong>
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> Prüfungs-Integrität
                        </span>
                        <div className="text-[11px] font-mono text-slate-200">
                          Dauer: {Math.floor(selectedSub.timeSpentSeconds / 60)}m {selectedSub.timeSpentSeconds % 60}s
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span
                            className={
                              selectedSub.focusLossCount === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'
                            }
                          >
                            Tab-Wechsel: {selectedSub.focusLossCount}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              (selectedSub.pasteCount || 0) === 0
                                ? 'text-emerald-400 font-bold'
                                : 'text-rose-400 font-bold'
                            }
                          >
                            Copy-Paste: {selectedSub.pasteCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Experimental Coverage Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                          evaluation.vacuumTrialsCount >= 9
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {evaluation.vacuumTrialsCount >= 9 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        Vakuum-Messungen: {evaluation.vacuumTrialsCount} (Soll ≥ 9)
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                          evaluation.airTrialsCount >= 2
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {evaluation.airTrialsCount >= 2 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        Luftwiderstands-Vergleich: {evaluation.airTrialsCount} (Soll ≥ 2)
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                          evaluation.shortDistTrialsCount >= 1
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {evaluation.shortDistTrialsCount >= 1 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        0,5-m-Kurzstrecken-Test: {evaluation.shortDistTrialsCount}
                      </span>
                    </div>

                    {/* Student Answers to Task 1, 2, 3 */}
                    <div className="space-y-4">
                      {/* Task 1 */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                        <h5 className="font-bold text-cyan-400">
                          Aufgabe 1: Auswertung der 3 Fallstrecken (Mittelwerte &amp; <i>g</i><sub>exp</sub>)
                        </h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400">
                                <th className="py-1.5 px-2">Fallstrecke s₂</th>
                                <th className="py-1.5 px-2">t₂,₁ (s)</th>
                                <th className="py-1.5 px-2">t₂,₂ (s)</th>
                                <th className="py-1.5 px-2">t₂,₃ (s)</th>
                                <th className="py-1.5 px-2 text-cyan-300">Mittelwert t̄₂ (s)</th>
                                <th className="py-1.5 px-2 text-amber-300">Berechnetes g_exp (m/s²)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {selectedSub.task1Series.map((row, idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5 px-2 font-bold">{row.distanceM || '—'} m</td>
                                  <td className="py-1.5 px-2">{row.t1S || '—'}</td>
                                  <td className="py-1.5 px-2">{row.t2S || '—'}</td>
                                  <td className="py-1.5 px-2">{row.t3S || '—'}</td>
                                  <td className="py-1.5 px-2 text-cyan-300 font-bold">{row.meanTimeS || '—'}</td>
                                  <td className="py-1.5 px-2 text-amber-300 font-bold">{row.calculatedG || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Task 2 */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                        <h5 className="font-bold text-amber-400">
                          Aufgabe 2: Massenunabhängigkeit (0,2 kg vs. 5,0 kg) im Vakuum vs. belüfteter Röhre
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <div>Vakuum (0,2 kg): <strong>{selectedSub.task2VacuumLightTimeS || '—'} s</strong></div>
                          <div>Vakuum (5,0 kg): <strong>{selectedSub.task2VacuumHeavyTimeS || '—'} s</strong></div>
                          <div>Mit Luft (0,2 kg): <strong>{selectedSub.task2AirLightTimeS || '—'} s</strong></div>
                          <div>Mit Luft (5,0 kg): <strong>{selectedSub.task2AirHeavyTimeS || '—'} s</strong></div>
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                          {selectedSub.task2Reasoning || <span className="text-slate-500 italic">Keine Begründung eingetragen.</span>}
                        </p>
                      </div>

                      {/* Task 3 */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                        <h5 className="font-bold text-purple-400">
                          Aufgabe 3: Systematische Abweichung bei kurzer Fallstrecke (<i>s</i>₂ = 0,5 m)
                        </h5>
                        <div className="flex flex-wrap gap-4 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <div>Mittelwert t̄₂(0,5 m): <strong>{selectedSub.task3ShortDistMeanTimeS || '—'} s</strong></div>
                          <div>Berechnetes g_exp(0,5 m): <strong>{selectedSub.task3ShortDistG || '—'} m/s²</strong></div>
                          <div className="text-slate-400">
                            (Sollwert bei 0,5 m inkl. +{Math.round(profile.magnetDelayS * 1000)} ms Magnetverzug:{' '}
                            <strong className="text-purple-300">
                              {evaluation.expectedGAt05mVacuum.toFixed(2).replace('.', ',')} m/s²
                            </strong>)
                          </div>
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                          {selectedSub.task3Reasoning || <span className="text-slate-500 italic">Keine Fehleranalyse eingetragen.</span>}
                        </p>
                      </div>

                      {/* Task 4: Handwritten Photos */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <ImageIcon size={15} />
                          <span>Aufgabe 4: Hochgeladene Fotos (Handschriftlicher Rechenweg &amp; Diagramm-Skizze)</span>
                        </h5>
                        {selectedSub.photos && selectedSub.photos.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedSub.photos.map((ph) => (
                              <div key={ph.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                                <img
                                  src={ph.dataUrl}
                                  alt={ph.caption || ph.fileName}
                                  className="w-full max-h-96 object-contain rounded-lg bg-black"
                                />
                                <div className="text-[11px] text-slate-300 font-semibold px-1">
                                  {ph.caption || ph.fileName}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">Keine Fotos angehängt.</p>
                        )}
                      </div>

                      {/* Raw Photogate Measurement Log */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                        <h5 className="font-bold text-slate-200">
                          Vollständiges Rohdaten-Messprotokoll ({selectedSub.measurements.length} ausgelöste Abwürfe)
                        </h5>
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-left border-collapse text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400">
                                <th className="p-1.5">#</th>
                                <th className="p-1.5">Uhrzeit</th>
                                <th className="p-1.5">Röhre</th>
                                <th className="p-1.5">Masse m</th>
                                <th className="p-1.5">Fallstrecke s₂</th>
                                <th className="p-1.5 text-amber-300">Messzeit t₂</th>
                                <th className="p-1.5 text-slate-400">Kontrollwert 2·s₂/t₂² (nur Lehrer)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {selectedSub.measurements.map((m) => {
                                const gRow = (2 * m.distanceM) / (m.measuredTimeS * m.measuredTimeS);
                                return (
                                  <tr key={m.id}>
                                    <td className="p-1.5 text-slate-400">{m.trialNumber}</td>
                                    <td className="p-1.5 text-slate-400">{m.timestamp}</td>
                                    <td className="p-1.5">
                                      {m.tubeMode === 'vacuum' ? (
                                        <span className="text-cyan-300">Vakuum</span>
                                      ) : (
                                        <span className="text-amber-300">Luft (1013 mbar)</span>
                                      )}
                                    </td>
                                    <td className="p-1.5">{m.massKg.toFixed(1).replace('.', ',')} kg</td>
                                    <td className="p-1.5 font-bold">{m.distanceM.toFixed(1).replace('.', ',')} m</td>
                                    <td className="p-1.5 text-amber-300 font-bold">
                                      {m.measuredTimeS.toFixed(3).replace('.', ',')} s
                                    </td>
                                    <td className="p-1.5 text-slate-400">
                                      {gRow.toFixed(2).replace('.', ',')} m/s²
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
