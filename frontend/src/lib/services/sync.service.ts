import { IndexedDbService } from '../utils/indexed-db.service';
import { enrollmentApi } from './enrollment-api.service';
import { equipmentDeliveryApi } from './equipment-delivery-api.service';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';

type SyncListener = (status: SyncStatus, message?: string) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = 'IDLE';
  private isProcessing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('App returned online. Triggering auto-sync...');
        this.syncAll();
      });
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Emit current status immediately
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(status: SyncStatus, message?: string) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status, message));
  }

  async hasPendingData(): Promise<boolean> {
    try {
      const enrollments = await IndexedDbService.getEnrollments();
      const deliveries = await IndexedDbService.getDeliveries();
      return enrollments.length > 0 || deliveries.length > 0;
    } catch {
      return false;
    }
  }

  async syncAll(): Promise<void> {
    if (this.isProcessing) return;
    
    // Check connection
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('IDLE', 'Sin conexión a internet');
      return;
    }

    const pendingEnrollments = await IndexedDbService.getEnrollments();
    const pendingDeliveries = await IndexedDbService.getDeliveries();

    if (pendingEnrollments.length === 0 && pendingDeliveries.length === 0) {
      this.notify('IDLE');
      return;
    }

    this.isProcessing = true;
    this.notify('SYNCING', `Sincronizando ${pendingEnrollments.length} enrolamientos y ${pendingDeliveries.length} entregas...`);

    try {
      // 1. Sync enrollments first (deliveries might depend on them)
      for (const enrollment of pendingEnrollments) {
        if (!enrollment.id) continue;
        await enrollmentApi.registerIdentity({
          rut: enrollment.rut,
          biometricImageBase64: enrollment.facialImage,
          biometricType: enrollment.biometricType,
          signatureBase64: enrollment.signatureBase64,
        });
        await IndexedDbService.deleteEnrollment(enrollment.id);
      }

      // 2. Sync deliveries
      for (const delivery of pendingDeliveries) {
        if (!delivery.id) continue;
        await equipmentDeliveryApi.createEquipmentDeliveryDocument({
          rut: delivery.rut,
          workerFullName: delivery.workerFullName,
          biometricType: 'FACE', // default
          biometricImageBase64: '', // not needed if validated or isException
          signatureBase64: delivery.signatureBase64,
          equipmentItems: delivery.equipmentItems,
          latitude: delivery.latitude,
          longitude: delivery.longitude,
          isException: delivery.isException,
          witnessRut: delivery.witnessRut,
          witnessFullName: delivery.witnessFullName,
          witnessSignatureBase64: delivery.witnessSignatureBase64,
        });
        await IndexedDbService.deleteDelivery(delivery.id);
      }

      this.notify('SUCCESS', 'Sincronización completada con éxito');
      setTimeout(() => this.notify('IDLE'), 3000);
    } catch (error) {
      console.error('Error during synchronization:', error);
      this.notify('ERROR', 'Error al sincronizar algunos registros');
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncService = new SyncService();
