"use client";

import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LogoutPage = () => {
  const { signOut } = useAuth();
  const router = useRouter();
  useEffect(() => {
    signOut().finally(() => router.replace("/"));
  }, [signOut, router]);
  return <Spinner label="Signing out..." />;
};

export default LogoutPage;
