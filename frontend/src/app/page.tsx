'use client';

import React, { useEffect, useState } from 'react';
import { syncService, SyncStatus } from '@/lib/services/sync.service';

export default function Home() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
  const [syncMsg, setSyncMsg] = useState('');
  const [hasPending, setHasPending] = useState(false);
  const [online, setOnline] = useState(true);

  // Monitor network status and offline storage queue status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setOnline(navigator.onLine);

    const updateOnlineStatus = () => {
      setOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const unsubscribe = syncService.subscribe((status, msg) => {
      setSyncStatus(status);
      setSyncMsg(msg || '');
      syncService.hasPendingData().then(setHasPending);
    });

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      unsubscribe();
    };
  }, []);

  const handleManualSync = () => {
    syncService.syncAll();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#020617_100%)] flex flex-col justify-between py-12 px-4 text-white font-sans">
      <div className="mx-auto max-w-4xl w-full flex-1 flex flex-col justify-center">
        {/* Network & Offline Status Banner */}
        <div className="mb-8">
          {!online ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-200 backdrop-blur-md animate-pulse">
              ⚠️ <strong>Modo Desconectado (Offline):</strong> Las transacciones y enrolamientos se guardarán localmente en IndexedDB y se sincronizarán de forma automática cuando vuelva la conexión.
            </div>
          ) : hasPending ? (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-center text-sky-200 backdrop-blur-md flex flex-wrap justify-between items-center gap-3">
              <span>
                🔄 Hay registros pendientes por sincronizar en IndexedDB.
                {syncStatus === 'SYNCING' && <span className="ml-1 text-xs opacity-80">({syncMsg})</span>}
              </span>
              <button
                onClick={handleManualSync}
                disabled={syncStatus === 'SYNCING'}
                className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition"
              >
                {syncStatus === 'SYNCING' ? '⏳ Sincronizando...' : 'Sincronizar Ahora'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.45em] text-amber-400">Plataforma Laboral Segura</span>
          <h1 className="mt-4 text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
            🏗️ ObraFirmada
          </h1>
          <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Gestión inteligente de enrolamiento biométrico, actas de entrega de EPP e integridad documental certificada en MySQL.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card 1: Enrolamiento */}
          <a
            href="/enrollment"
            className="group rounded-3xl border border-white/5 bg-slate-900/30 p-8 hover:border-amber-500/20 hover:bg-slate-900/50 transition duration-300 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <span className="text-2xl">👤</span>
              <h3 className="mt-4 text-xl font-bold text-white group-hover:text-amber-300 transition">
                Enrolamiento Biométrico
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Registra la identidad de los trabajadores capturando su vector biométrico facial o de palma.
              </p>
            </div>
            <div className="mt-6 text-xs text-amber-400 font-semibold group-hover:translate-x-1 transition duration-200">
              Comenzar Registro &rarr;
            </div>
          </a>

          {/* Card 2: Entrega EPP */}
          <a
            href="/equipment-delivery"
            className="group rounded-3xl border border-white/5 bg-slate-900/30 p-8 hover:border-emerald-500/20 hover:bg-slate-900/50 transition duration-300 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <span className="text-2xl">📄</span>
              <h3 className="mt-4 text-xl font-bold text-white group-hover:text-emerald-300 transition">
                Entrega de EPP
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Genera actas individuales de entrega de implementos con firma digital manuscrita y validación biométrica en terreno.
              </p>
            </div>
            <div className="mt-6 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition duration-200">
              Emitir Acta &rarr;
            </div>
          </a>

          {/* Card 3: Charlas Grupales */}
          <a
            href="/group-talks"
            className="group rounded-3xl border border-white/5 bg-slate-900/30 p-8 hover:border-sky-500/20 hover:bg-slate-900/50 transition duration-300 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <span className="text-2xl">🖐️</span>
              <h3 className="mt-4 text-xl font-bold text-white group-hover:text-sky-300 transition">
                Charlas Grupales
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Registro consecutivo y rápido de asistencia con escaneo continuo de cámara para charlas de seguridad.
              </p>
            </div>
            <div className="mt-6 text-xs text-sky-400 font-semibold group-hover:translate-x-1 transition duration-200">
              Iniciar Charla &rarr;
            </div>
          </a>

          {/* Card 4: Dashboard */}
          <a
            href="/dashboard"
            className="group rounded-3xl border border-white/5 bg-slate-900/30 p-8 hover:border-indigo-500/20 hover:bg-slate-900/50 transition duration-300 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <span className="text-2xl">📊</span>
              <h3 className="mt-4 text-xl font-bold text-white group-hover:text-indigo-300 transition">
                Dashboard Administrativo
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Panel centralizado para gerentes y prevencionistas. Filtra entregas y descarga lotes en formato ZIP.
              </p>
            </div>
            <div className="mt-6 text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition duration-200">
              Ver Panel Central &rarr;
            </div>
          </a>
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500">
        <p>ObraFirmada &copy; {new Date().getFullYear()} - Sistema Seguro Criptográfico</p>
      </footer>
    </main>
  );
}
