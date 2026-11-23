import { ExamProtocolSubmission } from '../physics/freeFallExamEngine';

const LAB_ID = 'freier-fall-pruefung';
const LOCAL_SUBMISSIONS_KEY = 'ff_exam_local_submissions_v1';

export function getLocalSubmissions(): ExamProtocolSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalSubmission(sub: ExamProtocolSubmission): void {
  try {
    const existing = getLocalSubmissions().filter((s) => s.submissionId !== sub.submissionId);
    const updated = [sub, ...existing].slice(0, 30);
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage quota errors
  }
}

export function deleteLocalSubmission(submissionId: string): void {
  try {
    if (submissionId === 'all') {
      localStorage.removeItem(LOCAL_SUBMISSIONS_KEY);
      return;
    }
    const existing = getLocalSubmissions().filter((s) => s.submissionId !== submissionId);
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(existing));
  } catch {
    // Ignore
  }
}

export async function uploadProtocolToServer(
  submission: ExamProtocolSubmission
): Promise<{ ok: boolean; mode: 'server' | 'local_fallback'; submissionId: string; message: string }> {
  saveLocalSubmission(submission);

  try {
    const response = await fetch(`/api/exam-protocols/${LAB_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ok: true,
        mode: 'server',
        submissionId: data.submissionId || submission.submissionId,
        message: 'Protokoll erfolgreich auf den SchoolLabs-Server hochgeladen! Deine Lehrkraft kann es jetzt direkt abrufen.',
      };
    }
  } catch {
    // Fall through to local fallback message
  }

  return {
    ok: true,
    mode: 'local_fallback',
    submissionId: submission.submissionId,
    message:
      'Protokoll lokal gespeichert. Bitte lade zusätzlich die Protokoll-Datei (.json) herunter, falls du offline arbeitest.',
  };
}

export async function fetchAllProtocolsForTeacher(
  teacherPin: string
): Promise<{ ok: boolean; submissions: ExamProtocolSubmission[]; fromServer: boolean; error?: string }> {
  const local = getLocalSubmissions();
  try {
    const response = await fetch(`/api/exam-protocols/${LAB_ID}`, {
      method: 'GET',
      headers: {
        'x-teacher-pin': teacherPin.trim(),
      },
    });

    if (response.status === 403) {
      return {
        ok: false,
        submissions: [],
        fromServer: false,
        error: 'Ungültige Lehrer-PIN (Standard-PIN: 2026 oder 1234).',
      };
    }

    if (response.ok) {
      const data = await response.json();
      const serverList: ExamProtocolSubmission[] = Array.isArray(data.submissions)
        ? data.submissions
        : [];
      const byId = new Map<string, ExamProtocolSubmission>();
      for (const s of [...serverList, ...local]) {
        if (s && s.submissionId && !byId.has(s.submissionId)) {
          byId.set(s.submissionId, s);
        }
      }
      const merged = Array.from(byId.values()).sort((a, b) =>
        String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))
      );
      return { ok: true, submissions: merged, fromServer: true };
    }
  } catch {
    // Server offline or local test mode
  }

  if (teacherPin.trim() !== '2026' && teacherPin.trim() !== '1234') {
    return {
      ok: false,
      submissions: [],
      fromServer: false,
      error: 'Ungültige Lehrer-PIN (Standard-PIN: 2026 oder 1234).',
    };
  }

  return {
    ok: true,
    submissions: local,
    fromServer: false,
  };
}

export async function deleteProtocolAsTeacher(
  submissionId: string,
  teacherPin: string
): Promise<boolean> {
  deleteLocalSubmission(submissionId);
  try {
    const response = await fetch(`/api/exam-protocols/${LAB_ID}/${encodeURIComponent(submissionId)}`, {
      method: 'DELETE',
      headers: {
        'x-teacher-pin': teacherPin.trim(),
      },
    });
    return response.ok;
  } catch {
    return true;
  }
}

export function downloadSubmissionAsJson(submission: ExamProtocolSubmission): void {
  const jsonStr = JSON.stringify(submission, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (submission.studentName || 'Pruefling').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `Pruefungsprotokoll_FreierFall_${safeName}_${submission.stationId.toUpperCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Bilddatei konnte nicht gelesen werden.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ungültiges Bildformat.'));
      img.onload = () => {
        const maxDim = 1100;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
