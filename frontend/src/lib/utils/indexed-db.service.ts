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

class EncryptionHelper {
  private static KEY_STRING = 'obrafirmada_secret_local_key_19628';
  
  private static async getKey(): Promise<CryptoKey> {
    const rawKey = new TextEncoder().encode(this.KEY_STRING.padEnd(32).slice(0, 32));
    return window.crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(text: string): Promise<string> {
    if (typeof window === 'undefined') return text;
    try {
      const key = await this.getKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(text);
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );
      
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.error('Encryption error:', e);
      return text;
    }
  }

  static async decrypt(ciphertextBase64: string): Promise<string> {
    if (typeof window === 'undefined') return ciphertextBase64;
    try {
      const key = await this.getKey();
      const binaryString = atob(ciphertextBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const iv = bytes.slice(0, 12);
      const encrypted = bytes.slice(12);
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('Decryption error:', e);
      return ciphertextBase64;
    }
  }
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
    const serialized = JSON.stringify(enrollment);
    const encryptedData = await EncryptionHelper.encrypt(serialized);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('enrollments', 'readwrite');
      const store = transaction.objectStore('enrollments');
      const request = store.add({ encryptedData });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveDelivery(delivery: Omit<OfflineDelivery, 'id'>): Promise<number> {
    const db = await this.getDB();
    const serialized = JSON.stringify(delivery);
    const encryptedData = await EncryptionHelper.encrypt(serialized);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('deliveries', 'readwrite');
      const store = transaction.objectStore('deliveries');
      const request = store.add({ encryptedData });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  static async getEnrollments(): Promise<OfflineEnrollment[]> {
    const db = await this.getDB();
    const rawList: { id: number; encryptedData: string }[] = await new Promise((resolve, reject) => {
      const transaction = db.transaction('enrollments', 'readonly');
      const store = transaction.objectStore('enrollments');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const decryptedList: OfflineEnrollment[] = [];
    for (const item of rawList) {
      try {
        const decrypted = await EncryptionHelper.decrypt(item.encryptedData);
        const parsed = JSON.parse(decrypted);
        decryptedList.push({ ...parsed, id: item.id });
      } catch (err) {
        console.error('Error decrypting enrollment:', err);
      }
    }
    return decryptedList;
  }

  static async getDeliveries(): Promise<OfflineDelivery[]> {
    const db = await this.getDB();
    const rawList: { id: number; encryptedData: string }[] = await new Promise((resolve, reject) => {
      const transaction = db.transaction('deliveries', 'readonly');
      const store = transaction.objectStore('deliveries');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const decryptedList: OfflineDelivery[] = [];
    for (const item of rawList) {
      try {
        const decrypted = await EncryptionHelper.decrypt(item.encryptedData);
        const parsed = JSON.parse(decrypted);
        decryptedList.push({ ...parsed, id: item.id });
      } catch (err) {
        console.error('Error decrypting delivery:', err);
      }
    }
    return decryptedList;
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
