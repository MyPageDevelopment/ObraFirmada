/**
 * Pantalla de Entrega de EPP
 * Flujo: Datos del trabajador → Selección de catálogo → Firma → Biometría → Descarga del PDF
 */

'use client';

import React, { useMemo, useState } from 'react';
import { BiometricCaptureComponent } from '@/components/enrollment/biometric-capture';
import { SignatureCaptureComponent } from '@/components/enrollment/signature-capture';
import {
  equipmentDeliveryApi,
  EquipmentItemPayload,
} from '@/lib/services/equipment-delivery-api.service';
import { formatChileanRut, isValidChileanRut } from '@/lib/utils/rut-validator';

type DeliveryStep = 'form' | 'signature' | 'biometric' | 'processing' | 'success' | 'error';

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

  const handleBiometricCapture = async (imageBase64: string) => {
    setIsLoading(true);
    setStep('processing');
    setError(null);

    try {
      if (!deliveryState.signatureBase64) {
        throw new Error('Falta la firma manuscrita para continuar');
      }

      const response = await equipmentDeliveryApi.createEquipmentDeliveryDocument({
        rut: formatChileanRut(deliveryState.rut),
        workerFullName: deliveryState.workerFullName,
        biometricType: deliveryState.biometricType,
        biometricImageBase64: imageBase64,
        signatureBase64: deliveryState.signatureBase64,
        equipmentItems: selectedItems,
      });

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible generar el documento';
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
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </button>
      ))}
    </div>
  );

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
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a8a_0%,_#0f172a_55%,_#020617_100%)] p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 bg-emerald-500/20 px-8 py-8">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Documento emitido</p>
              <h1 className="mt-2 text-4xl font-black">Acta de entrega certificada</h1>
              <p className="mt-3 max-w-2xl text-white/80">
                El PDF se descargó correctamente y la integridad quedó registrada en MySQL para auditoría.
              </p>
            </div>

            <div className="grid gap-6 px-8 py-8 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
                <h2 className="text-lg font-semibold text-white">Resumen legal</h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="flex justify-between gap-4"><dt>Trabajador</dt><dd className="font-medium text-white">{deliveryState.workerFullName}</dd></div>
                  <div className="flex justify-between gap-4"><dt>RUT</dt><dd className="font-medium text-white">{formatChileanRut(deliveryState.rut)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>EPP seleccionados</dt><dd className="font-medium text-white">{selectedItems.length}</dd></div>
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
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 lg:p-10">
              <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Sprint 2 · Documento legal</p>
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
                    <span className="text-sm font-medium text-slate-200">Ruta del flujo</span>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                      Datos → Catálogo → Firma → Biometría → PDF firmado
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