import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { attendanceService } from '../services/attendance.service';

export function AttendanceStudent() {
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (scanning) {
      const startScanner = async () => {
        try {
          scannerRef.current = new Html5Qrcode('qr-reader');
          await scannerRef.current.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
              await handleScanSuccess(decodedText);
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (_errorMessage) => {
              /* Ignorar errores de frame intermedios de la cámara */
            },
          );
        } catch (err) {
          toast.error('No se pudo acceder a la cámara. Usa el ingreso manual.');
          setScanning(false);
        }
      };
      startScanner();
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, [scanning]);

  const handleScanSuccess = async (token: string) => {
    setScanning(false);
    try {
      await attendanceService.registerAttendance(token);
      toast.success('¡Asistencia registrada exitosamente!');
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Token inválido o expirado')
        : 'Token inválido o expirado';
      toast.error(msg);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await attendanceService.registerAttendance(manualToken);
      toast.success('¡Asistencia registrada exitosamente!');
      setManualToken('');
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Token inválido o expirado')
        : 'Token inválido o expirado';
      toast.error(msg);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Registrar Asistencia
      </h1>

      <div className="bg-vs-blue/10 border border-vs-blue/20 text-vs-blue p-4 rounded-xl mb-6 text-sm">
        <strong>Instrucciones:</strong> Pide a tu instructor que proyecte o muestre el código QR de
        la sesión. Luego, activa tu cámara para escanearlo.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark mb-4">
            Escanear QR
          </h2>
          {!scanning ? (
            <button
              onClick={() => setScanning(true)}
              className="w-full bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
            >
              Activar Cámara
            </button>
          ) : (
            <button
              onClick={() => setScanning(false)}
              className="w-full bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
            >
              Detener Cámara
            </button>
          )}
          {scanning && <div id="qr-reader" className="mt-4 w-full" />}
        </div>

        <form
          onSubmit={handleManualSubmit}
          className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col gap-4"
        >
          <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
            Ingreso Manual (Backup)
          </h2>
          <p className="text-sm text-lms-muted">
            Si no tienes cámara, pide al instructor el código de texto de la sesión.
          </p>
          <input
            className="bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-vs-blue"
            placeholder="Pega el código aquí..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-vs-green text-white py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
          >
            Registrar
          </button>
        </form>
      </div>
    </div>
  );
}
