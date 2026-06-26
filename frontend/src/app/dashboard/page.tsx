'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { equipmentDeliveryApi } from '@/lib/services/equipment-delivery-api.service';
import { formatChileanRut, isValidChileanRut } from '@/lib/utils/rut-validator';

interface DeliveryRecord {
  id: string;
  rut: string;
  workerFullName: string;
  deliveredAt: string;
  isException: boolean;
  notificationStatus: 'PENDING' | 'SENT' | 'FAILED' | string;
  latitude: number | null;
  longitude: number | null;
  equipmentItems: Array<{ name: string; quantity: number }>;
  documentIntegrity?: {
    sha256: string;
  } | null;
}

export default function AdminDashboardPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [rutFilter, setRutFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalCount: 0,
    exceptionCount: 0,
    sentCount: 0,
    failedCount: 0,
  });

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await equipmentDeliveryApi.listDeliveries({
        page,
        limit,
        rut: rutFilter ? formatChileanRut(rutFilter) : undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      });
      setDeliveries(data.deliveries);
      setTotal(data.total);

      // Compute statistics based on fetched batch (or mock stats based on totals)
      const list = data.deliveries;
      const exceptionCount = list.filter((d: any) => d.isException).length;
      const sentCount = list.filter((d: any) => d.notificationStatus === 'SENT').length;
      const failedCount = list.filter((d: any) => d.notificationStatus === 'FAILED').length;
      
      setStats({
        totalCount: data.total,
        exceptionCount: Math.round(data.total * (exceptionCount / (list.length || 1))),
        sentCount: Math.round(data.total * (sentCount / (list.length || 1))),
        failedCount: Math.round(data.total * (failedCount / (list.length || 1))),
      });
    } catch (err) {
      console.error(err);
      setError('Error al cargar el listado de entregas');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, rutFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.size === deliveries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deliveries.map((d) => d.id)));
    }
  };

  const handleDownloadZip = async () => {
    if (selectedIds.size === 0) {
      alert('Seleccione al menos un registro para descargar.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await equipmentDeliveryApi.exportZip(Array.from(selectedIds));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `actas-epp-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al descargar el lote ZIP');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#020617_100%)] p-6 text-white font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">Panel de Control</span>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Dashboard de Entregas EPP</h1>
            <p className="mt-1 text-slate-400">Auditoría, validación y exportación de comprobantes firmados.</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/equipment-delivery"
              className="rounded-full bg-slate-800 px-5 py-3 text-sm font-semibold text-white border border-white/10 hover:bg-slate-700 transition"
            >
              Nueva Entrega
            </a>
            <button
              onClick={handleDownloadZip}
              disabled={selectedIds.size === 0 || isExporting}
              className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {isExporting ? '⏳ Generando ZIP...' : `📦 Exportar ZIP (${selectedIds.size})`}
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total Entregas</p>
            <p className="mt-2 text-3xl font-black text-white">{stats.totalCount}</p>
            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Firmas Excepción (Testigo)</p>
            <p className="mt-2 text-3xl font-black text-rose-400">{stats.exceptionCount}</p>
            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400"
                style={{ width: `${stats.totalCount ? (stats.exceptionCount / stats.totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notificados</p>
            <p className="mt-2 text-3xl font-black text-emerald-400">{stats.sentCount}</p>
            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${stats.totalCount ? (stats.sentCount / stats.totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notificaciones Fallidas</p>
            <p className="mt-2 text-3xl font-black text-amber-500">{stats.failedCount}</p>
            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${stats.totalCount ? (stats.failedCount / stats.totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-8 rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md">
          <h2 className="mb-4 text-lg font-semibold">Filtros de búsqueda</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              RUT del Trabajador
              <input
                type="text"
                value={rutFilter}
                onChange={(e) => setRutFilter(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Fecha Desde
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Fecha Hasta
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Deliveries Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">
                    <input
                      type="checkbox"
                      checked={deliveries.length > 0 && selectedIds.size === deliveries.length}
                      onChange={handleSelectAllToggle}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                  </th>
                  <th className="py-4 px-6">Trabajador / RUT</th>
                  <th className="py-4 px-6">Fecha Entrega</th>
                  <th className="py-4 px-6">Firma</th>
                  <th className="py-4 px-6">Notificación</th>
                  <th className="py-4 px-6">Geofencing</th>
                  <th className="py-4 px-6">Integridad (SHA-256)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <div className="animate-spin inline-block w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mb-2"></div>
                      <p>Cargando registros...</p>
                    </td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No se encontraron actas de entrega para los filtros especificados.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-white/5 transition">
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(delivery.id)}
                          onChange={() => handleSelectToggle(delivery.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">{delivery.workerFullName}</div>
                        <div className="text-xs text-slate-400">{delivery.rut}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {new Date(delivery.deliveredAt).toLocaleString('es-CL')}
                      </td>
                      <td className="py-4 px-6">
                        {delivery.isException ? (
                          <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/25">
                            Testigo de Fe
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/25">
                            Biométrica
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {delivery.notificationStatus === 'SENT' ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                            Enviada
                          </span>
                        ) : delivery.notificationStatus === 'FAILED' ? (
                          <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-300">
                            Fallida
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {delivery.latitude && delivery.longitude ? (
                          <span>
                            {delivery.latitude.toFixed(4)}, {delivery.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span>Sin GPS</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400 break-all max-w-xs">
                        {delivery.documentIntegrity?.sha256 || 'Generando...'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-white/10 bg-slate-900/40 py-4 px-6 flex justify-between items-center text-sm">
            <span className="text-slate-400">
              Mostrando {deliveries.length} de {total} registros
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg bg-slate-800 border border-white/10 px-4 py-2 hover:bg-slate-700 transition disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg bg-slate-800 border border-white/10 px-4 py-2 hover:bg-slate-700 transition disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
