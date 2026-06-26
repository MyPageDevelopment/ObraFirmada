'use client';

'use client';

import React, { useEffect, useState } from 'react';
import { syncService, SyncStatus } from '@/lib/services/sync.service';
import { ThemeHeader } from '@/components/common/ThemeHeader';

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
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main select-none transition-colors duration-150">
      <ThemeHeader />

      <main className="flex-1 flex flex-col justify-center py-12 px-4 max-w-4xl mx-auto w-full">
        {/* Network & Offline Status Banner */}
        <div className="mb-8">
          {!online ? (
            <div className="rounded-xl border-4 border-border bg-warning text-white dark:text-black p-4 text-center font-extrabold flex items-center justify-center gap-2">
              ⚠️ <strong>MODO DESCONECTADO:</strong> Las firmas y registros se guardan en IndexedDB localmente y se subirán al volver la conexión.
            </div>
          ) : hasPending ? (
            <div className="rounded-xl border-4 border-border bg-bg-card text-text-main p-4 flex flex-wrap justify-between items-center gap-3">
              <span className="font-bold">
                🔄 Hay registros pendientes por sincronizar en IndexedDB.
                {syncStatus === 'SYNCING' && <span className="ml-2 text-sm opacity-80">({syncMsg})</span>}
              </span>
              <button
                onClick={handleManualSync}
                disabled={syncStatus === 'SYNCING'}
                className="rounded-xl bg-secondary text-white border-4 border-border px-5 py-2.5 font-black text-sm hover:bg-interactive-hover transition active:scale-95 disabled:opacity-50"
              >
                {syncStatus === 'SYNCING' ? '⏳ Sincronizando...' : '🔄 Sincronizar Ahora'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <span className="text-sm font-black uppercase tracking-[0.35em] text-secondary">
            Plataforma Laboral Segura
          </span>
          <h1 className="mt-4 text-5xl md:text-6xl font-black tracking-tight text-primary">
            🏗️ ObraFirmada
          </h1>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto leading-relaxed font-bold">
            Gestión inteligente de enrolamiento biométrico, actas de entrega de EPP e integridad documental certificada en MySQL.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card 1: Enrolamiento */}
          <a
            href="/enrollment"
            className="group rounded-2xl border-4 border-border bg-bg-card p-8 flex flex-col justify-between hover:bg-secondary hover:text-white transition-all select-none text-text-main"
          >
            <div>
              <span className="text-3xl">👤</span>
              <h3 className="mt-4 text-xl font-black text-text-main group-hover:text-white transition-colors duration-150">
                Enrolamiento Biométrico
              </h3>
              <p className="mt-2 text-sm text-text-muted group-hover:text-white/90 leading-relaxed font-bold transition-colors duration-150">
                Registra la identidad de los trabajadores capturando su vector biométrico facial o de palma.
              </p>
            </div>
            <div className="mt-6 text-sm text-secondary font-black group-hover:text-white transition-colors duration-150 flex items-center gap-1.5">
              <span>👤</span> COMENZAR REGISTRO &rarr;
            </div>
          </a>

          {/* Card 2: Entrega EPP */}
          <a
            href="/equipment-delivery"
            className="group rounded-2xl border-4 border-border bg-bg-card p-8 flex flex-col justify-between hover:bg-secondary hover:text-white transition-all select-none text-text-main"
          >
            <div>
              <span className="text-3xl">📄</span>
              <h3 className="mt-4 text-xl font-black text-text-main group-hover:text-white transition-colors duration-150">
                Entrega de EPP
              </h3>
              <p className="mt-2 text-sm text-text-muted group-hover:text-white/90 leading-relaxed font-bold transition-colors duration-150">
                Genera actas individuales de entrega de implementos con firma digital manuscrita y validación biométrica en terreno.
              </p>
            </div>
            <div className="mt-6 text-sm text-secondary font-black group-hover:text-white transition-colors duration-150 flex items-center gap-1.5">
              <span>📄</span> EMITIR ACTA &rarr;
            </div>
          </a>

          {/* Card 3: Charlas Grupales */}
          <a
            href="/group-talks"
            className="group rounded-2xl border-4 border-border bg-bg-card p-8 flex flex-col justify-between hover:bg-secondary hover:text-white transition-all select-none text-text-main"
          >
            <div>
              <span className="text-3xl">🖐️</span>
              <h3 className="mt-4 text-xl font-black text-text-main group-hover:text-white transition-colors duration-150">
                Charlas Grupales
              </h3>
              <p className="mt-2 text-sm text-text-muted group-hover:text-white/90 leading-relaxed font-bold transition-colors duration-150">
                Registro consecutivo y rápido de asistencia con escaneo continuo de cámara para charlas de seguridad.
              </p>
            </div>
            <div className="mt-6 text-sm text-secondary font-black group-hover:text-white transition-colors duration-150 flex items-center gap-1.5">
              <span>🖐️</span> INICIAR CHARLA &rarr;
            </div>
          </a>

          {/* Card 4: Dashboard */}
          <a
            href="/dashboard"
            className="group rounded-2xl border-4 border-border bg-bg-card p-8 flex flex-col justify-between hover:bg-secondary hover:text-white transition-all select-none text-text-main"
          >
            <div>
              <span className="text-3xl">📊</span>
              <h3 className="mt-4 text-xl font-black text-text-main group-hover:text-white transition-colors duration-150">
                Dashboard Administrativo
              </h3>
              <p className="mt-2 text-sm text-text-muted group-hover:text-white/90 leading-relaxed font-bold transition-colors duration-150">
                Panel centralizado para gerentes y prevencionistas. Filtra entregas y descarga lotes en formato ZIP.
              </p>
            </div>
            <div className="mt-6 text-sm text-secondary font-black group-hover:text-white transition-colors duration-150 flex items-center gap-1.5">
              <span>📊</span> VER PANEL CENTRAL &rarr;
            </div>
          </a>
        </div>
      </main>

      <footer className="mt-12 text-center text-xs text-text-muted font-bold pb-6">
        <p>ObraFirmada &copy; {new Date().getFullYear()} - Sistema Seguro Criptográfico</p>
      </footer>
    </div>
  );
}
