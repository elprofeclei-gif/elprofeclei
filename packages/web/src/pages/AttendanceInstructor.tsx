import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { attendanceService } from '../services/attendance.service';
import { sessionsService, type SessionView } from '../services/sessions.service';

export function AttendanceInstructor() {
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    sessionsService.getMySessions().then(setSessions).catch(console.error);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await attendanceService.generateQrToken(selectedSessionId);
      setToken(data.token);
      toast.success('QR generado. Válido por 5 minutos.');
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Error al generar QR')
        : 'Error al generar QR';
      toast.error(msg);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Control de Asistencia
      </h1>

      <form
        onSubmit={handleGenerate}
        className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col max-w-md gap-4 mb-8"
      >
        <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
          Generar QR de Sesión
        </h2>

        <label className="text-sm text-lms-muted">Selecciona la Sesión</label>
        <select
          className="bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-vs-blue"
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          required
        >
          <option value="">-- Seleccionar Sesión --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.cohort.course.title} - {s.title} ({new Date(s.startTime).toLocaleDateString()})
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
        >
          Generar Código
        </button>
      </form>

      {token && (
        <div className="bg-white dark:bg-lms-dark-card p-8 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center gap-8 max-w-3xl w-full">
          {/* Lado Izquierdo: QR */}
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-xl border-2 border-lms-border">
              <QRCodeSVG value={token} size={256} />
            </div>
            <p className="text-sm text-lms-muted">El código expirará en 5 minutos.</p>
          </div>

          {/* Lado Derecho: Código de texto */}
          <div className="flex-1 w-full">
            <h3 className="font-bold text-lms-text dark:text-lms-text-dark mb-4">
              Código de texto (Backup)
            </h3>
            <label className="text-sm text-lms-muted mb-2 block">
              Para estudiantes sin cámara:
            </label>
            <div className="flex flex-col gap-2">
              <textarea
                readOnly
                value={token}
                className="w-full bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-3 text-sm font-mono resize-none"
                rows={3}
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(token);
                  toast.success('Código copiado!');
                }}
                className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors text-sm w-full"
              >
                Copiar Código
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
