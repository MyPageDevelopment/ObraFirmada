'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { equipmentDeliveryApi } from '@/lib/services/equipment-delivery-api.service';
import { formatChileanRut, isValidChileanRut } from '@/lib/utils/rut-validator';
import { ThemeHeader } from '@/components/common/ThemeHeader';

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
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main transition-colors duration-150">
      <ThemeHeader />

      <div className="mx-auto max-w-7xl w-full p-4 flex-1 flex flex-col">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-secondary">Panel de Control</span>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-text-main">Dashboard de Entregas EPP</h1>
            <p className="mt-1 text-text-muted font-bold">Auditoría, validación y exportación de comprobantes firmados.</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/equipment-delivery"
              className="rounded-xl bg-secondary px-5 py-3 text-sm font-black text-white border-4 border-border hover:bg-interactive-hover transition active:scale-95 text-center flex items-center justify-center"
            >
              Nueva Entrega
            </a>
            <button
              onClick={handleDownloadZip}
              disabled={selectedIds.size === 0 || isExporting}
              className="rounded-xl bg-secondary px-5 py-3 text-sm font-black text-white border-4 border-border hover:bg-interactive-hover transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {isExporting ? '⏳ Generando ZIP...' : `📦 Exportar ZIP (${selectedIds.size})`}
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border-4 border-border bg-bg-card p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Total Entregas</p>
            <p className="mt-2 text-3xl font-black text-text-main">{stats.totalCount}</p>
            <div className="mt-2 h-3 w-full bg-bg-main border-2 border-border rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="rounded-2xl border-4 border-border bg-bg-card p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Firmas Excepción (Testigo)</p>
            <p className="mt-2 text-3xl font-black text-danger">{stats.exceptionCount}</p>
            <div className="mt-2 h-3 w-full bg-bg-main border-2 border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-danger rounded-full"
                style={{ width: `${stats.totalCount ? (stats.exceptionCount / stats.totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-2xl border-4 border-border bg-bg-card p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Notificados</p>
            <p className="mt-2 text-3xl font-black text-success">{stats.sentCount}</p>
            <div className="mt-2 h-3 w-full bg-bg-main border-2 border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: `${stats.totalCount ? (stats.sentCount / stats.totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-2xl border-4 border-border bg-bg-card p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Notificaciones Fallidas</p>
            <p className="mt-2 text-3xl font-black text-warning">{stats.failedCount}</p>
            <div className="mt-2 h-3 w-full bg-bg-main border-2 border-border rounded-full overflow-hidden">
              <div
                className="h-full bg-warning rounded-full"
                style={{ width: `${stats.totalCount ? (stats.failedCount / stats.totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-8 rounded-2xl border-4 border-border bg-bg-card p-6">
          <h2 className="mb-4 text-lg font-black text-text-main">Filtros de búsqueda</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-bold text-text-main">
              RUT del Trabajador
              <input
                type="text"
                value={rutFilter}
                onChange={(e) => setRutFilter(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main placeholder:text-text-muted focus:border-secondary focus:outline-none font-bold"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-text-main">
              Fecha Desde
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main focus:border-secondary focus:outline-none font-bold"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-text-main">
              Fecha Hasta
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="rounded-xl border-4 border-border bg-bg-card px-4 py-3 text-text-main focus:border-secondary focus:outline-none font-bold"
              />
            </label>
          </div>
        </section>

        {/* Deliveries Table */}
        <div className="overflow-hidden rounded-2xl border-4 border-border bg-bg-card shadow-2xl">
          {error && (
            <div className="m-4 rounded-xl border-4 border-danger bg-danger/10 p-4 text-sm text-text-main font-bold">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-4 border-border bg-bg-card text-xs font-black uppercase tracking-wider text-text-main">
                  <th className="py-4 px-6">
                    <input
                      type="checkbox"
                      checked={deliveries.length > 0 && selectedIds.size === deliveries.length}
                      onChange={handleSelectAllToggle}
                      className="rounded border-4 border-border text-secondary focus:ring-secondary w-5 h-5 cursor-pointer accent-secondary"
                    />
                  </th>
                  <th className="py-4 px-6 font-black text-text-main">Trabajador / RUT</th>
                  <th className="py-4 px-6 font-black text-text-main">Fecha Entrega</th>
                  <th className="py-4 px-6 font-black text-text-main">Firma</th>
                  <th className="py-4 px-6 font-black text-text-main">Notificación</th>
                  <th className="py-4 px-6 font-black text-text-main">Geofencing</th>
                  <th className="py-4 px-6 font-black text-text-main">Integridad (SHA-256)</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-border text-sm font-bold text-text-main">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-text-muted">
                      <div className="animate-spin inline-block w-6 h-6 border-4 border-secondary border-t-transparent rounded-full mb-2"></div>
                      <p>Cargando registros...</p>
                    </td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-text-muted">
                      No se encontraron actas de entrega para los filtros especificados.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-bg-main transition-colors">
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(delivery.id)}
                          onChange={() => handleSelectToggle(delivery.id)}
                          className="rounded border-4 border-border text-secondary focus:ring-secondary w-5 h-5 cursor-pointer accent-secondary"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-black text-text-main">{delivery.workerFullName}</div>
                        <div className="text-xs text-text-muted">{delivery.rut}</div>
                      </td>
                      <td className="py-4 px-6 text-text-main">
                        {new Date(delivery.deliveredAt).toLocaleString('es-CL')}
                      </td>
                      <td className="py-4 px-6">
                        {delivery.isException ? (
                          <span className="inline-flex rounded-lg bg-warning text-white dark:text-black px-2.5 py-1 text-xs font-black border-2 border-border">
                            Testigo de Fe
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-success text-white px-2.5 py-1 text-xs font-black border-2 border-border">
                            Biométrica
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {delivery.notificationStatus === 'SENT' ? (
                          <span className="inline-flex rounded-lg bg-success text-white px-2.5 py-1 text-xs font-black border-2 border-border">
                            Enviada
                          </span>
                        ) : delivery.notificationStatus === 'FAILED' ? (
                          <span className="inline-flex rounded-lg bg-danger text-white px-2.5 py-1 text-xs font-black border-2 border-border">
                            Fallida
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-secondary text-white px-2.5 py-1 text-xs font-black border-2 border-border">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-text-muted">
                        {delivery.latitude && delivery.longitude ? (
                          <span>
                            {delivery.latitude.toFixed(4)}, {delivery.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span>Sin GPS</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-text-muted break-all max-w-xs">
                        {delivery.documentIntegrity?.sha256 || 'Generando...'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t-4 border-border bg-bg-card py-4 px-6 flex justify-between items-center text-sm font-bold text-text-main">
            <span className="text-text-muted">
              Mostrando {deliveries.length} de {total} registros
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl bg-secondary border-4 border-border px-4 py-2 font-black text-white hover:bg-interactive-hover transition disabled:opacity-50 active:scale-95"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl bg-secondary border-4 border-border px-4 py-2 font-black text-white hover:bg-interactive-hover transition disabled:opacity-50 active:scale-95"
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
