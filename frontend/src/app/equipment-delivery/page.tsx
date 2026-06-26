/**
 * Pantalla de Entrega de EPP
 * Flujo: Datos del trabajador → Selección de catálogo → Firma → Biometría o Bypass Testigo → Descarga del PDF o guardado local
 */

'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BiometricCaptureComponent } from '@/components/enrollment/biometric-capture';
import { SignatureCaptureComponent } from '@/components/enrollment/signature-capture';
import {
  equipmentDeliveryApi,
  EquipmentItemPayload,
} from '@/lib/services/equipment-delivery-api.service';
import { formatChileanRut, isValidChileanRut } from '@/lib/utils/rut-validator';

type DeliveryStep = 'form' | 'signature' | 'biometric' | 'witness' | 'processing' | 'success' | 'error';

interface SelectedCatalogItem extends EquipmentItemPayload {
  selected: boolean;
}

interface DeliveryState {
  rut: string;
  workerFullName: string;
  biometricType: 'FACE' | 'PALM';
  signatureBase64?: string;
  biometricImageBase64?: string;
  equipmentItems: SelectedCatalogItem[];
  sha256?: string | null;
  equipmentDeliveryId?: string | null;
  documentIntegrityId?: string | null;
  isException?: boolean;
  witnessRut?: string;
  witnessFullName?: string;
  witnessSignatureBase64?: string;
}

const initialCatalog: SelectedCatalogItem[] = [
  { name: 'Casco de seguridad', quantity: 1, unit: 'unidad', description: 'Protección craneal', code: 'EPP-001', selected: true },
  { name: 'Guantes anticorte', quantity: 2, unit: 'pares', description: 'Manos y agarre', code: 'EPP-002', selected: true },
  { name: 'Botas de seguridad', quantity: 1, unit: 'par', description: 'Calzado reforzado', code: 'EPP-003', selected: true },
  { name: 'Chaleco reflectante', quantity: 1, unit: 'unidad', description: 'Alta visibilidad', code: 'EPP-004', selected: false },
  { name: 'Lentes de seguridad', quantity: 1, unit: 'unidad', description: 'Protección ocular', code: 'EPP-005', selected: false },
  { name: 'Protección auditiva', quantity: 1, unit: 'kit', description: 'Tapones o conchas', code: 'EPP-006', selected: false },
];

export default function EquipmentDeliveryPage() {
  const [step, setStep] = useState<DeliveryStep>('form');
  const [deliveryState, setDeliveryState] = useState<DeliveryState>({
    rut: '',
    workerFullName: '',
    biometricType: 'FACE',
    equipmentItems: initialCatalog,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Network & GPS status
  const [online, setOnline] = useState(true);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine);
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);

      // GPS validation (Sprint 4)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setGpsBlocked(false);
          },
          (err) => {
            console.error('GPS error:', err);
            setGpsBlocked(true);
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      } else {
        setGpsBlocked(true);
      }

      return () => {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      };
    }
  }, []);

  const selectedItems = useMemo(
    () => deliveryState.equipmentItems.filter((item) => item.selected),
    [deliveryState.equipmentItems],
  );

  const handleCatalogToggle = (index: number) => {
    setDeliveryState((prev) => ({
      ...prev,
      equipmentItems: prev.equipmentItems.map((item, currentIndex) =>
        currentIndex === index ? { ...item, selected: !item.selected } : item,
      ),
    }));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setDeliveryState((prev) => ({
      ...prev,
      equipmentItems: prev.equipmentItems.map((item, currentIndex) =>
        currentIndex === index ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    }));
  };

  const handleFormContinue = () => {
    setError(null);
    if (!deliveryState.workerFullName.trim()) {
      setError('El nombre del trabajador es requerido');
      return;
    }

    if (!deliveryState.rut.trim() || !isValidChileanRut(deliveryState.rut)) {
      setError('Debes ingresar un RUT chileno válido');
      return;
    }

    if (selectedItems.length === 0) {
      setError('Selecciona al menos un implemento de EPP');
      return;
    }

    setStep('signature');
  };

  const handleSignatureConfirm = (signatureBase64: string) => {
    setDeliveryState((prev) => ({ ...prev, signatureBase64 }));
    setStep('biometric');
  };

  // Normal biometric scan flow
  const handleBiometricCapture = async (imageBase64: string) => {
    setIsLoading(true);
    setStep('processing');
    setError(null);

    try {
      if (!deliveryState.signatureBase64) {
        throw new Error('Falta la firma manuscrita para continuar');
      }

      const payload = {
        rut: formatChileanRut(deliveryState.rut),
        workerFullName: deliveryState.workerFullName,
        biometricType: deliveryState.biometricType,
        biometricImageBase64: imageBase64,
        signatureBase64: deliveryState.signatureBase64,
        equipmentItems: selectedItems.map(({ name, quantity, unit, description, code }) => ({
          name,
          quantity,
          unit,
          description,
          code,
        })),
        latitude: coords?.latitude || undefined,
        longitude: coords?.longitude || undefined,
        isException: false,
      };

      // Offline storage handling (Sprint 3)
      if (!online) {
        const { IndexedDbService } = require('@/lib/utils/indexed-db.service');
        await IndexedDbService.saveDelivery({
          userId: 'offline-pending',
          rut: payload.rut,
          workerFullName: payload.workerFullName,
          equipmentItems: payload.equipmentItems,
          signatureBase64: payload.signatureBase64,
          latitude: payload.latitude,
          longitude: payload.longitude,
          isException: false,
          deliveredAt: new Date().toISOString(),
        });

        alert('📦 Registro guardado localmente en IndexedDB por falta de conexión. Se sincronizará automáticamente al retornar online.');
        
        setDeliveryState((prev) => ({
          ...prev,
          biometricImageBase64: imageBase64,
          sha256: 'PENDIENTE_ONLINE',
          equipmentDeliveryId: 'PENDIENTE_ONLINE',
          documentIntegrityId: 'PENDIENTE_ONLINE',
        }));
        setStep('success');
        return;
      }

      const response = await equipmentDeliveryApi.createEquipmentDeliveryDocument(payload);

      const pdfUrl = URL.createObjectURL(response.pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = pdfUrl;
      anchor.download = 'acta-entrega-epp.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(pdfUrl);

      setDeliveryState((prev) => ({
        ...prev,
        biometricImageBase64: imageBase64,
        sha256: response.sha256,
        equipmentDeliveryId: response.equipmentDeliveryId,
        documentIntegrityId: response.documentIntegrityId,
      }));
      setStep('success');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'No fue posible generar el documento';
      setError(message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Witness bypass confirm handler
  const handleConfirmWitness = async (witnessRut: string, witnessName: string, witnessSignatureBase64: string) => {
    setIsLoading(true);
    setStep('processing');
    setError(null);

    try {
      if (!deliveryState.signatureBase64) {
        throw new Error('Falta la firma manuscrita para continuar');
      }

      const payload = {
        rut: formatChileanRut(deliveryState.rut),
        workerFullName: deliveryState.workerFullName,
        biometricType: deliveryState.biometricType,
        biometricImageBase64: '',
        signatureBase64: deliveryState.signatureBase64,
        equipmentItems: selectedItems.map(({ name, quantity, unit, description, code }) => ({
          name,
          quantity,
          unit,
          description,
          code,
        })),
        latitude: coords?.latitude || undefined,
        longitude: coords?.longitude || undefined,
        isException: true,
        witnessRut: formatChileanRut(witnessRut),
        witnessFullName: witnessName,
        witnessSignatureBase64,
      };

      // Offline storage handling (Sprint 3)
      if (!online) {
        const { IndexedDbService } = require('@/lib/utils/indexed-db.service');
        await IndexedDbService.saveDelivery({
          userId: 'offline-pending',
          rut: payload.rut,
          workerFullName: payload.workerFullName,
          equipmentItems: payload.equipmentItems,
          signatureBase64: payload.signatureBase64,
          latitude: payload.latitude,
          longitude: payload.longitude,
          isException: true,
          witnessRut: payload.witnessRut,
          witnessFullName: payload.witnessFullName,
          witnessSignatureBase64: payload.witnessSignatureBase64,
          deliveredAt: new Date().toISOString(),
        });

        alert('📦 Registro de excepción guardado localmente en IndexedDB. Se sincronizará automáticamente al retornar online.');

        setDeliveryState((prev) => ({
          ...prev,
          sha256: 'PENDIENTE_ONLINE',
          equipmentDeliveryId: 'PENDIENTE_ONLINE',
          documentIntegrityId: 'PENDIENTE_ONLINE',
          isException: true,
          witnessRut: payload.witnessRut,
          witnessFullName: payload.witnessFullName,
          witnessSignatureBase64: payload.witnessSignatureBase64,
        }));
        setStep('success');
        return;
      }

      const response = await equipmentDeliveryApi.createEquipmentDeliveryDocument(payload);

      const pdfUrl = URL.createObjectURL(response.pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = pdfUrl;
      anchor.download = 'acta-entrega-epp.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(pdfUrl);

      setDeliveryState((prev) => ({
        ...prev,
        sha256: response.sha256,
        equipmentDeliveryId: response.equipmentDeliveryId,
        documentIntegrityId: response.documentIntegrityId,
        isException: true,
        witnessRut: payload.witnessRut,
        witnessFullName: payload.witnessFullName,
        witnessSignatureBase64: payload.witnessSignatureBase64,
      }));
      setStep('success');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'No fue posible registrar la entrega';
      setError(message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCatalog = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {deliveryState.equipmentItems.map((item, index) => (
        <button
          key={item.code}
          type="button"
          onClick={() => handleCatalogToggle(index)}
          className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
            item.selected
              ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-100'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-600">{item.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-400">{item.code}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.selected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {item.selected ? 'Seleccionado' : 'Disponible'}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Cantidad</label>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(event) => handleQuantityChange(index, Number(event.target.value))}
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </button>
      ))}
    </div>
  );

  // GPS Blocker view (Sprint 4)
  if (gpsBlocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md rounded-[2rem] border border-rose-500/30 bg-rose-950/20 p-8 text-center backdrop-blur-xl">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-black text-rose-300">Ubicación GPS Requerida</h1>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Para garantizar la validez legal y geofencing del acta de entrega, debe habilitar el acceso GPS en su navegador.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-full bg-rose-500 py-3 font-semibold text-white hover:bg-rose-400 transition"
          >
            Reintentar Localización
          </button>
        </div>
      </div>
    );
  }

  if (step === 'signature') {
    return (
      <SignatureCaptureComponent
        onConfirm={handleSignatureConfirm}
        onBack={() => setStep('form')}
        isLoading={isLoading}
      />
    );
  }

  if (step === 'biometric') {
    return (
      <BiometricCaptureComponent
        onCapture={handleBiometricCapture}
        biometricType={deliveryState.biometricType}
        isLoading={isLoading}
        onWitnessBypass={() => setStep('witness')}
      />
    );
  }

  if (step === 'witness') {
    return (
      <WitnessBypassComponent
        onConfirm={handleConfirmWitness}
        onBack={() => setStep('biometric')}
        isLoading={isLoading}
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a8a_0%,_#0f172a_55%,_#020617_100%)] p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 bg-emerald-500/20 px-8 py-8">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">
                {deliveryState.sha256 === 'PENDIENTE_ONLINE' ? 'Pendiente en local' : 'Documento emitido'}
              </p>
              <h1 className="mt-2 text-4xl font-black">
                {deliveryState.sha256 === 'PENDIENTE_ONLINE' ? 'Entrega Registrada Localmente' : 'Acta de entrega certificada'}
              </h1>
              <p className="mt-3 max-w-2xl text-white/80">
                {deliveryState.sha256 === 'PENDIENTE_ONLINE'
                  ? 'El acta ha sido guardada en la base de datos local (IndexedDB). Se emitirá al servidor una vez recuperada la conexión.'
                  : 'El PDF se descargó correctamente y la integridad quedó registrada en MySQL para auditoría.'}
              </p>
            </div>

            <div className="grid gap-6 px-8 py-8 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-lg font-semibold text-white">Resumen legal</h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="flex justify-between gap-4"><dt>Trabajador</dt><dd className="font-medium text-white">{deliveryState.workerFullName}</dd></div>
                  <div className="flex justify-between gap-4"><dt>RUT</dt><dd className="font-medium text-white">{formatChileanRut(deliveryState.rut)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>EPP seleccionados</dt><dd className="font-medium text-white">{selectedItems.length}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Bypass Testigo</dt><dd className="font-medium text-white">{deliveryState.isException ? 'SÍ' : 'NO'}</dd></div>
                  <div className="flex justify-between gap-4"><dt>SHA-256</dt><dd className="font-mono text-xs text-emerald-200 break-all">{deliveryState.sha256}</dd></div>
                </dl>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
                <p className="font-semibold text-white">Identificadores de auditoría</p>
                <div className="mt-4 space-y-3 break-all">
                  <p><span className="font-medium text-white">Delivery ID:</span> {deliveryState.equipmentDeliveryId}</p>
                  <p><span className="font-medium text-white">Integrity ID:</span> {deliveryState.documentIntegrityId}</p>
                  <p><span className="font-medium text-white">Biometría:</span> {deliveryState.biometricType}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 px-8 py-6">
              <a
                href="/equipment-delivery"
                className="inline-flex rounded-full bg-white px-5 py-3 font-semibold text-slate-900 transition hover:scale-[1.01]"
              >
                Generar otro documento
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center">
          <div className="rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Error de flujo</p>
            <h1 className="mt-3 text-3xl font-bold">No se pudo completar la entrega</h1>
            <p className="mt-4 text-white/80">{error}</p>
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('form');
                }}
                className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-slate-950"
              >
                Volver al formulario
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('form');
                }}
                className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
              >
                Reiniciar proceso
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16)_0%,_rgba(15,23,42,0.98)_42%,_#020617_100%)] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Offline notification banner */}
        {!online && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-200">
            ⚠️ <strong>Modo Offline Activo:</strong> Se detectó pérdida de red. Las firmas se procesarán localmente en IndexedDB.
          </div>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 lg:p-10">
              <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Sprint 4 · Testigo y Geofencing</p>
              <h1 className="mt-4 text-4xl font-black leading-tight lg:text-6xl">
                Entrega de EPP con validación biométrica e integridad SHA-256
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
                Selecciona el catálogo de implementos, captura la firma manuscrita y valida la identidad en vivo para emitir el acta legal sellada por el backend.
              </p>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Paso actual</p>
                  <p className="mt-2 text-lg font-semibold capitalize">{step}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">EPP seleccionados</p>
                  <p className="mt-2 text-lg font-semibold">{selectedItems.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Biometría</p>
                  <p className="mt-2 text-lg font-semibold">{deliveryState.biometricType}</p>
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-200">Nombre completo</span>
                    <input
                      type="text"
                      value={deliveryState.workerFullName}
                      onChange={(event) => setDeliveryState((prev) => ({ ...prev, workerFullName: event.target.value }))}
                      placeholder="Juan Pérez Soto"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-200">RUT</span>
                    <input
                      type="text"
                      value={deliveryState.rut}
                      onChange={(event) => setDeliveryState((prev) => ({ ...prev, rut: event.target.value.toUpperCase() }))}
                      onBlur={() => {
                        try {
                          setDeliveryState((prev) => ({ ...prev, rut: formatChileanRut(prev.rut) }));
                        } catch {
                          // Mantener el valor si el formateo falla
                        }
                      }}
                      placeholder="12.345.678-9"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-200">Tipo biométrico</span>
                    <select
                      value={deliveryState.biometricType}
                      onChange={(event) =>
                        setDeliveryState((prev) => ({
                          ...prev,
                          biometricType: event.target.value as 'FACE' | 'PALM',
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-amber-300 focus:outline-none"
                    >
                      <option value="FACE">Rostro</option>
                      <option value="PALM">Palma</option>
                    </select>
                  </label>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-200">Ubicación GPS</span>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                      {coords ? `Lat: ${coords.latitude.toFixed(4)} | Lon: ${coords.longitude.toFixed(4)}` : 'Obteniendo GPS...'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Catálogo de EPP</h2>
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryState((prev) => ({
                          ...prev,
                          equipmentItems: prev.equipmentItems.map((item) => ({ ...item, selected: true })),
                        }))
                      }
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Seleccionar todo
                    </button>
                  </div>
                  {renderCatalog()}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div>
                    <p className="font-semibold text-emerald-100">{selectedItems.length} implementos listos para emitir</p>
                    <p className="text-sm text-emerald-50/80">El backend generará el PDF y devolverá el checksum SHA-256 en cabeceras.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFormContinue}
                    className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-amber-300"
                  >
                    Continuar al documento
                  </button>
                </div>
              </div>
            </div>

            <aside className="border-t border-white/10 bg-slate-950/30 p-8 lg:border-l lg:border-t-0">
              <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-amber-400/20 to-transparent p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Integridad</p>
                <h2 className="mt-3 text-2xl font-bold text-white">Sellado legal del documento</h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  La entrega se autoriza solo si la captura en vivo coincide con el vector biométrico registrado. Luego el backend emite el acta PDF y guarda la huella SHA-256 en MySQL.
                </p>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">1. Verificación 1:1</p>
                  <p className="mt-1">Comparación criptográfica contra el log biométrico cifrado del trabajador.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">2. PDF dinámico</p>
                  <p className="mt-1">Se inyectan datos del trabajador, timestamp, firma y listado de implementos.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">3. SHA-256</p>
                  <p className="mt-1">El archivo se sella, se registra su checksum y queda listo para auditoría.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

interface WitnessBypassProps {
  onConfirm: (witnessRut: string, witnessName: string, witnessSignatureBase64: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

function WitnessBypassComponent({ onConfirm, onBack, isLoading }: WitnessBypassProps) {
  const [witnessRut, setWitnessRut] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    const pt = getPoint(e);
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
    const pt = getPoint(e);
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

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    setError(null);
    if (!witnessName.trim() || !witnessRut.trim() || !isValidChileanRut(witnessRut)) {
      setError('Por favor ingrese el nombre del Testigo de Fe y un RUT válido.');
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      setError('El Testigo de Fe debe dibujar su firma.');
      return;
    }

    const signatureBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];
    onConfirm(witnessRut, witnessName, signatureBase64);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center p-4 text-white">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl max-w-2xl w-full">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-rose-400">Excepción</span>
        <h1 className="mt-2 text-3xl font-black">Bypass por Testigo de Fe</h1>
        <p className="mt-2 text-sm text-slate-300 leading-normal">
          Ingrese los datos del prevencionista o supervisor autorizado que actúa como Testigo de Fe para esta entrega.
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Nombre Testigo
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

          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-300">Firma del Testigo de Fe</span>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full h-40 touch-none cursor-crosshair"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 rounded-full bg-rose-500 py-3 font-semibold hover:bg-rose-400 transition"
            >
              {isLoading ? '⏳ Registrando...' : 'Confirmar Autorización'}
            </button>
            <button
              onClick={handleClear}
              className="rounded-full border border-white/10 bg-slate-800 px-6 py-3 font-semibold hover:bg-slate-700 transition"
            >
              🧹 Limpiar
            </button>
            <button
              onClick={onBack}
              className="rounded-full border border-white/10 bg-slate-800 px-6 py-3 font-semibold hover:bg-slate-700 transition"
            >
              Atrás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}