import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Web config is public by design: access is controlled by firestore.rules,
// not by keeping these values secret.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-chuo",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const useEmulators =
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ||
  config.projectId.startsWith("demo-");

// Logins are usernames (staff numbers, admission numbers). Firebase Auth
// needs an email, so each username maps to an address on a reserved domain
// that never receives mail.
export const LOGIN_DOMAIN = "login.chuo.invalid";

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_")}@${LOGIN_DOMAIN}`;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

const connect = (a: Auth, d?: Firestore) => {
  if (!useEmulators) return;
  connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
  if (d) connectFirestoreEmulator(d, "127.0.0.1", 8080);
};

export const firebase = () => {
  if (!app) {
    const fresh = getApps().length === 0;
    app = fresh ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = fresh
      ? initializeFirestore(app, {
          // Offline cache: pages open without network and sync on reconnect.
          localCache:
            typeof window === "undefined"
              ? undefined
              : persistentLocalCache({
                  tabManager: persistentMultipleTabManager(),
                }),
          ignoreUndefinedProperties: true,
        })
      : getFirestore(app);
    if (fresh) connect(auth, db);
  }
  return { app, auth, db };
};

// A second app instance lets an admin create a login for someone else
// without being signed out of their own session.
let provisioner: Auth | undefined;

export const provisioningAuth = () => {
  if (!provisioner) {
    const existing = getApps().find((a) => a.name === "provisioner");
    const second = existing ?? initializeApp(config, "provisioner");
    provisioner = getAuth(second);
    if (!existing) connect(provisioner);
  }
  return provisioner;
};
