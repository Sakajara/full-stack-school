"use client";

import { authErrorMessage, useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LoginPage = () => {
  const { loading, user, role, institution, setupDone, signIn, signOut, resetPassword } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role) router.replace(homeFor(role));
  }, [role, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    try {
      await resetPassword(identifier);
      setNotice("If that email is registered, a reset link is on its way.");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  // Signed in, but the account is archived or has no profile.
  const blocked = !loading && user && !role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-lamaSkyLight p-4">
      <form
        onSubmit={submit}
        className="bg-white p-8 sm:p-12 rounded-md shadow-2xl flex flex-col gap-2 w-full max-w-sm"
      >
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          {institution?.shortName ?? "Chuo"}
        </h1>
        <h2 className="text-gray-400">
          {institution?.name ? `Sign in to ${institution.name}` : "Sign in to your account"}
        </h2>

        {setupDone === false && (
          <p className="text-sm bg-lamaYellowLight p-3 rounded-md">
            This installation has not been set up yet.{" "}
            <Link href="/setup" className="underline font-medium">
              Set it up now
            </Link>
            .
          </p>
        )}

        {blocked && (
          <div className="text-sm bg-red-50 text-red-600 p-3 rounded-md">
            This account is not active. Contact the registry office.{" "}
            <button type="button" onClick={() => signOut()} className="underline">
              Sign out
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}

        <label className="flex flex-col gap-2">
          <span className="text-xs text-gray-500">Admission number, staff number or email</span>
          <input
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="p-2 rounded-md ring-1 ring-gray-300"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-gray-500">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded-md ring-1 ring-gray-300"
          />
        </label>
        <button
          disabled={busy || loading}
          className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px] disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign In"}
        </button>
        <button type="button" onClick={forgot} className="text-xs text-gray-500 underline self-start">
          Forgot password? (needs a recovery email)
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
