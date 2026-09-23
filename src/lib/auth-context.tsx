"use client";

import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
  User,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { firebase, LOGIN_DOMAIN, usernameToEmail } from "./firebase";
import type { InstitutionSettings, Role, UserDoc } from "./types";

type AuthState = {
  loading: boolean;
  user: User | null;
  profile: UserDoc | null;
  role: Role | null;
  institution: InstitutionSettings | null;
  setupDone: boolean | null;
};

type AuthApi = AuthState & {
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  addRecoveryEmail: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

// Sign in with a username (staff or admission number) or, for people who
// have added a recovery email, with that email.
const loginEmail = (identifier: string) =>
  identifier.includes("@") ? identifier.trim() : usernameToEmail(identifier);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    profile: null,
    role: null,
    institution: null,
    setupDone: null,
  });

  useEffect(() => {
    const { auth, db } = firebase();
    let stopProfile: (() => void) | undefined;

    const stopSettings = onSnapshot(
      doc(db, "settings/institution"),
      (s) => setState((p) => ({ ...p, institution: s.exists() ? (s.data() as InstitutionSettings) : null })),
      () => undefined
    );
    const stopSetup = onSnapshot(
      doc(db, "meta/setup"),
      (s) => setState((p) => ({ ...p, setupDone: s.exists() })),
      () => setState((p) => ({ ...p, setupDone: true }))
    );

    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopProfile?.();
      if (!user) {
        setState((p) => ({ ...p, loading: false, user: null, profile: null, role: null }));
        return;
      }
      setState((p) => ({ ...p, loading: true, user }));
      stopProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          const profile = snap.exists() ? ({ id: snap.id, ...snap.data() } as UserDoc) : null;
          const usable = profile && profile.active;
          setState((p) => ({
            ...p,
            loading: false,
            user,
            profile: usable ? profile : null,
            role: usable ? profile.role : null,
          }));
        },
        () => setState((p) => ({ ...p, loading: false, profile: null, role: null }))
      );
    });

    return () => {
      stopAuth();
      stopProfile?.();
      stopSettings();
      stopSetup();
    };
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      ...state,
      signIn: async (identifier, password) => {
        await signInWithEmailAndPassword(firebase().auth, loginEmail(identifier), password);
      },
      signOut: () => fbSignOut(firebase().auth),
      changePassword: async (current, next) => {
        const user = firebase().auth.currentUser;
        if (!user?.email) throw new Error("Not signed in.");
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
        await updatePassword(user, next);
      },
      addRecoveryEmail: async (email) => {
        const user = firebase().auth.currentUser;
        if (!user) throw new Error("Not signed in.");
        await verifyBeforeUpdateEmail(user, email);
      },
      resetPassword: async (email) => {
        if (email.endsWith(LOGIN_DOMAIN) || !email.includes("@")) {
          throw new Error(
            "Password reset needs a recovery email. Ask the registry office to help you."
          );
        }
        await sendPasswordResetEmail(firebase().auth, email.trim());
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const authErrorMessage = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong username or password. If you added a recovery email, sign in with that email.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/email-already-in-use":
      return "That username is already taken.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/requires-recent-login":
      return "Sign out and sign in again, then retry.";
    default:
      return (e as Error)?.message ?? "Something went wrong.";
  }
};
