"use client";

import { Suspense } from "react";
import Spinner from "./Spinner";

// Pages that read the URL's query string must render inside Suspense when
// the site is exported statically.
export const withSuspense = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => (
    <Suspense fallback={<Spinner />}>
      <Component {...props} />
    </Suspense>
  );
  Wrapped.displayName = `WithSuspense(${Component.displayName ?? Component.name})`;
  return Wrapped;
};

export const Notice = ({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "error" }) => (
  <div
    className={`text-sm rounded-md p-3 ${
      tone === "error" ? "bg-red-50 text-red-600" : tone === "warn" ? "bg-lamaYellowLight" : "bg-lamaSkyLight"
    }`}
    role={tone === "error" ? "alert" : undefined}
  >
    {children}
  </div>
);
