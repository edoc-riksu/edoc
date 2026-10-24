"use client";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch {
    return { ok: false, networkError: true, status: 0, data: null };
  }

  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  return { ok: res.ok, networkError: false, status: res.status, data };
}

export function signup({ callsign, email, password }) {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify({ callsign, email, password }) });
}

export function signin({ email, password, remember }) {
  return request("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password, remember }) });
}

export function signout() {
  return request("/api/auth/signout", { method: "POST" });
}

export function getSession() {
  return request("/api/auth/me", { method: "GET" });
}

export function checkCallsignAvailable(callsign) {
  return request(`/api/auth/callsign-available?callsign=${encodeURIComponent(callsign)}`, { method: "GET" });
}
export function updateProfile(patch) {
  return request("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}