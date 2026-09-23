"use client";

import { AuthProvider } from "@/lib/auth-context";
import { useEffect } from "react";
import { ToastContainer } from "react-toastify";

const Providers = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <AuthProvider>
      {children}
      <ToastContainer position="bottom-right" theme="dark" />
    </AuthProvider>
  );
};

export default Providers;
