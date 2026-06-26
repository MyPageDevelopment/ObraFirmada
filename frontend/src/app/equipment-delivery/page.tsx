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
import { ThemeHeader } from '@/components/common/ThemeHeader';

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
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine);
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);

      // GPS validation
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

      // Offline storage handling
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

      // Offline storage handling
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
          className={`rounded-xl border-4 p-6 text-left transition-all duration-150 ${
            item.selected
              ? 'border-border bg-secondary text-white'
              : 'border-border bg-bg-card text-text-main hover:bg-bg-main'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xl font-black ${item.selected ? 'text-white' : 'text-text-main'}`}>{item.name}</p>
              <p className={`mt-1.5 text-sm ${item.selected ? 'text-white/95' : 'text-text-muted'} font-bold`}>{item.description}</p>
              <p className={`mt-2 text-xs uppercase tracking-[0.25em] ${item.selected ? 'text-white/80' : 'text-text-muted'} font-bold`}>{item.code}</p>
            </div>
            <span className={`rounded-lg px-4 py-1.5 text-xs font-black border-2 border-border ${item.selected ? 'bg-bg-card text-text-main' : 'bg-secondary text-white'}`}>
              {item.selected ? '✓ Seleccionado' : 'Disponible'}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <span className={`text-base font-black ${item.selected ? 'text-white' : 'text-text-main'}`}>Cantidad:</span>
            <div className="flex items-center border-4 border-border rounded-xl overflow-hidden bg-bg-card text-text-main">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(index, item.quantity - 1);
                }}
                className={`w-12 h-12 flex items-center justify-center font-black text-2xl border-r-4 border-border transition-all select-none ${item.selected ? 'bg-secondary hover:bg-interactive-hover text-white' : 'bg-bg-card hover:bg-bg-main text-text-main'}`}
              >
                -
              </button>
              <span className={`w-16 text-center font-black text-lg bg-transparent ${item.selected ? 'text-text-main' : 'text-text-main'}`}>{item.quantity}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(index, item.quantity + 1);
                }}
                className={`w-12 h-12 flex items-center justify-center font-black text-2xl border-l-4 border-border transition-all select-none ${item.selected ? 'bg-secondary hover:bg-interactive-hover text-white' : 'bg-bg-card hover:bg-bg-main text-text-main'}`}
              >
                +
              </button>
            </div>
            <span className={`text-sm font-bold capitalize ${item.selected ? 'text-white/90' : 'text-text-muted'}`}>{item.unit}</span>
          </div>
        </button>
      ))}
    </div>
  );

  if (!mounted) return null;

  const renderFlowContent = () => {
    if (gpsBlocked) {
      return (
        <div className="max-w-md rounded-2xl border-4 border-danger bg-bg-card p-8 text-center text-text-main">
          <p className="text-5xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-black text-danger">Ubicación GPS Requerida</h1>
          <p className="mt-4 text-sm text-text-muted font-bold leading-relaxed">
            Para garantizar la validez legal y geofencing del acta de entrega, debe habilitar el acceso GPS en su navegador.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-secondary py-4.5 px-8 font-black text-lg text-white hover:bg-interactive-hover border-4 border-border transition active:scale-95"
          >
            Reintentar Localización
          </button>
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
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border-4 border-border bg-bg-card text-text-main shadow-2xl">
          <div className="border-b-4 border-border bg-success text-white px-8 py-8">
            <p className="text-sm uppercase tracking-[0.35em] font-black">
              {deliveryState.sha256 === 'PENDIENTE_ONLINE' ? 'Pendiente en local' : 'Documento emitido'}
            </p>
            <h1 className="mt-2 text-4xl font-black">
              {deliveryState.sha256 === 'PENDIENTE_ONLINE' ? 'Entrega Registrada Localmente' : 'Acta de entrega certificada'}
            </h1>
            <p className="mt-3 max-w-2xl text-white/90 font-bold">
              {deliveryState.sha256 === 'PENDIENTE_ONLINE'
                ? 'El acta ha sido guardada en la base de datos local (IndexedDB). Se emitirá al servidor una vez recuperada la conexión.'
                : 'El PDF se descargó correctamente y la integridad quedó registrada en MySQL para auditoría.'}
            </p>
          </div>

          <div className="grid gap-6 px-8 py-8 md:grid-cols-2 bg-bg-card">
            <div className="rounded-xl border-4 border-border bg-bg-card p-6 text-text-main">
              <h2 className="text-lg font-black text-text-main">Resumen legal</h2>
              <dl className="mt-4 space-y-3 text-sm font-bold text-text-muted">
                <div className="flex justify-between gap-4"><dt>Trabajador</dt><dd className="font-black text-text-main">{deliveryState.workerFullName}</dd></div>
                <div className="flex justify-between gap-4"><dt>RUT</dt><dd className="font-black text-text-main">{formatChileanRut(deliveryState.rut)}</dd></div>
                <div className="flex justify-between gap-4"><dt>EPP seleccionados</dt><dd className="font-black text-text-main">{selectedItems.length}</dd></div>
                <div className="flex justify-between gap-4"><dt>Bypass Testigo</dt><dd className="font-black text-text-main">{deliveryState.isException ? 'SÍ' : 'NO'}</dd></div>
                <div className="flex justify-between gap-4"><dt>SHA-256</dt><dd className="font-mono text-xs text-text-main break-all font-black">{deliveryState.sha256}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border-4 border-border bg-bg-card p-6 text-sm text-text-muted">
              <p className="font-black text-text-main text-base">Identificadores de auditoría</p>
              <div className="mt-4 space-y-3 break-all font-bold">
                <p><span className="font-black text-text-main">Delivery ID:</span> {deliveryState.equipmentDeliveryId}</p>
                <p><span className="font-black text-text-main">Integrity ID:</span> {deliveryState.documentIntegrityId}</p>
                <p><span className="font-black text-text-main">Biometría:</span> {deliveryState.biometricType}</p>
              </div>
            </div>
          </div>

          <div className="border-t-4 border-border px-8 py-6 bg-bg-card">
            <button
              onClick={() => {
                setDeliveryState({
                  rut: '',
                  workerFullName: '',
                  biometricType: 'FACE',
                  equipmentItems: initialCatalog,
                });
                setStep('form');
              }}
              className="inline-flex rounded-xl bg-secondary border-4 border-border px-6 py-4.5 font-black text-white hover:bg-interactive-hover active:scale-95 transition"
            >
              Generar otro documento
            </button>
          </div>
        </div>
      );
    }

    if (step === 'error') {
      return (
        <div className="rounded-2xl border-4 border-border bg-bg-card p-8 shadow-2xl text-text-main max-w-2xl w-full">
          <p className="text-sm uppercase tracking-[0.3em] text-danger font-black">Error de flujo</p>
          <h1 className="mt-3 text-3xl font-black">No se pudo completar la entrega</h1>
          <p className="mt-4 text-text-main font-bold">{error}</p>
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep('form');
              }}
              className="rounded-xl bg-secondary px-6 py-4.5 border-4 border-border font-black text-white hover:bg-interactive-hover transition"
            >
              Volver al formulario
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep('form');
              }}
              className="rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 font-black text-text-main hover:bg-bg-main transition"
            >
              Reiniciar proceso
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        {!online && (
          <div className="mb-6 rounded-xl border-4 border-border bg-warning text-white dark:text-black p-4 text-center font-extrabold flex items-center justify-center gap-2">
            ⚠️ <strong>Modo Offline Activo:</strong> Se detectó pérdida de red. Las firmas se procesarán localmente en IndexedDB.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border-4 border-border bg-bg-card shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 lg:p-10 text-text-main bg-bg-card">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-secondary">Testigo de Fe y Geofencing</p>
              <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
                Entrega de EPP con validación biométrica e integridad SHA-256
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted font-bold">
                Selecciona el catálogo de implementos, captura la firma manuscrita y valida la identidad en vivo para emitir el acta legal sellada por el backend.
              </p>

              {error && (
                <div className="mt-6 rounded-xl border-4 border-danger bg-danger/10 px-4 py-3 text-sm text-text-main font-bold">
                  ❌ {error}
                </div>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border-4 border-border bg-bg-card p-4 text-text-main">
                  <p className="text-xs uppercase tracking-[0.25em] text-text-muted font-black">Paso actual</p>
                  <p className="mt-2 text-lg font-black capitalize">{step}</p>
                </div>
                <div className="rounded-xl border-4 border-border bg-bg-card p-4 text-text-main">
                  <p className="text-xs uppercase tracking-[0.25em] text-text-muted font-black">EPP seleccionados</p>
                  <p className="mt-2 text-lg font-black">{selectedItems.length}</p>
                </div>
                <div className="rounded-xl border-4 border-border bg-bg-card p-4 text-text-main">
                  <p className="text-xs uppercase tracking-[0.25em] text-text-muted font-black">Biometría</p>
                  <p className="mt-2 text-lg font-black">{deliveryState.biometricType}</p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border-4 border-border bg-bg-card p-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-3">
                    <span className="text-base font-black text-text-main">Nombre completo del trabajador</span>
                    <input
                      type="text"
                      value={deliveryState.workerFullName}
                      onChange={(event) => setDeliveryState((prev) => ({ ...prev, workerFullName: event.target.value }))}
                      placeholder="Juan Pérez Soto"
                      className="w-full rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-lg text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition-all duration-150"
                    />
                  </label>

                  <label className="space-y-3">
                    <span className="text-base font-black text-text-main">RUT del trabajador</span>
                    <input
                      type="text"
                      value={deliveryState.rut}
                      onChange={(event) => setDeliveryState((prev) => ({ ...prev, rut: event.target.value.toUpperCase() }))}
                      onBlur={() => {
                        try {
                          setDeliveryState((prev) => ({ ...prev, rut: formatChileanRut(prev.rut) }));
                        } catch {}
                      }}
                      placeholder="12.345.678-9"
                      className="w-full rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-lg text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition-all duration-150"
                    />
                  </label>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-3">
                    <span className="text-base font-black text-text-main">Tipo de validación biométrica</span>
                    <select
                      value={deliveryState.biometricType}
                      onChange={(event) =>
                        setDeliveryState((prev) => ({
                          ...prev,
                          biometricType: event.target.value as 'FACE' | 'PALM',
                        }))
                      }
                      className="w-full rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-lg text-text-main focus:border-secondary focus:outline-none transition-all duration-150"
                    >
                      <option value="FACE">Rostro</option>
                      <option value="PALM">Palma</option>
                    </select>
                  </label>

                  <div className="space-y-3">
                    <span className="text-base font-black text-text-main">Ubicación GPS de obra</span>
                    <div className="rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-lg text-text-main font-mono font-bold">
                      {coords ? `📍 Lat: ${coords.latitude.toFixed(6)} | Lon: ${coords.longitude.toFixed(6)}` : '🛰️ Obteniendo GPS...'}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-black text-text-main">Catálogo de EPP</h2>
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryState((prev) => ({
                          ...prev,
                          equipmentItems: prev.equipmentItems.map((item) => ({ ...item, selected: true })),
                        }))
                      }
                      className="rounded-xl border-4 border-border bg-secondary px-6 py-3.5 text-base font-black text-white hover:bg-interactive-hover active:scale-95 transition"
                    >
                      Seleccionar todo
                    </button>
                  </div>
                  {renderCatalog()}
                </div>

                <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border-4 border-border bg-bg-card p-6">
                  <div>
                    <p className="text-lg font-black text-text-main">{selectedItems.length} implementos seleccionados</p>
                    <p className="text-sm text-text-muted font-bold">Listo para capturar firma e identidad del trabajador.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFormContinue}
                    className="w-full md:w-auto rounded-xl bg-secondary text-white px-8 py-5 text-xl font-black border-4 border-border transition hover:bg-interactive-hover active:scale-[0.97]"
                  >
                    Continuar al documento ➡️
                  </button>
                </div>
              </div>
            </div>

            <aside className="border-t-4 border-border bg-bg-card p-8 lg:border-l-4 lg:border-t-0 text-text-main">
              <div className="rounded-xl border-4 border-border bg-bg-card p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-secondary font-black">Integridad</p>
                <h2 className="mt-3 text-2xl font-black text-text-main">Sellado legal del documento</h2>
                <p className="mt-3 text-sm leading-6 text-text-muted font-bold">
                  La entrega se autoriza solo si la captura en vivo coincide con el vector biométrico registrado. Luego el backend emite el acta PDF y guarda la huella SHA-256 en MySQL.
                </p>
              </div>

              <div className="mt-6 space-y-4 text-sm text-text-muted font-bold">
                <div className="rounded-xl border-4 border-border bg-bg-card p-4">
                  <p className="font-black text-text-main">1. Verificación 1:1</p>
                  <p className="mt-1">Comparación criptográfica contra el log biométrico cifrado del trabajador.</p>
                </div>
                <div className="rounded-xl border-4 border-border bg-bg-card p-4">
                  <p className="font-black text-text-main">2. PDF dinámico</p>
                  <p className="mt-1">Se inyectan datos del trabajador, timestamp, firma y listado de implementos.</p>
                </div>
                <div className="rounded-xl border-4 border-border bg-bg-card p-4">
                  <p className="font-black text-text-main">3. SHA-256</p>
                  <p className="mt-1">El archivo se sella, se registra su checksum y queda listo para auditoría.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main transition-colors duration-150">
      <ThemeHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        {renderFlowContent()}
      </main>
    </div>
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
    <div className="bg-bg-card border-4 border-border rounded-2xl p-8 shadow-2xl max-w-2xl w-full text-text-main select-none">
      <span className="text-xs font-black uppercase tracking-[0.25em] text-warning">Excepción</span>
      <h1 className="mt-2 text-3xl font-black">Bypass por Testigo de Fe</h1>
      <p className="mt-2 text-sm text-text-muted font-bold leading-normal">
        Ingrese los datos del prevencionista o supervisor autorizado que actúa como Testigo de Fe para esta entrega.
      </p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-3 text-base font-black text-text-main">
            Nombre completo del Testigo
            <input
              type="text"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              placeholder="Ej: Mario Rojas"
              className="rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-lg text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition-all duration-150"
            />
          </label>
          <label className="flex flex-col gap-3 text-base font-black text-text-main">
            RUT del Testigo
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
              className="rounded-xl border-4 border-border bg-bg-card px-6 py-4.5 text-lg text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none transition-all duration-150"
            />
          </label>
        </div>

        <div className="space-y-3">
          <span className="text-base font-black text-text-main">Firma manuscrita del Testigo de Fe</span>
          <div className="overflow-hidden rounded-xl border-4 border-border bg-white">
            <canvas
              ref={canvasRef}
              width={700}
              height={260}
              className="w-full h-64 touch-none cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border-4 border-danger bg-danger/10 p-4 text-sm text-text-main font-bold">
            ❌ {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 order-last sm:order-first rounded-xl bg-danger text-white py-4.5 px-8 text-lg font-black hover:bg-danger/90 active:scale-[0.98] transition border-4 border-border"
          >
            {isLoading ? '⏳ Registrando...' : 'Confirmar Autorización y Guardar'}
          </button>
          <button
            onClick={handleClear}
            className="rounded-xl border-4 border-border bg-bg-card px-8 py-4.5 text-lg font-black hover:bg-bg-main active:scale-[0.98] transition text-text-main"
          >
            🧹 Limpiar
          </button>
          <button
            onClick={onBack}
            className="rounded-xl border-4 border-border bg-bg-card px-8 py-4.5 text-lg font-black hover:bg-bg-main active:scale-[0.98] transition text-text-main"
          >
            Atrás
          </button>
        </div>
      </div>
    </div>
  );
}