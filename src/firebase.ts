import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { Category } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAIL = 'patilyuva6@gmail.com';

export const DEFAULT_CATEGORIES: Category[] = [
  { category_id: 'electronics', category_name: 'Electronics' },
  { category_id: 'id-cards-keys', category_name: 'ID Cards & Keys' },
  { category_id: 'books-stationery', category_name: 'Books & Stationery' },
  { category_id: 'bags-accessories', category_name: 'Bags & Accessories' },
  { category_id: 'wallets-valuables', category_name: 'Wallets & Valuables' },
  { category_id: 'clothing-footwear', category_name: 'Clothing & Footwear' },
  { category_id: 'lab-sports-gear', category_name: 'Lab & Sports Gear' },
  { category_id: 'other', category_name: 'Other' },
];

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function checkIsAdminUser(uid: string, email: string | null | undefined): Promise<boolean> {
  if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export async function seedCampusDefaultsIfNeeded(adminUid: string): Promise<boolean> {
  try {
    const catSnap = await getDocs(query(collection(db, 'categories'), limit(1)));
    const itemSnap = await getDocs(query(collection(db, 'items'), limit(1)));

    if (!catSnap.empty && !itemSnap.empty) {
      return false;
    }

    const batch = writeBatch(db);

    if (catSnap.empty) {
      for (const cat of DEFAULT_CATEGORIES) {
        batch.set(doc(db, 'categories', cat.category_id), {
          category_name: cat.category_name,
        });
      }
    }

    if (itemSnap.empty) {
      const sampleItems = [
        {
          id: 'sample_laptop_sleeve',
          user_id: adminUid,
          reporter_name: 'Aarav Kulkarni',
          category_id: 'bags-accessories',
          category_name: 'Bags & Accessories',
          item_name: 'Navy Padded Laptop Sleeve & Wireless Mouse',
          description:
            '14-inch dark navy zip sleeve with a compact silver wireless mouse inside the front pocket. Left on the silent reading desk near the second-floor window.',
          report_type: 'found',
          item_date: '2026-11-20',
          location: 'Central Library — 2nd Floor Reading Wing',
          image: '/src/assets/images/item_laptop_sleeve_1795497659452.jpg',
          status: 'approved',
        },
        {
          id: 'sample_student_lanyard',
          user_id: adminUid,
          reporter_name: 'Sneha Nair',
          category_id: 'id-cards-keys',
          category_name: 'ID Cards & Keys',
          item_name: 'Campus ID Card on Navy Lanyard with Two Brass Keys',
          description:
            'Plastic student access holder attached to a woven navy lanyard and two numbered locker keys. Found near the main auditorium entrance steps after the morning assembly.',
          report_type: 'found',
          item_date: '2026-11-21',
          location: 'Main Auditorium Entrance Steps',
          image: '/src/assets/images/item_student_lanyard_1795497660745.jpg',
          status: 'approved',
        },
        {
          id: 'sample_calculator',
          user_id: adminUid,
          reporter_name: 'Rohan Deshmukh',
          category_id: 'books-stationery',
          category_name: 'Books & Stationery',
          item_name: 'Matte Black Scientific Graphing Calculator & Navy Notebook',
          description:
            'Casio scientific graphing calculator paired with a dark navy hardcover notebook containing Data Structures lecture notes. Last seen after the 11 AM lab session.',
          report_type: 'lost',
          item_date: '2026-11-19',
          location: 'Computer Science Block — Lab 304',
          image: '/src/assets/images/item_scientific_calculator_1795497660172.jpg',
          status: 'approved',
        },
        {
          id: 'sample_headphones',
          user_id: adminUid,
          reporter_name: 'Meera Krishnan',
          category_id: 'electronics',
          category_name: 'Electronics',
          item_name: 'Charcoal Over-Ear Wireless ANC Headphones',
          description:
            'Matte charcoal wireless headphones with brushed silver hinges and USB-C charging port. Misplaced near the student cafeteria seating booth.',
          report_type: 'lost',
          item_date: '2026-11-22',
          location: 'Student Cafeteria — East Booths',
          image: '/src/assets/images/item_wireless_headphones_1795497660750.jpg',
          status: 'approved',
        },
        {
          id: 'sample_cardholder',
          user_id: adminUid,
          reporter_name: 'Sneha Nair',
          category_id: 'wallets-valuables',
          category_name: 'Wallets & Valuables',
          item_name: 'Brown Leather Bi-Fold Cardholder',
          description:
            'Slim brown leather cardholder containing metro transit pass and library card. Turned in to the Academic Block reception desk.',
          report_type: 'found',
          item_date: '2026-11-17',
          location: 'Academic Block A — Reception Counter',
          image: null,
          status: 'returned',
        },
      ];

      for (const sample of sampleItems) {
        const { id, ...fields } = sample;
        batch.set(doc(db, 'items', id), {
          ...fields,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'items');
  }
}
