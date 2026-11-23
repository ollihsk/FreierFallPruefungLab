import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import {
  calculatePhysicalFallTimeS,
  simulateRealisticPhotogateTimeS,
  evaluateStudentSubmission,
  EXAM_STATION_PROFILES,
} from './physics/freeFallExamEngine';

describe('FreierFallPruefungLab Physics & UI', () => {
  it('has 3 distinct anonymized student station profiles without planet spoilers', () => {
    expect(EXAM_STATION_PROFILES.alpha.trueG).toBeCloseTo(4.65);
    expect(EXAM_STATION_PROFILES.beta.trueG).toBeCloseTo(6.35);
    expect(EXAM_STATION_PROFILES.gamma.trueG).toBeCloseTo(11.85);
  });

  it('computes realistic fall times with systematic magnet release delay and air resistance', () => {
    // In vacuum, mass 0.1 kg and 5.0 kg have identical physical fall time
    const tVacLight = calculatePhysicalFallTimeS({
      stationId: 'alpha',
      distanceM: 4.0,
      massKg: 0.1,
      tubeMode: 'vacuum',
    });
    const tVacHeavy = calculatePhysicalFallTimeS({
      stationId: 'alpha',
      distanceM: 4.0,
      massKg: 5.0,
      tubeMode: 'vacuum',
    });
    expect(tVacLight).toBeCloseTo(tVacHeavy, 6);

    // In ventilated air, light ball (0.1 kg) takes noticeably longer than heavy ball (5.0 kg)
    const tAirLight = calculatePhysicalFallTimeS({
      stationId: 'alpha',
      distanceM: 4.0,
      massKg: 0.1,
      tubeMode: 'air',
    });
    const tAirHeavy = calculatePhysicalFallTimeS({
      stationId: 'alpha',
      distanceM: 4.0,
      massKg: 5.0,
      tubeMode: 'air',
    });
    expect(tAirLight).toBeGreaterThan(tAirHeavy + 0.04);

    // Photogate time includes systematic magnet delay and bounded jitter
    const tMeas1 = simulateRealisticPhotogateTimeS({
      stationId: 'beta',
      distanceM: 3.0,
      massKg: 1.0,
      tubeMode: 'vacuum',
      fixedJitterFactor: -0.6,
    });
    const tMeas2 = simulateRealisticPhotogateTimeS({
      stationId: 'beta',
      distanceM: 3.0,
      massKg: 1.0,
      tubeMode: 'vacuum',
      fixedJitterFactor: 0.6,
    });
    expect(tMeas2).toBeGreaterThan(tMeas1);
  });

  it('evaluates student submission accurately for the teacher dashboard', () => {
    const evalRes = evaluateStudentSubmission({
      submissionId: 'test_1',
      labId: 'freier-fall-pruefung',
      studentName: 'Max Mustermann',
      schoolClass: '10a',
      stationId: 'beta',
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: 900,
      focusLossCount: 0,
      pasteCount: 0,
      verificationCode: 'FF10-BET-1234-5678',
      measurements: [
        {
          id: '1',
          trialNumber: 1,
          timestamp: '10:00:00',
          stationId: 'beta',
          tubeMode: 'vacuum',
          massKg: 1.0,
          distanceM: 3.0,
          measuredTimeS: 0.988,
        },
      ],
      task1Series: [
        { distanceM: '1,5', t1S: '0,704', t2S: '0,700', t3S: '0,702', meanTimeS: '0,702', calculatedG: '6,09' },
        { distanceM: '3,0', t1S: '0,988', t2S: '0,990', t3S: '0,986', meanTimeS: '0,988', calculatedG: '6,15' },
        { distanceM: '4,5', t1S: '1,205', t2S: '1,209', t3S: '1,207', meanTimeS: '1,207', calculatedG: '6,18' },
      ],
      finalStudentG: '6,15',
      task2VacuumLightTimeS: '1,138',
      task2VacuumHeavyTimeS: '1,141',
      task2AirLightTimeS: '1,215',
      task2AirHeavyTimeS: '1,143',
      task2Reasoning: 'Differenz im Vakuum (3 ms) liegt innerhalb der Streuung.',
      task3ShortDistMeanTimeS: '0,414',
      task3ShortDistG: '5,83',
      task3Reasoning: 'Magnetverzug fällt bei kurzer Fallzeit stärker ins Gewicht.',
      photos: [],
      additionalNotes: '',
    });

    expect(evalRes.trueStationG).toBeCloseTo(6.35);
    expect(evalRes.studentSubmittedG).toBeCloseTo(6.15);
    expect(evalRes.empiricalMeanGFromStudentTable).not.toBeNull();
    expect(Math.abs(evalRes.deviationFromTablePercent!)).toBeLessThan(1.0);
  });

  it('renders spoiler-free UI with 3 student stations and teacher inbox modal', () => {
    render(<App />);

    expect(screen.getByText(/Prüfungsmodus \(Ohne Formelvorgabe\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PRÜFLING A/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PRÜFLING B/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PRÜFLING C/i).length).toBeGreaterThan(0);

    // Ensure no formula spoilers like "s(t) = ½ · g · t²" or "2·s₂ / t₂²" are rendered for the student
    expect(screen.queryByText(/2·s₂ \/ t₂²/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/9,81/i)).not.toBeInTheDocument();

    // Switch to Station Beta
    fireEvent.click(screen.getAllByText(/PRÜFLING B/i)[0]);
    expect(screen.getAllByText(/Sektor Beta-2/i).length).toBeGreaterThan(0);

    // Open Teacher Inbox Modal
    fireEvent.click(screen.getByText(/Lehrer-Abruf/i));
    expect(screen.getByText(/Lehrer-Authentifizierung/i)).toBeInTheDocument();
  });
});
