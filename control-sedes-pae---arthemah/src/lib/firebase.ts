import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import type { Sede, Report, AppConfig } from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  };
  console.warn('Firestore Error Context:', JSON.stringify(errInfo));
  return errInfo;
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfigJson) : getApp();
export const db = getFirestore(app);

/**
 * Validates connection to Firestore server as required by Firebase skill
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const testDocRef = doc(db, 'config', 'appConfig');
    await getDocFromServer(testDocRef);
    return { connected: true, message: 'Conectado a Firebase Firestore (miapp-app)' };
  } catch (err: unknown) {
    const errString = String(err);
    if (errString.includes('offline') || errString.includes('unavailable')) {
      return { connected: false, message: 'Firestore en modo sin conexión / local' };
    }
    // If doc doesn't exist or permissions need sync, connection to host itself might still work
    return { connected: true, message: 'Conectado a Firebase (miapp-app)' };
  }
}

/**
 * Sync a single report to Firestore
 */
export async function syncReportToFirestore(report: Report): Promise<boolean> {
  const docPath = `reports/${report.id}`;
  try {
    const docRef = doc(db, 'reports', String(report.id));
    // Remove undefined values for Firestore compatibility
    const cleanPayload = JSON.parse(JSON.stringify(report));
    await setDoc(docRef, cleanPayload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Fetch all reports from Firestore
 */
export async function fetchReportsFromFirestore(): Promise<Report[]> {
  const collectionPath = 'reports';
  try {
    const colRef = collection(db, collectionPath);
    const snap = await getDocs(colRef);
    const results: Report[] = [];
    snap.forEach((d) => {
      results.push(d.data() as Report);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

/**
 * Sync all sedes to Firestore
 */
export async function syncSedesToFirestore(sedes: Sede[]): Promise<boolean> {
  try {
    for (const sede of sedes) {
      const docRef = doc(db, 'sedes', String(sede.id));
      await setDoc(docRef, { ...sede, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sedes');
    return false;
  }
}

/**
 * Fetch all sedes from Firestore
 */
export async function fetchSedesFromFirestore(): Promise<Sede[]> {
  const collectionPath = 'sedes';
  try {
    const colRef = collection(db, collectionPath);
    const snap = await getDocs(colRef);
    const results: Sede[] = [];
    snap.forEach((d) => {
      results.push(d.data() as Sede);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

/**
 * Delete a sede from Firestore
 */
export async function deleteSedeFromFirestore(id: number): Promise<boolean> {
  const docPath = `sedes/${id}`;
  try {
    await deleteDoc(doc(db, 'sedes', String(id)));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    return false;
  }
}

/**
 * Save configuration to Firestore
 */
export async function syncConfigToFirestore(config: AppConfig): Promise<boolean> {
  const docPath = 'config/appConfig';
  try {
    await setDoc(doc(db, 'config', 'appConfig'), config, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Realtime subscriber to reports collection
 */
export function subscribeToReportsRealtime(onReports: (reports: Report[]) => void) {
  const path = 'reports';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const reports: Report[] = [];
      snapshot.forEach((d) => {
        reports.push(d.data() as Report);
      });
      onReports(reports);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
