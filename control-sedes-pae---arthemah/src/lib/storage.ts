import { DatabaseSchema, Sede, Report, AppConfig } from '../types';
import {
  syncReportToFirestore,
  fetchReportsFromFirestore,
  syncSedesToFirestore,
  fetchSedesFromFirestore,
  deleteSedeFromFirestore,
  syncConfigToFirestore,
  testFirestoreConnection,
} from './firebase';
import { transcribeWithArthemahVision } from './visionService';

export interface OfflineVisionTask {
  id: string;
  photoBase64: string;
  sedeId: number;
  sedeName: string;
  manipuladoraName: string;
  filterApplied?: string;
  queuedAt: number;
}

const OFFLINE_VISION_QUEUE_KEY = 'arthemah_offline_vision_queue';

const SAMPLE_DOC_THUMBNAIL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">
  <rect width="200" height="240" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="20" y="18" width="160" height="12" fill="#0f3863" rx="2"/>
  <rect x="20" y="36" width="100" height="6" fill="#94a3b8" rx="2"/>
  <rect x="20" y="48" width="160" height="1" fill="#e2e8f0"/>
  <rect x="20" y="58" width="160" height="7" fill="#cbd5e1" rx="2"/>
  <rect x="20" y="70" width="140" height="7" fill="#cbd5e1" rx="2"/>
  <rect x="20" y="82" width="150" height="7" fill="#cbd5e1" rx="2"/>
  <rect x="20" y="94" width="130" height="7" fill="#cbd5e1" rx="2"/>
  <rect x="20" y="106" width="160" height="7" fill="#cbd5e1" rx="2"/>
  <rect x="20" y="118" width="145" height="7" fill="#cbd5e1" rx="2"/>
  <rect x="20" y="130" width="155" height="7" fill="#cbd5e1" rx="2"/>
  <circle cx="150" cy="180" r="22" fill="none" stroke="#0d9488" stroke-width="2" stroke-dasharray="3,2"/>
  <text x="150" y="184" font-size="7" font-family="sans-serif" font-weight="bold" fill="#0d9488" text-anchor="middle">VERIFICADO</text>
  <path d="M 25 200 Q 50 185, 80 195 T 120 190" fill="none" stroke="#0f3863" stroke-width="2"/>
</svg>
`)}`;

// Dates matching 16/09 in user's image
const baseTime = new Date('2026-09-16T16:22:00').getTime();

const INITIAL_DATA: DatabaseSchema = {
  config: {
    adminPin: '2281',
    appName: 'Control Sedes PAE - Arthemah',
  },
  sedes: [
    { id: 1, name: 'La Linda', manipuladoraName: 'Jhoana Henao Holguin', isActive: true },
    { id: 2, name: 'Sede Comedor Central', manipuladoraName: 'Rosa María Mendoza', isActive: true },
    { id: 3, name: 'Sede Escuela Las Palmas', manipuladoraName: 'Carmen Alicia Silva', isActive: true },
  ],
  reports: [
    {
      id: 1,
      sedeId: 1,
      sedeName: 'La Linda',
      manipuladoraName: 'Jhoana Henao Holguin',
      notes: 'hshshdhdh',
      filterApplied: 'magic_color',
      photoBase64: SAMPLE_DOC_THUMBNAIL,
      syncStatus: 'SYNCED',
      createdAt: new Date('2026-09-16T16:22:00').getTime() || baseTime,
    },
    {
      id: 2,
      sedeId: 1,
      sedeName: 'La Linda',
      manipuladoraName: 'Jhoana Henao Holguin',
      notes: '¡Claro que sí! Aquí tienes la transcripción detallada del texto legible de la imagen,',
      filterApplied: 'magic_color',
      photoBase64: SAMPLE_DOC_THUMBNAIL,
      syncStatus: 'SYNCED',
      createdAt: new Date('2026-09-16T11:48:00').getTime() || baseTime - 1000 * 60 * 274,
    },
    {
      id: 3,
      sedeId: 1,
      sedeName: 'La Linda',
      manipuladoraName: 'Jhoana Henao Holguin',
      notes: '¡Claro que sí! Aquí tienes la transcripción detallada y organizada del texto legible de la imagen:',
      filterApplied: 'magic_color',
      photoBase64: SAMPLE_DOC_THUMBNAIL,
      syncStatus: 'SYNCED',
      createdAt: new Date('2026-09-16T10:40:00').getTime() || baseTime - 1000 * 60 * 342,
    },
    {
      id: 4,
      sedeId: 1,
      sedeName: 'La Linda',
      manipuladoraName: 'Jhoana Henao Holguin',
      notes: 'hshshdhdh',
      filterApplied: 'magic_color',
      photoBase64: SAMPLE_DOC_THUMBNAIL,
      syncStatus: 'SYNCED',
      createdAt: new Date('2026-09-16T10:39:00').getTime() || baseTime - 1000 * 60 * 343,
    },
    {
      id: 5,
      sedeId: 1,
      sedeName: 'La Linda',
      manipuladoraName: 'Jhoana Henao Holguin',
      notes: '¡Claro que sí! Con gusto transcribo el contenido de la imagen. Planilla de entrega con firmas completas y temperaturas registradas.',
      filterApplied: 'magic_color',
      photoBase64: SAMPLE_DOC_THUMBNAIL,
      syncStatus: 'SYNCED',
      createdAt: new Date('2026-09-16T10:20:00').getTime() || baseTime - 1000 * 60 * 362,
    },
  ],
};

const DB_NAME = 'arthemah_pae_offline_db';
const DB_VERSION = 1;
const STORE_KEY_PREFIX = 'arthemah_pae_data';

// IndexedDB Helper for persistent offline storage (especially for high-res images)
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sedes')) {
        db.createObjectStore('sedes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };
  });
}

function sanitizeDatabase(schema: DatabaseSchema): DatabaseSchema {
  const seenSedeNames = new Set<string>();
  const sanitizedSedes: Sede[] = [];
  const oldToNewSedeIdMap = new Map<number, number>();

  // Prioritize sedes: 'La Linda' first if present
  const allSedes = [...(schema.sedes || [])];
  allSedes.sort((a, b) => {
    const aIsLinda = a.name.toLowerCase().includes('linda') ? -1 : 1;
    const bIsLinda = b.name.toLowerCase().includes('linda') ? -1 : 1;
    return aIsLinda - bIsLinda;
  });

  let nextSedeId = 1;
  for (const s of allSedes) {
    if (!s || !s.name) continue;
    const normalizedName = s.name.trim().toLowerCase();
    if (seenSedeNames.has(normalizedName)) {
      const existing = sanitizedSedes.find((item) => item.name.trim().toLowerCase() === normalizedName);
      if (existing) {
        oldToNewSedeIdMap.set(s.id, existing.id);
      }
      continue;
    }
    seenSedeNames.add(normalizedName);
    const assignedId = nextSedeId++;
    oldToNewSedeIdMap.set(s.id, assignedId);
    sanitizedSedes.push({
      id: assignedId,
      name: s.name.trim(),
      manipuladoraName: (s.manipuladoraName || 'Manipuladora Asignada').trim(),
      isActive: s.isActive !== false,
    });
  }

  // If no sedes, fall back to initial
  if (sanitizedSedes.length === 0) {
    INITIAL_DATA.sedes.forEach((s) => {
      sanitizedSedes.push({ ...s });
      oldToNewSedeIdMap.set(s.id, s.id);
    });
  }

  // Deduplicate and re-index reports with unique sequential IDs
  const sanitizedReports: Report[] = [];
  const seenReportSignatures = new Set<string>();
  let nextReportId = 1;

  for (const r of schema.reports || []) {
    if (!r) continue;
    const mappedSedeId = oldToNewSedeIdMap.get(r.sedeId) || r.sedeId || 1;
    const matchedSede = sanitizedSedes.find((s) => s.id === mappedSedeId) || sanitizedSedes[0];

    // Deduplicate by mapped sede + timestamp + notes snippet
    const signature = `${mappedSedeId}_${r.createdAt}_${(r.notes || '').slice(0, 30)}`;
    if (seenReportSignatures.has(signature)) {
      continue;
    }
    seenReportSignatures.add(signature);

    sanitizedReports.push({
      ...r,
      id: nextReportId++,
      sedeId: matchedSede.id,
      sedeName: matchedSede.name,
      manipuladoraName: r.manipuladoraName || matchedSede.manipuladoraName,
      syncStatus: r.syncStatus || 'SYNCED',
    });
  }

  // If no reports, fall back to initial
  if (sanitizedReports.length === 0) {
    INITIAL_DATA.reports.forEach((rep) => {
      sanitizedReports.push({ ...rep });
    });
  }

  return {
    config: {
      ...INITIAL_DATA.config,
      ...(schema.config || {}),
    },
    sedes: sanitizedSedes,
    reports: sanitizedReports,
  };
}

class StorageManager {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): DatabaseSchema {
    try {
      const raw = localStorage.getItem(STORE_KEY_PREFIX);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sedes) && Array.isArray(parsed.reports)) {
          // If La Linda is missing, merge initial data
          const hasLaLinda = parsed.sedes.some((s: Sede) => s.name?.toLowerCase().includes('linda'));
          if (!hasLaLinda) {
            parsed.sedes = [...INITIAL_DATA.sedes, ...parsed.sedes];
            parsed.reports = [...INITIAL_DATA.reports, ...parsed.reports];
          }
          return sanitizeDatabase(parsed);
        }
      }
    } catch {
      // ignore
    }
    return sanitizeDatabase(JSON.parse(JSON.stringify(INITIAL_DATA)));
  }

  private saveToLocalStorage() {
    try {
      this.data = sanitizeDatabase(this.data);
      localStorage.setItem(STORE_KEY_PREFIX, JSON.stringify(this.data));
    } catch (e) {
      console.warn('LocalStorage full or quota exceeded, relying on IndexedDB', e);
    }
    this.notifyListeners();
  }

  public async init() {
    if (this.isInitialized) return;
    try {
      const db = await openIDB();
      // Load sedes from IDB
      const sedesFromIDB = await this.getAllFromStore<Sede>(db, 'sedes');
      const reportsFromIDB = await this.getAllFromStore<Report>(db, 'reports');

      const rawSedes = sedesFromIDB.length > 0 ? sedesFromIDB : this.data.sedes;
      const rawReports = reportsFromIDB.length > 0 ? reportsFromIDB : this.data.reports;

      // Sanitize everything to guarantee 100% unique primary keys and foreign keys
      this.data = sanitizeDatabase({
        config: this.data.config,
        sedes: rawSedes,
        reports: rawReports,
      });

      // Wipe IDB stores and re-populate with clean unique data
      await this.clearAndRepopulateIDBStore(db, 'sedes', this.data.sedes);
      await this.clearAndRepopulateIDBStore(db, 'reports', this.data.reports);

      // Load config from IDB
      const configItem = await this.getOneFromStore<{ key: string; val: AppConfig }>(db, 'config', 'appConfig');
      if (configItem?.val) {
        this.data.config = configItem.val;
      } else {
        await this.putInStore(db, 'config', { key: 'appConfig', val: this.data.config });
      }

      this.saveToLocalStorage();
      this.isInitialized = true;

      // Background Firebase synchronization if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.syncWithFirebase().catch((e) => console.warn('Background Firebase sync:', e));
      }
    } catch (err) {
      console.warn('Falling back entirely to LocalStorage mode', err);
      this.isInitialized = true;
    }
  }

  /**
   * Synchronizes data with Firebase Firestore
   */
  public async syncWithFirebase(): Promise<{ connected: boolean; syncedReports: number; syncedSedes: number }> {
    try {
      const connTest = await testFirestoreConnection();
      if (!connTest.connected) {
        return { connected: false, syncedReports: 0, syncedSedes: 0 };
      }

      // 1. Sync sedes to Firestore
      await syncSedesToFirestore(this.data.sedes);

      // 2. Fetch remote sedes and merge
      const remoteSedes = await fetchSedesFromFirestore();
      if (remoteSedes && remoteSedes.length > 0) {
        const mergedSedesMap = new Map<number, Sede>();
        this.data.sedes.forEach((s) => mergedSedesMap.set(s.id, s));
        remoteSedes.forEach((s) => {
          if (!mergedSedesMap.has(s.id)) {
            mergedSedesMap.set(s.id, s);
          }
        });
        this.data.sedes = Array.from(mergedSedesMap.values());
      }

      // 3. Sync pending reports to Firestore
      let syncedReportsCount = 0;
      const pendings = this.data.reports.filter((r) => r.syncStatus === 'PENDING');
      for (const rep of pendings) {
        const ok = await syncReportToFirestore(rep);
        if (ok) {
          rep.syncStatus = 'SYNCED';
          rep.syncedAt = Date.now();
          syncedReportsCount++;
        }
      }

      // 4. Fetch any newer remote reports
      const remoteReports = await fetchReportsFromFirestore();
      if (remoteReports && remoteReports.length > 0) {
        const existingReportIds = new Set(this.data.reports.map((r) => r.id));
        remoteReports.forEach((rr) => {
          if (!existingReportIds.has(rr.id)) {
            this.data.reports.push(rr);
            existingReportIds.add(rr.id);
          }
        });
        this.data.reports.sort((a, b) => b.createdAt - a.createdAt);
      }

      this.saveToLocalStorage();

      // 5. Process offline vision queue
      await this.processOfflineVisionQueue();

      return {
        connected: true,
        syncedReports: syncedReportsCount,
        syncedSedes: this.data.sedes.length,
      };
    } catch (err) {
      console.warn('Firebase sync failed, retaining offline copy:', err);
      return { connected: false, syncedReports: 0, syncedSedes: 0 };
    }
  }

  /**
   * Offline Vision Queue management for Arthemah AI
   */
  public getOfflineVisionQueue(): OfflineVisionTask[] {
    try {
      const raw = localStorage.getItem(OFFLINE_VISION_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public queueOfflineVision(task: Omit<OfflineVisionTask, 'id' | 'queuedAt'>): OfflineVisionTask {
    const queue = this.getOfflineVisionQueue();
    const newTask: OfflineVisionTask = {
      ...task,
      id: `vis_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      queuedAt: Date.now(),
    };
    queue.push(newTask);
    try {
      localStorage.setItem(OFFLINE_VISION_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to save offline vision task to localStorage', e);
    }
    this.notifyListeners();
    return newTask;
  }

  public removeOfflineVisionTask(id: string): void {
    const queue = this.getOfflineVisionQueue().filter((t) => t.id !== id);
    try {
      localStorage.setItem(OFFLINE_VISION_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  /**
   * When recovering signal: Process pending vision transcriptions
   * with Arthemah Vision API and save directly to Firebase!
   */
  public async processOfflineVisionQueue(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
    const queue = this.getOfflineVisionQueue();
    if (queue.length === 0) return 0;

    let processedCount = 0;
    for (const task of [...queue]) {
      try {
        const visionResult = await transcribeWithArthemahVision(task.photoBase64, task.sedeName);
        if (visionResult.success && visionResult.reply) {
          // Save report automatically with AI transcription and audit
          const newReport = await this.saveReport({
            sedeId: task.sedeId,
            sedeName: task.sedeName,
            manipuladoraName: task.manipuladoraName,
            notes: visionResult.reply,
            rations: visionResult.extractedRations,
            filterApplied: task.filterApplied || 'magic_color',
            photoBase64: task.photoBase64,
            syncStatus: 'SYNCED',
            syncedAt: Date.now(),
            transcriptionByAI: true,
            auditDetails: visionResult.audit,
            aiModel: visionResult.model || 'google/gemini-2.5-flash',
          });

          // Upload to Firebase
          await syncReportToFirestore(newReport);

          this.removeOfflineVisionTask(task.id);
          processedCount++;
        }
      } catch (err) {
        console.warn(`Error processing offline vision task ${task.id}:`, err);
      }
    }

    if (processedCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('arthemah:vision-synced', {
          detail: { count: processedCount },
        })
      );
    }

    return processedCount;
  }

  private getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  private getOneFromStore<T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | null> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private putInStore(db: IDBDatabase, storeName: string, item: unknown): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private deleteFromStore(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private clearAndRepopulateIDBStore<T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private async populateIDBStore<T>(db: IDBDatabase, storeName: string, items: T[]) {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
    } catch {
      // ignore
    }
  }

  private notifyListeners() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arthemah:data-updated', { detail: this.data }));
    }
  }

  // --- Public Data Methods ---

  public getConfig(): AppConfig {
    return { ...this.data.config };
  }

  public async setConfig(newConfig: Partial<AppConfig>) {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveToLocalStorage();
    try {
      const db = await openIDB();
      await this.putInStore(db, 'config', { key: 'appConfig', val: this.data.config });
    } catch {
      // ignore
    }
  }

  public getSedes(): Sede[] {
    return [...this.data.sedes];
  }

  public getActiveSedes(): Sede[] {
    return this.data.sedes.filter((s) => s.isActive);
  }

  public async addSede(name: string, manipuladoraName: string): Promise<Sede> {
    const nextId = this.data.sedes.length > 0 ? Math.max(...this.data.sedes.map((s) => s.id)) + 1 : 1;
    const newSede: Sede = {
      id: nextId,
      name: name.trim(),
      manipuladoraName: manipuladoraName.trim(),
      isActive: true,
    };
    this.data.sedes.push(newSede);
    this.saveToLocalStorage();
    try {
      const db = await openIDB();
      await this.putInStore(db, 'sedes', newSede);
    } catch {
      // ignore
    }

    // Sync to Firestore if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncSedesToFirestore([newSede]).catch((err) => console.warn('Firestore addSede:', err));
    }

    return newSede;
  }

  public async updateSede(sede: Sede) {
    const idx = this.data.sedes.findIndex((s) => s.id === sede.id);
    if (idx !== -1) {
      this.data.sedes[idx] = { ...sede };
      this.saveToLocalStorage();
      try {
        const db = await openIDB();
        await this.putInStore(db, 'sedes', this.data.sedes[idx]);
      } catch {
        // ignore
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncSedesToFirestore([this.data.sedes[idx]]).catch((err) => console.warn('Firestore updateSede:', err));
      }
    }
  }

  public async toggleSedeStatus(id: number) {
    const sede = this.data.sedes.find((s) => s.id === id);
    if (sede) {
      sede.isActive = !sede.isActive;
      this.saveToLocalStorage();
      try {
        const db = await openIDB();
        await this.putInStore(db, 'sedes', sede);
      } catch {
        // ignore
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncSedesToFirestore([sede]).catch((err) => console.warn('Firestore toggleSede:', err));
      }
    }
  }

  public async deleteSede(id: number) {
    this.data.sedes = this.data.sedes.filter((s) => s.id !== id);
    this.saveToLocalStorage();
    try {
      const db = await openIDB();
      await this.deleteFromStore(db, 'sedes', id);
    } catch {
      // ignore
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      deleteSedeFromFirestore(id).catch((err) => console.warn('Firestore deleteSede:', err));
    }
  }

  public getReports(sedeId?: number): Report[] {
    if (sedeId !== undefined) {
      return this.data.reports
        .filter((r) => r.sedeId === sedeId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return [...this.data.reports].sort((a, b) => b.createdAt - a.createdAt);
  }

  public getPendingReportsCount(): number {
    return this.data.reports.filter((r) => r.syncStatus === 'PENDING').length;
  }

  public async saveReport(reportData: Omit<Report, 'id' | 'createdAt'>): Promise<Report> {
    const nextId = this.data.reports.length > 0 ? Math.max(...this.data.reports.map((r) => r.id)) + 1 : 1;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const newReport: Report = {
      ...reportData,
      id: nextId,
      createdAt: Date.now(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING',
      syncedAt: isOnline ? Date.now() : null,
    };
    this.data.reports.unshift(newReport);
    this.saveToLocalStorage();

    try {
      const db = await openIDB();
      await this.putInStore(db, 'reports', newReport);
    } catch {
      // ignore
    }

    // Sync to Firestore if online
    if (isOnline) {
      syncReportToFirestore(newReport)
        .then((ok) => {
          if (!ok) {
            newReport.syncStatus = 'PENDING';
            this.saveToLocalStorage();
          }
        })
        .catch(() => {
          newReport.syncStatus = 'PENDING';
          this.saveToLocalStorage();
        });
    }

    return newReport;
  }

  public async markReportAsSynced(id: number) {
    const report = this.data.reports.find((r) => r.id === id);
    if (report) {
      report.syncStatus = 'SYNCED';
      report.syncedAt = Date.now();
      this.saveToLocalStorage();
      try {
        const db = await openIDB();
        await this.putInStore(db, 'reports', report);
      } catch {
        // ignore
      }
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncReportToFirestore(report).catch(() => {});
      }
    }
  }

  public async syncAllPending(): Promise<{ syncedCount: number; errors: number }> {
    const pendings = this.data.reports.filter((r) => r.syncStatus === 'PENDING');
    let synced = 0;
    let errors = 0;

    for (const rep of pendings) {
      try {
        const success = await syncReportToFirestore(rep);
        if (success) {
          rep.syncStatus = 'SYNCED';
          rep.syncedAt = Date.now();
          synced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    // Also process offline vision tasks
    try {
      await this.processOfflineVisionQueue();
    } catch (e) {
      console.warn('Error syncing offline vision queue:', e);
    }

    // Also sync all sedes
    try {
      await syncSedesToFirestore(this.data.sedes);
    } catch (e) {
      console.warn('Error syncing sedes to Firestore:', e);
    }

    this.saveToLocalStorage();
    try {
      const db = await openIDB();
      for (const rep of pendings) {
        await this.putInStore(db, 'reports', rep);
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arthemah:sync-complete', { detail: { count: synced } }));
    }

    return { syncedCount: synced, errors };
  }
}

export const storage = new StorageManager();
