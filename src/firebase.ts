interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface FirebaseCompat {
  apps: unknown[];
  initializeApp: (config: Record<string, string>) => void;
  auth: (() => {
    currentUser: FirebaseUser | null;
    onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => () => void;
    signInWithRedirect: (provider: unknown) => Promise<void>;
    getRedirectResult: () => Promise<unknown>;
    signOut: () => Promise<void>;
  }) & { GoogleAuthProvider: new () => { setCustomParameters: (params: Record<string, string>) => void } };
  firestore: (() => {
    collection: (name: string) => {
      doc: (id: string) => {
        collection: (name: string) => {
          doc: (id: string) => FirebaseDocumentRef;
        };
      };
    };
  }) & { FieldValue: { serverTimestamp: () => unknown } };
}

interface FirebaseDocumentSnapshot {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
}

export interface FirebaseDocumentRef {
  onSnapshot: (
    success: (snapshot: FirebaseDocumentSnapshot) => void,
    failure?: (error: unknown) => void,
  ) => () => void;
  set: (data: Record<string, unknown>, options?: { merge: boolean }) => Promise<void>;
}

declare global {
  interface Window { firebase: FirebaseCompat }
}

const config = {
  apiKey: "AIzaSyD5DGOm-MfFBROSemPi1aMCCUK6zDnmuhQ",
  authDomain: "my-planner-5be93.web.app",
  projectId: "my-planner-5be93",
  storageBucket: "my-planner-5be93.firebasestorage.app",
  messagingSenderId: "948968797649",
  appId: "1:948968797649:web:4a715284c8f15e6b73dcf0",
};

if (!window.firebase.apps.length) window.firebase.initializeApp(config);

export const firebaseAuth = window.firebase.auth();
export const googleProvider = new window.firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const firestore = window.firebase.firestore();
export const serverTimestamp = () => window.firebase.firestore.FieldValue.serverTimestamp();
export type { FirebaseUser };
