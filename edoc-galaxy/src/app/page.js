"use client";
import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import Galaxy from "../galaxy/Galaxy";
import { AuthProvider, useAuth } from "../context/AuthContext";

function Gate() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin?returnTo=%2F");
    }
  }, [loading, user, router]);

  if (loading || !user) return null;
  return <Galaxy />;
}

export default function Page() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </AuthProvider>
  );
}
