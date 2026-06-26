'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { CameraService } from '@/lib/utils/camera.service';
import { groupTalkApi } from '@/lib/services/group-talk-api.service';
import { equipmentDeliveryApi } from '@/lib/services/equipment-delivery-api.service';
import { formatChileanRut, isValidChileanRut } from '@/lib/utils/rut-validator';

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

  // GPS denegation blocker (Sprint 4)
  if (gpsBlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md rounded-[2rem] border border-rose-500/30 bg-rose-950/20 p-8 text-center backdrop-blur-xl">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-black text-rose-300">Acceso GPS Obligatorio</h1>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Por normativas de seguridad laboral y geofencing del proyecto, debe conceder permisos de localización
            para poder operar esta pantalla.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-full bg-rose-500 py-3 font-semibold text-white hover:bg-rose-400 transition"
          >
            Reintentar Permisos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a8a_0%,_#0f172a_55%,_#020617_100%)] p-4 text-white font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Setup Phase */}
        {phase === 'setup' && (
          <div className="mx-auto mt-12 max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-xl">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Sprint 5</span>
            <h1 className="mt-2 text-3xl font-black">Registro de Charla Grupal</h1>
            <p className="mt-2 text-sm text-slate-300">
              Configure la sesión para habilitar el escaneo en serie continuo de los trabajadores.
            </p>

            <div className="mt-6 space-y-4">
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Título / Tema de la Charla
                <input
                  type="text"
                  value={talkTitle}
                  onChange={(e) => setTalkTitle(e.target.value)}
                  placeholder="Ej: Charla de inducción de seguridad general"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Expositor / Prevencionista a cargo
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="Ej: Mario Rojas"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </label>

              {coords && (
                <div className="rounded-xl bg-slate-900/60 p-3 text-xs text-slate-400 flex justify-between">
                  <span>GPS Validado</span>
                  <span>
                    Lat: {coords.latitude.toFixed(4)} | Lon: {coords.longitude.toFixed(4)}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartTalk}
                className="mt-4 w-full rounded-full bg-amber-400 py-3 font-semibold text-slate-950 hover:bg-amber-300 transition"
              >
                Comenzar Charla Grupal
              </button>
            </div>
          </div>
        )}

        {/* Scanning & Witness loops */}
        {(phase === 'scanning' || phase === 'witness') && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            {/* Left: General info and attendee check-list */}
            <div className="flex flex-col gap-6">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl">
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Tema Charla</span>
                <h2 className="text-2xl font-black truncate">{talkTitle}</h2>
                <p className="text-sm text-slate-400">Dictada por: {speakerName}</p>

                <div className="mt-6 flex justify-between gap-4 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-xs text-slate-400">Total Asistentes</p>
                    <p className="text-xl font-bold text-white">{attendees.length}</p>
                  </div>
                  <button
                    onClick={handleFinishTalk}
                    disabled={attendees.length === 0 || globalLoading}
                    className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {globalLoading ? '⏳ Generando...' : '📄 Finalizar y Emitir Acta'}
                  </button>
                </div>

                {globalError && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                    {globalError}
                  </div>
                )}
              </div>

              {/* Attendee register list */}
              <div className="flex-1 rounded-[2rem] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl flex flex-col">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Registro de Asistencia ({attendees.length})</h3>
                <div className="mt-4 flex-1 overflow-y-auto max-h-[350px] space-y-3">
                  {attendees.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Ningún asistente registrado aún.</p>
                  ) : (
                    attendees.map((att, i) => (
                      <div key={i} className="rounded-xl bg-white/5 p-3 flex justify-between items-center text-sm">
                        <div>
                          <div className="font-semibold text-white">{att.fullName}</div>
                          <div className="text-xs text-slate-400">{att.rut}</div>
                        </div>
                        <div>
                          {att.isException ? (
                            <span className="rounded-full bg-rose-500/15 border border-rose-500/20 px-2.5 py-0.5 text-xs text-rose-300 font-semibold">
                              Testigo
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-300 font-semibold">
                              Biometría
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
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 shadow-2xl backdrop-blur-xl flex flex-col">
              {/* Live camera stream */}
              <div className="aspect-video bg-black relative overflow-hidden border-b border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950 animate-pulse">
                  Cámara Activa
                </div>
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center">
                    <div>
                      <p className="text-rose-400 font-bold">❌ {cameraError}</p>
                      <p className="text-xs text-slate-400 mt-2">Habilite el acceso a la cámara en el navegador.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loop phase changes: SCANNING vs WITNESS */}
              {phase === 'scanning' ? (
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Validar Asistente</h3>
                  <p className="text-xs text-slate-300 leading-normal">
                    Ingrese el RUT del trabajador y elija el método biométrico. El sistema tomará una foto
                    instantánea del visor de arriba y la contrastará contra el perfil guardado.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-slate-300">
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
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                      Tipo Biométrico
                      <select
                        value={biometricType}
                        onChange={(e) => setBiometricType(e.target.value as 'FACE' | 'PALM')}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
                      >
                        <option value="FACE">Rostro</option>
                        <option value="PALM">Palma</option>
                      </select>
                    </label>
                  </div>

                  {workerVerifyError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                      {workerVerifyError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyWorker}
                      disabled={isVerifying || !cameraReady}
                      className="flex-1 rounded-full bg-amber-400 py-3 font-semibold text-slate-950 hover:bg-amber-300 transition disabled:opacity-50"
                    >
                      {isVerifying ? '⏳ Validando...' : '📷 Verificar Biometría'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerWitness}
                      className="rounded-full border border-white/10 bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 transition"
                    >
                      Bypass Testigo
                    </button>
                  </div>
                </div>
              ) : (
                /* Witness exception layout */
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-rose-300">Bypass por Testigo de Fe (Excepción)</h3>
                  <p className="text-xs text-slate-300">
                    Use este flujo si el trabajador tiene problemas de validación biométrica reiterados.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                      Nombre Trabajador
                      <input
                        type="text"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        placeholder="Nombre completo"
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                    <div className="flex flex-col gap-2 text-sm text-slate-300">
                      RUT Trabajador
                      <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-slate-400">
                        {workerRut}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/5">
                    <label className="flex flex-col gap-2 text-sm text-slate-300">
                      Nombre Testigo (Prevencionista)
                      <input
                        type="text"
                        value={witnessName}
                        onChange={(e) => setWitnessName(e.target.value)}
                        placeholder="Ej: Mario Rojas"
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-slate-300">
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
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                  </div>

                  {/* Draw Signature Canvas Inline */}
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-300">Firma del Testigo</span>
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
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
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                      {witnessSigError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmWitness}
                      className="flex-1 rounded-full bg-rose-500 py-3 font-semibold text-white hover:bg-rose-400 transition"
                    >
                      Confirmar Bypass
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSignature}
                      className="rounded-full border border-white/10 bg-slate-800 px-4 py-3 text-xs font-semibold hover:bg-slate-700 transition"
                    >
                      🧹 Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase('scanning')}
                      className="rounded-full border border-white/10 bg-slate-800 px-4 py-3 text-xs font-semibold hover:bg-slate-700 transition"
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
          <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 shadow-2xl backdrop-blur-xl">
            <div className="bg-emerald-500/20 px-8 py-8 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">Charla finalizada</span>
              <h1 className="mt-2 text-4xl font-black">Acta Grupal Generada</h1>
              <p className="mt-2 text-sm text-slate-300">
                Se guardó el registro con {attendees.length} asistentes. El archivo PDF con las firmas e integridad SHA-256 se descargó correctamente.
              </p>
            </div>

            <div className="p-8 space-y-4">
              <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5 text-sm">
                <h3 className="font-bold text-white mb-2">Detalles Generales</h3>
                <p><span className="text-slate-400">Título:</span> {talkTitle}</p>
                <p><span className="text-slate-400">Expositor:</span> {speakerName}</p>
                <p><span className="text-slate-400">Asistentes:</span> {attendees.length}</p>
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
                  className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-300 transition"
                >
                  Registrar Otra Charla
                </button>
                <a
                  href="/dashboard"
                  className="rounded-full border border-white/10 bg-slate-800 px-6 py-3 font-semibold hover:bg-slate-700 transition text-center"
                >
                  Ir al Dashboard
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
