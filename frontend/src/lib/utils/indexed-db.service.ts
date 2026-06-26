export interface OfflineEnrollment {
  id?: number;
  rut: string;
  fullName: string;
  email: string;
  facialImage: string; // Base64
  biometricType: 'FACE' | 'PALM';
  signatureBase64: string;
  createdAt: string;
}

export interface OfflineDelivery {
  id?: number;
  userId: string;
  rut: string;
  workerFullName: string;
  equipmentItems: any[]; // Array of equipment items
  signatureBase64: string;
  latitude?: number;
  longitude?: number;
  isException: boolean;
  witnessRut?: string;
  witnessFullName?: string;
  witnessSignatureBase64?: string;
  deliveredAt: string;
}

export class IndexedDbService {
  private static DB_NAME = 'ObraFirmadaOfflineDB';
  private static DB_VERSION = 1;

  private static getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is not available on server-side'));
        return;
      }

      const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('enrollments')) {
          db.createObjectStore('enrollments', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('deliveries')) {
          db.createObjectStore('deliveries', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveEnrollment(enrollment: Omit<OfflineEnrollment, 'id'>): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('enrollments', 'readwrite');
      const store = transaction.objectStore('enrollments');
      const request = store.add(enrollment);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveDelivery(delivery: Omit<OfflineDelivery, 'id'>): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('deliveries', 'readwrite');
      const store = transaction.objectStore('deliveries');
      const request = store.add(delivery);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  static async getEnrollments(): Promise<OfflineEnrollment[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('enrollments', 'readonly');
      const store = transaction.objectStore('enrollments');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as OfflineEnrollment[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async getDeliveries(): Promise<OfflineDelivery[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('deliveries', 'readonly');
      const store = transaction.objectStore('deliveries');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as OfflineDelivery[]);
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteEnrollment(id: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('enrollments', 'readwrite');
      const store = transaction.objectStore('enrollments');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteDelivery(id: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('deliveries', 'readwrite');
      const store = transaction.objectStore('deliveries');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
