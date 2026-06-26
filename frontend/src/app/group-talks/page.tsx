'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CameraService } from '@/lib/utils/camera.service';
import { groupTalkApi } from '@/lib/services/group-talk-api.service';
import { equipmentDeliveryApi } from '@/lib/services/equipment-delivery-api.service';
import { formatChileanRut, isValidChileanRut } from '@/lib/utils/rut-validator';
import { ThemeHeader } from '@/components/common/ThemeHeader';

interface Attendee {
  rut: string;
  fullName: string;
  biometricType: 'FACE' | 'PALM';
  isException: boolean;
  witnessRut?: string;
  witnessFullName?: string;
  witnessSignatureBase64?: string;
}

export default function GroupTalksPage() {
  // Phase management: 'setup' | 'scanning' | 'witness' | 'submitting' | 'success'
  const [phase, setPhase] = useState<'setup' | 'scanning' | 'witness' | 'success'>('setup');
  const [talkTitle, setTalkTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('');

  // GPS & Geofencing
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Attendees list
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  // Current Worker Form
  const [workerRut, setWorkerRut] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [biometricType, setBiometricType] = useState<'FACE' | 'PALM'>('FACE');
  const [workerVerifyError, setWorkerVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Witness Form (Exception)
  const [witnessRut, setWitnessRut] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessSigError, setWitnessSigError] = useState<string | null>(null);

  // Active Camera Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Witness signature pad refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // General Loading & Error
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  // 1. Get GPS coordinates on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGpsBlocked(false);
        },
        (error) => {
          console.error('GPS error:', error);
          setGpsBlocked(true);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      setGpsBlocked(true);
    }
  }, []);

  // 2. Initialize and keep Camera Stream alive for continuous scan
  useEffect(() => {
    if (phase !== 'scanning' && phase !== 'witness') {
      if (stream) {
        CameraService.stopMediaStream(stream);
        setStream(null);
        setCameraReady(false);
      }
      return undefined;
    }

    const initCamera = async () => {
      try {
        if (!stream) {
          const mediaStream = await CameraService.requestCameraAccess();
          setStream(mediaStream);
        }
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara');
      }
    };

    initCamera();

    return () => {
      // Don't stop the camera stream during minor phase changes between 'scanning' and 'witness'
      // only clean up when fully unmounted or exiting the flow.
    };
  }, [phase]);

  // Bind stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!stream || !video) return undefined;

    let canceled = false;
    const handleMetadata = async () => {
      try {
        await video.play();
        if (!canceled) {
          setCameraReady(true);
        }
      } catch {
        if (!canceled) {
          setCameraError('No se pudo reproducir el video de la cámara');
        }
      }
    };

    video.srcObject = stream;
    video.addEventListener('loadedmetadata', handleMetadata);

    return () => {
      canceled = true;
      video.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [stream]);

  // 3. Initialize witness signature pad context
  useEffect(() => {
    if (phase === 'witness' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasSignature(false);
      }
    }
  }, [phase]);

  // Pointer event handlers for signature drawing
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Start registration looping
  const handleStartTalk = () => {
    if (!talkTitle.trim() || !speakerName.trim()) {
      alert('Por favor ingrese el título de la charla y el nombre del expositor.');
      return;
    }
    setPhase('scanning');
  };

  // Capture frame and verify worker identity
  const handleVerifyWorker = async () => {
    setWorkerVerifyError(null);
    if (!workerRut.trim() || !isValidChileanRut(workerRut)) {
      setWorkerVerifyError('Ingrese un RUT chileno válido');
      return;
    }

    if (!videoRef.current || !cameraReady) {
      setWorkerVerifyError('La cámara no está lista para capturar');
      return;
    }

    setIsVerifying(true);
    try {
      // Capture frame as base64 without stopping video stream
      const frameBase64 = CameraService.captureFrame(videoRef.current);

      const formattedRut = formatChileanRut(workerRut);

      // Verify identity using biometric verification API (verifies 1:1)
      const response = await equipmentDeliveryApi.verifyBiometric({
        rut: formattedRut,
        biometricType,
        biometricImageBase64: frameBase64,
      });

      if (response.verified) {
        // Add to list and play audio feedback or success state
        const name = response.workerFullName || 'Trabajador Biométrico';
        const newAttendee: Attendee = {
          rut: formattedRut,
          fullName: name,
          biometricType,
          isException: false,
        };
        setAttendees((prev) => [newAttendee, ...prev]);

        // Reset worker fields immediately for next worker
        setWorkerRut('');
        setBiometricType('FACE');
        alert(`✅ Verificación exitosa: ${name}`);
      } else {
        setWorkerVerifyError('La verificación biométrica falló. Intente de nuevo o use bypass por Testigo de Fe.');
      }
    } catch (err: any) {
      console.error(err);
      setWorkerVerifyError(err.response?.data?.message || 'Error al validar biometría');
    } finally {
      setIsVerifying(false);
    }
  };

  // Transition to witness exception flow
  const handleTriggerWitness = () => {
    if (!workerRut.trim() || !isValidChileanRut(workerRut)) {
      setWorkerVerifyError('Ingrese el RUT del trabajador antes de aplicar la excepción');
      return;
    }
    setPhase('witness');
  };

  // Confirm witness bypass
  const handleConfirmWitness = () => {
    setWitnessSigError(null);
    if (!workerName.trim()) {
      setWitnessSigError('Ingrese el nombre del trabajador');
      return;
    }
    if (!witnessName.trim() || !witnessRut.trim() || !isValidChileanRut(witnessRut)) {
      setWitnessSigError('Ingrese los datos del Testigo de Fe (RUT válido y nombre)');
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      setWitnessSigError('El testigo debe firmar en el recuadro');
      return;
    }

    const witnessSigBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];

    const newAttendee: Attendee = {
      rut: formatChileanRut(workerRut),
      fullName: workerName,
      biometricType,
      isException: true,
      witnessRut: formatChileanRut(witnessRut),
      witnessFullName: witnessName,
      witnessSignatureBase64: witnessSigBase64,
    };

    setAttendees((prev) => [newAttendee, ...prev]);

    // Reset loop forms and return to scan phase
    setWorkerRut('');
    setWorkerName('');
    setWitnessRut('');
    setWitnessName('');
    setPhase('scanning');
    alert('✅ Registro por Testigo de Fe guardado');
  };

  // Finalize talk and generate PDF
  const handleFinishTalk = async () => {
    if (attendees.length === 0) {
      alert('Debe registrar al menos un asistente para cerrar la charla.');
      return;
    }

    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const blob = await groupTalkApi.createGroupTalkDocument({
        title: talkTitle,
        speakerName,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        attendees: attendees.map((a) => ({
          rut: a.rut,
          fullName: a.fullName,
          biometricType: a.biometricType,
          isException: a.isException,
          witnessRut: a.witnessRut,
          witnessFullName: a.witnessFullName,
          witnessSignatureBase64: a.witnessSignatureBase64,
        })),
      });

      // Download PDF
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `acta-charla-${talkTitle.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setPdfDownloaded(true);
      setPhase('success');
    } catch (err) {
      console.error(err);
      setGlobalError('No fue posible generar el acta grupal. Compruebe la conexión o parámetros.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // GPS validation blocker
  if (gpsBlocked) {
    return (
      <div className="min-h-screen bg-bg-main text-text-main flex flex-col justify-center items-center p-4">
        <div className="max-w-md rounded-2xl border-4 border-danger bg-bg-card p-8 text-center text-text-main shadow-2xl">
          <p className="text-5xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-black text-danger">Acceso GPS Obligatorio</h1>
          <p className="mt-4 text-sm text-text-muted font-bold leading-relaxed">
            Por normativas de seguridad laboral y geofencing del proyecto, debe conceder permisos de localización
            para poder operar esta pantalla.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-secondary py-4.5 px-8 font-black text-lg text-white hover:bg-interactive-hover border-4 border-border transition active:scale-95"
          >
            Reintentar Permisos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main transition-colors duration-150">
      <ThemeHeader />

      <div className="mx-auto max-w-7xl w-full p-4 flex-1 flex flex-col justify-center">
        {/* Setup Phase */}
        {phase === 'setup' && (
          <div className="mx-auto max-w-xl w-full overflow-hidden rounded-2xl border-4 border-border bg-bg-card p-8 shadow-2xl">
            <span className="text-sm font-black uppercase tracking-[0.25em] text-secondary">✅ MODO PRODUCCIÓN</span>
            <h1 className="mt-2 text-3xl font-black text-text-main">Registro de Charla Grupal</h1>
            <p className="mt-2 text-sm text-text-muted font-bold">
              Configure la sesión para habilitar el escaneo en serie continuo de los trabajadores.
            </p>

            <div className="mt-6 space-y-4">
              <label className="flex flex-col gap-2 text-base font-black text-text-main">
                Título / Tema de la Charla
                <input
                  type="text"
                  value={talkTitle}
                  onChange={(e) => setTalkTitle(e.target.value)}
                  placeholder="Ej: Charla de inducción de seguridad general"
                  className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition font-bold"
                />
              </label>

              <label className="flex flex-col gap-2 text-base font-black text-text-main">
                Expositor / Prevencionista a cargo
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="Ej: Mario Rojas"
                  className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition font-bold"
                />
              </label>

              {coords && (
                <div className="rounded-xl border-4 border-border bg-bg-card p-3 text-sm text-text-main font-bold flex justify-between">
                  <span>🛰️ GPS Validado</span>
                  <span>
                    Lat: {coords.latitude.toFixed(4)} | Lon: {coords.longitude.toFixed(4)}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartTalk}
                className="mt-4 w-full rounded-xl bg-secondary py-4.5 px-6 font-black text-xl text-white hover:bg-interactive-hover active:scale-95 transition border-4 border-border"
              >
                Comenzar Charla Grupal
              </button>
            </div>
          </div>
        )}

        {/* Scanning & Witness loops */}
        {(phase === 'scanning' || phase === 'witness') && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] w-full">
            {/* Left: General info and attendee check-list */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border-4 border-border bg-bg-card p-6">
                <span className="text-sm uppercase tracking-wider text-secondary font-black">Tema Charla</span>
                <h2 className="text-2xl font-black text-text-main truncate">{talkTitle}</h2>
                <p className="text-sm text-text-muted font-bold">Dictada por: {speakerName}</p>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-t-4 border-border pt-4 bg-bg-card">
                  <div>
                    <p className="text-xs text-text-muted font-black uppercase">Total Asistentes</p>
                    <p className="text-2xl font-black text-text-main">{attendees.length}</p>
                  </div>
                  <button
                    onClick={handleFinishTalk}
                    disabled={attendees.length === 0 || globalLoading}
                    className="rounded-xl bg-success px-5 py-3.5 text-base font-black text-white hover:bg-green-600 transition border-4 border-border disabled:opacity-50"
                  >
                    {globalLoading ? '⏳ Generando...' : '📄 Finalizar y Emitir Acta'}
                  </button>
                </div>

                {globalError && (
                  <div className="mt-4 rounded-xl border-4 border-danger bg-bg-card p-3 text-sm text-text-main font-bold">
                    ❌ {globalError}
                  </div>
                )}
              </div>

              {/* Attendee register list */}
              <div className="flex-1 rounded-2xl border-4 border-border bg-bg-card p-6 flex flex-col">
                <h3 className="text-lg font-black text-text-main border-b-4 border-border pb-3">
                  Registro de Asistencia ({attendees.length})
                </h3>
                <div className="mt-4 flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1">
                  {attendees.length === 0 ? (
                    <p className="text-sm text-text-muted font-bold text-center py-8">Ningún asistente registrado aún.</p>
                  ) : (
                    attendees.map((att, i) => (
                      <div key={i} className="rounded-xl border-4 border-border bg-bg-card p-3 flex justify-between items-center text-sm font-bold text-text-main">
                        <div>
                          <div className="font-black text-text-main">{att.fullName}</div>
                          <div className="text-xs text-text-muted">{att.rut}</div>
                        </div>
                        <div>
                          {att.isException ? (
                            <span className="rounded-lg bg-warning text-white dark:text-black border-2 border-border px-2.5 py-0.5 text-xs font-black">
                              ⚠️ Testigo
                            </span>
                          ) : (
                            <span className="rounded-lg bg-success text-white border-2 border-border px-2.5 py-0.5 text-xs font-black">
                              ✓ Biometría
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Loop form with live camera feed */}
            <div className="overflow-hidden rounded-2xl border-4 border-border bg-bg-card shadow-2xl flex flex-col text-text-main">
              {/* Live camera stream */}
              <div className="aspect-video bg-black relative overflow-hidden border-b-4 border-border">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 rounded-xl border-2 border-border bg-success px-3 py-1.5 text-xs font-black text-white animate-pulse">
                  Cámara Activa
                </div>
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black p-6 text-center text-white">
                    <div>
                      <p className="text-danger font-black text-lg">❌ {cameraError}</p>
                      <p className="text-xs text-text-muted mt-2 font-bold">Habilite el acceso a la cámara en el navegador.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loop phase changes: SCANNING vs WITNESS */}
              {phase === 'scanning' ? (
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-black text-text-main">Validar Asistente</h3>
                  <p className="text-xs text-text-muted font-bold leading-normal">
                    Ingrese el RUT del trabajador y elija el método biométrico. El sistema tomará una foto
                    instantánea del visor de arriba y la contrastará contra el perfil guardado.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-base font-black text-text-main">
                      RUT del Trabajador
                      <input
                        type="text"
                        value={workerRut}
                        onChange={(e) => setWorkerRut(e.target.value.toUpperCase())}
                        onBlur={() => {
                          try {
                            setWorkerRut(formatChileanRut(workerRut));
                          } catch {}
                        }}
                        placeholder="Ej: 12.345.678-9"
                        className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition font-bold"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-base font-black text-text-main">
                      Tipo Biométrico
                      <select
                        value={biometricType}
                        onChange={(e) => setBiometricType(e.target.value as 'FACE' | 'PALM')}
                        className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main focus:border-secondary focus:outline-none transition font-bold"
                      >
                        <option value="FACE">Rostro</option>
                        <option value="PALM">Palma</option>
                      </select>
                    </label>
                  </div>

                  {workerVerifyError && (
                    <div className="rounded-xl border-4 border-danger bg-bg-card p-3 text-sm text-text-main font-bold">
                      ❌ {workerVerifyError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyWorker}
                      disabled={isVerifying || !cameraReady}
                      className="flex-1 rounded-xl bg-secondary py-4 px-6 font-black text-white hover:bg-interactive-hover active:scale-95 transition border-4 border-border flex items-center justify-center gap-2"
                    >
                      {isVerifying ? '⏳ Validando...' : '📷 Verificar Biometría'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerWitness}
                      className="rounded-xl bg-warning text-white dark:text-black py-4 px-6 font-black border-4 border-border active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      ⚠️ Bypass Testigo
                    </button>
                  </div>
                </div>
              ) : (
                /* Witness exception layout */
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-black text-warning">Bypass por Testigo de Fe (Excepción)</h3>
                  <p className="text-xs text-text-muted font-bold">
                    Use este flujo si el trabajador tiene problemas de validación biométrica reiterados.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-black text-text-main">
                      Nombre Trabajador
                      <input
                        type="text"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        placeholder="Nombre completo"
                        className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none font-bold"
                      />
                    </label>
                    <div className="flex flex-col gap-2 text-sm font-black text-text-main">
                      RUT Trabajador
                      <div className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-muted font-mono font-bold">
                        {workerRut}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t-4 border-border">
                    <label className="flex flex-col gap-2 text-sm font-black text-text-main">
                      Nombre Testigo (Prevencionista)
                      <input
                        type="text"
                        value={witnessName}
                        onChange={(e) => setWitnessName(e.target.value)}
                        placeholder="Ej: Mario Rojas"
                        className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none font-bold"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-black text-text-main">
                      RUT Testigo
                      <input
                        type="text"
                        value={witnessRut}
                        onChange={(e) => setWitnessRut(e.target.value.toUpperCase())}
                        onBlur={() => {
                          try {
                            setWitnessRut(formatChileanRut(witnessRut));
                          } catch {}
                        }}
                        placeholder="Ej: 12.345.678-9"
                        className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none font-bold"
                      />
                    </label>
                  </div>

                  {/* Draw Signature Canvas Inline */}
                  <div className="space-y-2">
                    <span className="text-sm font-black text-text-main">Firma del Testigo</span>
                    <div className="overflow-hidden rounded-xl border-4 border-border bg-white">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={180}
                        className="w-full h-32 touch-none cursor-crosshair"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                      />
                    </div>
                  </div>

                  {witnessSigError && (
                    <div className="rounded-xl border-4 border-danger bg-bg-card p-3 text-sm text-text-main font-bold">
                      ❌ {witnessSigError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmWitness}
                      className="flex-1 rounded-xl bg-danger text-white py-4.5 px-6 font-black hover:bg-danger/90 active:scale-95 transition border-4 border-border"
                    >
                      Confirmar Bypass
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSignature}
                      className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-base font-black hover:bg-bg-main active:scale-95 transition text-text-main"
                    >
                      🧹 Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase('scanning')}
                      className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-base font-black hover:bg-bg-main active:scale-95 transition text-text-main"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success / Complete page */}
        {phase === 'success' && (
          <div className="mx-auto mt-12 max-w-2xl w-full overflow-hidden rounded-2xl border-4 border-border bg-bg-card shadow-2xl text-text-main">
            <div className="bg-success text-white px-8 py-8 border-b-4 border-border">
              <span className="text-xs font-black uppercase tracking-[0.25em]">Charla finalizada</span>
              <h1 className="mt-2 text-4xl font-black">Acta Grupal Generada</h1>
              <p className="mt-2 text-sm font-bold opacity-90">
                Se guardó el registro con {attendees.length} asistentes. El archivo PDF con las firmas e integridad SHA-256 se descargó correctamente.
              </p>
            </div>

            <div className="p-8 space-y-4">
              <div className="rounded-xl bg-bg-card border-4 border-border p-4 text-sm font-bold text-text-muted">
                <h3 className="font-black text-text-main text-base mb-2">Detalles Generales</h3>
                <p><span className="font-black text-text-main">Título:</span> {talkTitle}</p>
                <p><span className="font-black text-text-main">Expositor:</span> {speakerName}</p>
                <p><span className="font-black text-text-main">Asistentes:</span> {attendees.length}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setTalkTitle('');
                    setSpeakerName('');
                    setAttendees([]);
                    setPdfDownloaded(false);
                    setPhase('setup');
                  }}
                  className="rounded-xl bg-secondary px-6 py-4 px-6 font-black text-white hover:bg-interactive-hover active:scale-95 transition border-4 border-border"
                >
                  Registrar Otra Charla
                </button>
                <a
                  href="/"
                  className="rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-base font-black hover:bg-bg-main active:scale-95 transition text-center text-text-main flex items-center justify-center"
                >
                  Ir al Inicio
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
