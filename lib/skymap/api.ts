// Frontend API client for the buyer dashboard.
//
// IMPORTANT: This file contains NO backend logic. Every function below calls a
// REST endpoint that is expected to exist on the backend (see the TODO on each
// function). Until those routes are implemented, calls here will fail with a
// network/404 error — the UI is built to handle that via loading/error states.

import type {
  Property,
  PropertyDimensions,
  PropertyFieldVisibility,
  PropertyShare,
  PropertyTour,
  User,
  VastuReportData,
} from "./types"

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed (${res.status})`, res.status)
  }
  return res.json() as Promise<T>
}

// ---- Auth ----------------------------------------------------------------
// TODO(backend): POST /api/auth/login -> { user: User, token: string }
export function login(email: string, password: string, role: User["role"] = "buyer") {
  return request<{ user: User; token: string }>("/api/skymap/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  })
}

// TODO(backend): POST /api/auth/signup -> { user: User, token: string }
export function signup(name: string, email: string, password: string, role: User["role"] = "buyer") {
  return request<{ user: User; token: string }>("/api/skymap/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  })
}

// TODO(backend): POST /api/auth/logout -> { ok: true }
export function logout() {
  return request<{ ok: true }>("/api/skymap/auth/logout", { method: "POST" })
}

// TODO(backend): GET /api/auth/me -> User (401 if not logged in)
export function getCurrentUser() {
  return request<User>("/api/skymap/auth/me")
}

// ---- Dashboard: properties -------------------------------------------------
// TODO(backend): GET /api/user/properties -> Property[]
// Properties shared with the logged-in buyer by an agent/builder.
export function getUserProperties() {
  return request<Property[]>("/api/skymap/user/properties")
}

// TODO(backend): GET /api/user/properties/saved -> Property[]
export function getSavedProperties() {
  return request<Property[]>("/api/skymap/user/properties/saved")
}

// TODO(backend): POST /api/user/properties/:id/save -> { ok: true }
export function saveProperty(id: string) {
  return request<{ ok: true }>(`/api/skymap/user/properties/${id}/save`, { method: "POST" })
}

// TODO(backend): DELETE /api/user/properties/:id/save -> { ok: true }
export function unsaveProperty(id: string) {
  return request<{ ok: true }>(`/api/skymap/user/properties/${id}/save`, { method: "DELETE" })
}

// ---- Property detail --------------------------------------------------------
// TODO(backend): GET /api/property/:id -> Property
export function getProperty(id: string) {
  return request<Property>(`/api/skymap/property/${id}`)
}

// TODO(backend): GET /api/property/:id/tour -> PropertyTour
export function getPropertyTour(id: string) {
  return request<PropertyTour>(`/api/skymap/property/${id}/tour`)
}

// TODO(backend): GET /api/property/:id/vastu -> VastuReportData
export function getPropertyVastu(id: string) {
  return request<VastuReportData>(`/api/skymap/property/${id}/vastu`)
}

// TODO(backend): GET /api/property/:id/dimensions -> PropertyDimensions
export function getPropertyDimensions(id: string) {
  return request<PropertyDimensions>(`/api/skymap/property/${id}/dimensions`)
}

// ---- Account -----------------------------------------------------------------
// TODO(backend): PATCH /api/user/profile -> User
export function updateProfile(patch: Partial<Pick<User, "name" | "phone">>) {
  return request<User>("/api/skymap/user/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

// Generic fetcher for use with SWR: useSWR(path, fetcher)
export function fetcher<T>(path: string): Promise<T> {
  return request<T>(path)
}

// ---- Sharing -------------------------------------------------------------
// TODO(backend): POST /api/property/:id/share -> PropertyShare
// The backend MUST re-validate every permission below before honoring the
// share link later — this call only records what the sender configured.
export function createPropertyShare(
  propertyId: string,
  input: {
    recipientName: string
    recipientEmail: string
    recipientPhone?: string
    visibility: PropertyFieldVisibility
    message?: string
    sharingMethod: PropertyShare["sharingMethod"]
  }
) {
  return request<PropertyShare>(`/api/skymap/property/${propertyId}/share`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

// TODO(backend): GET /api/share-history -> PropertyShare[]
export function getShareHistory() {
  return request<PropertyShare[]>("/api/skymap/share-history")
}

// TODO(backend): POST /api/share-history/:id/revoke -> PropertyShare
export function revokeShare(id: string) {
  return request<PropertyShare>(`/api/skymap/share-history/${id}/revoke`, { method: "POST" })
}

// TODO(backend): GET /api/share/:token -> PropertyShare (401/404 if invalid,
// expired, or revoked — the backend must reject this before it ever returns
// property/tour/vastu/dimensions data for that token).
export function getShareByToken(token: string) {
  return request<PropertyShare>(`/api/skymap/share/${token}`)
}

// TODO(backend): GET /api/owner/properties/:id/visibility -> PropertyFieldVisibility
export function getOwnerPropertyVisibility(propertyId: string) {
  return request<PropertyFieldVisibility>(`/api/skymap/owner/properties/${propertyId}/visibility`)
}

// TODO(backend): PATCH /api/owner/properties/:id/visibility -> PropertyFieldVisibility
export function updateOwnerPropertyVisibility(propertyId: string, visibility: PropertyFieldVisibility) {
  return request<PropertyFieldVisibility>(`/api/skymap/owner/properties/${propertyId}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  })
}

export { ApiError }
