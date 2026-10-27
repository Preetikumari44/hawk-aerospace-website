"use client";

// ---------------------------------------------------------------------------
// Role APIs for the unified web platform — 1:1 port of the Super App contract
// (User_Frontend/src/utils/api.js: roleApi, roleApplicationsApi, fleetApi,
// pilotApi, aggregatorApi, serviceCentreApi, technicianApi, chatApi).
// Same paths, same methods, same role normalization. Uses the shared
// apiRequest (JWT + silent 401 refresh, never auto-logout).
// ---------------------------------------------------------------------------

import { apiRequest, apiUpload, type UploadedFile } from "./api-client";
import { normalizeBackendRole } from "./roles";

function qs(params: Record<string, unknown> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

// --- Session / current user -----------------------------------------------

export const sessionApi = {
  getCurrentUser: () => apiRequest<Record<string, unknown>>("/users/me"),
  getCurrentSession: () => apiRequest<Record<string, unknown>>("/auth/sessions/me"),
};

// --- Role applications (Super App parity) ---------------------------------

export interface RoleApplicationPayload {
  role: string;
  roleLabel?: string;
  formData: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
  referralCode?: string;
}

export const roleApplicationsApi = {
  submit: (payload: RoleApplicationPayload) =>
    apiRequest<unknown>("/role-applications", {
      method: "POST",
      body: { ...payload, role: normalizeBackendRole(payload.role) },
    }),
  submitGuest: (payload: RoleApplicationPayload & { firebaseIdToken: string; phone?: string }) =>
    apiRequest<unknown>("/role-applications/guest", {
      method: "POST",
      body: { ...payload, role: normalizeBackendRole(payload.role) },
      auth: false,
    }),
  getMyApplications: () => apiRequest<unknown[]>("/role-applications/my"),
  getMyApplicationForRole: (role: string) =>
    apiRequest<unknown>(`/role-applications/my?role=${encodeURIComponent(normalizeBackendRole(role))}`),
};

// --- Fleet manager ----------------------------------------------------------

export const fleetApi = {
  getDashboard: () => apiRequest<unknown>("/fleet/dashboard"),
  getIncomingRequests: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/incoming-requests${qs(params)}`),
  getMissions: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/missions${qs(params)}`),
  getIncomingMissions: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/missions/incoming${qs(params)}`),
  getRejectedMissions: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/missions/rejected${qs(params)}`),
  getMission: (id: string) => apiRequest<unknown>(`/fleet/missions/${id}`),
  getBookingWeather: (id: string) => apiRequest<unknown>(`/bookings/${id}/weather`),
  getBookingRestrictions: (id: string) => apiRequest<unknown>(`/bookings/${id}/restrictions`),
  getBookingTracking: (id: string) => apiRequest<unknown>(`/bookings/${id}/tracking`),
  cancelBooking: (id: string, reason?: string) =>
    apiRequest<unknown>(`/bookings/${id}/cancel`, {
      method: "PATCH",
      body: reason ? { reason } : {},
    }),
  autoAssignMission: (id: string) =>
    apiRequest<unknown>(`/fleet/missions/${id}/auto-assign`, { method: "POST" }),
  assignPilot: (id: string, pilotId: string) =>
    apiRequest<unknown>(`/fleet/missions/${id}/assign-pilot`, { method: "POST", body: { pilotId } }),
  assignDrone: (id: string, droneId: string) =>
    apiRequest<unknown>(`/fleet/missions/${id}/assign-drone`, { method: "POST", body: { droneId } }),
  getFleetManagerRequests: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet-manager-requests/pending${qs(params)}`),
  getFleetManagerRequestHistory: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet-manager-requests/history${qs(params)}`),
  acceptFleetManagerRequest: (requestId: string, bookingId: string) =>
    apiRequest<unknown>("/fleet-manager-requests/accept", {
      method: "POST",
      body: { requestId, bookingId },
    }),
  rejectFleetManagerRequest: (requestId: string, bookingId: string, reason?: string) =>
    apiRequest<unknown>("/fleet-manager-requests/reject", {
      method: "POST",
      body: { requestId, bookingId, reason },
    }),
  getPilotRecommendations: (bookingId: string) =>
    apiRequest<unknown>(`/fleet-manager-requests/bookings/${bookingId}/pilot-recommendations`),
  getDroneRecommendations: (bookingId: string) =>
    apiRequest<unknown>(`/fleet-manager-requests/bookings/${bookingId}/drone-recommendations`),
  assignFleetManagerPilot: (bookingId: string, pilotId: string) =>
    apiRequest<unknown>(`/fleet-manager-requests/bookings/${bookingId}/assign-pilot`, {
      method: "POST",
      body: { pilotId },
    }),
  assignFleetManagerDrone: (bookingId: string, droneId: string) =>
    apiRequest<unknown>(`/fleet-manager-requests/bookings/${bookingId}/assign-drone`, {
      method: "POST",
      body: { droneId },
    }),
  verifyDroneReturn: (bookingId: string, code: string) =>
    apiRequest<unknown>(`/fleet-manager-requests/bookings/${bookingId}/verify-return`, {
      method: "POST",
      body: { code },
    }),
  getPilots: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/pilots${qs(params)}`),
  getPilot: (id: string) => apiRequest<unknown>(`/fleet/pilots/${id}`),
  createPilot: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/pilots", { method: "POST", body: payload }),
  updatePilotStatus: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/fleet/pilots/${id}/status`, { method: "PATCH", body: payload }),
  getDrones: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/drones${qs(params)}`),
  getAvailableDrones: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/drones/available${qs(params)}`),
  getDrone: (id: string) => apiRequest<unknown>(`/fleet/drones/${id}`),
  createDrone: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/drones", { method: "POST", body: payload }),
  updateDroneStatus: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/fleet/drones/${id}/status`, { method: "PATCH", body: payload }),
  getResources: () => apiRequest<unknown>("/fleet/resources"),
  createResource: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/resources", { method: "POST", body: payload }),
  getAnalytics: () => apiRequest<unknown>("/fleet/analytics"),
  getCommission: () => apiRequest<unknown>("/fleet/commission"),
  getPendingCommission: () => apiRequest<unknown>("/fleet/commission/pending"),
  getCommissionHistory: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/commission/history${qs(params)}`),
  getProfile: () => apiRequest<unknown>("/fleet/profile"),
  updateAvailability: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/availability", { method: "PATCH", body: payload }),
  initiatePilotCreation: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/pilots/initiate", { method: "POST", body: payload }),
  completePilotCreation: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/pilots/verify", { method: "POST", body: payload }),
  getMaintenanceTickets: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/fleet/maintenance-tickets${qs(params)}`),
  createMaintenanceTicket: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/fleet/maintenance-tickets", { method: "POST", body: payload }),
  getPayoutMethods: () => apiRequest<unknown>("/payouts/methods"),
  addPayoutMethod: (data: Record<string, unknown>) =>
    apiRequest<unknown>("/payouts/methods", { method: "POST", body: data }),
  createWithdrawal: (data: Record<string, unknown>) =>
    apiRequest<unknown>("/payouts/withdraw", { method: "POST", body: data }),
  getWithdrawalHistory: () => apiRequest<unknown>("/payouts/withdrawals"),
  getMyRefunds: () => apiRequest<unknown>("/refunds/me"),
};

// --- Pilot ------------------------------------------------------------------

export const pilotApi = {
  getProfile: () => apiRequest<unknown>("/pilots/profile"),
  updateAvailability: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/pilots/availability", { method: "PATCH", body: payload }),
  getMissions: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions${qs(params)}`),
  getIncomingRequests: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/incoming-requests${qs(params)}`),
  getRejectedMissions: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/rejected-missions${qs(params)}`),
  getMission: (id: string) => apiRequest<unknown>(`/pilots/missions/${id}`),
  acceptMission: (id: string) =>
    apiRequest<unknown>(`/pilots/missions/${id}/accept`, {
      method: "PATCH",
      body: { accepted: true },
    }),
  rejectMission: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/reject`, { method: "POST", body: payload }),
  updateMissionStatus: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/pilots/missions/${id}/status`, { method: "PATCH", body: payload }),
  startNavigation: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/start-navigation`, { method: "POST", body: payload }),
  arriveMission: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/arrive`, { method: "POST", body: payload }),
  preFlightCheck: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/pre-flight`, { method: "POST", body: payload }),
  startMission: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/start`, { method: "POST", body: payload }),
  completeMission: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/complete`, { method: "POST", body: payload }),
  cancelMission: (id: string, reason?: string) =>
    apiRequest<unknown>(`/pilots/missions/${id}/cancel`, { method: "POST", body: { reason } }),
  confirmCash: (bookingId: string) =>
    apiRequest<unknown>(`/bookings/${bookingId}/confirm-cash`, { method: "POST" }),
  postMissionProgress: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/missions/${id}/progress`, { method: "POST", body: payload }),
  getEarnings: () => apiRequest<unknown>("/pilots/earnings"),
  getEarningsSummary: () => apiRequest<unknown>("/payouts/earnings"),
  getRewards: () => apiRequest<unknown>("/pilots/rewards"),
  getPendingEarnings: () => apiRequest<unknown>("/pilots/earnings/pending"),
  getEarningHistory: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/pilots/earnings/history${qs(params)}`),
  updatePayoutMethod: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/pilots/payout-method", { method: "PATCH", body: payload }),
  getMaintenanceTickets: () => apiRequest<unknown>("/pilots/maintenance-tickets"),
  createMaintenanceTicket: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/pilots/maintenance-tickets", { method: "POST", body: payload }),
  updateLocation: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/pilots/location", { method: "POST", body: payload }),
  getPayoutMethods: () => apiRequest<unknown>("/payouts/methods"),
  addPayoutMethod: (data: Record<string, unknown>) =>
    apiRequest<unknown>("/payouts/methods", { method: "POST", body: data }),
  createWithdrawal: (data: Record<string, unknown>) =>
    apiRequest<unknown>("/payouts/withdraw", { method: "POST", body: data }),
  getWithdrawalHistory: () => apiRequest<unknown>("/payouts/withdrawals"),
  getMyRefunds: () => apiRequest<unknown>("/refunds/me"),
};

// --- Sales aggregator ---------------------------------------------------------

export const aggregatorApi = {
  getDashboard: () => apiRequest<unknown>("/aggregators/dashboard"),
  getProfile: () => apiRequest<unknown>("/aggregators/profile"),
  getCustomers: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/aggregators/customers${qs(params)}`),
  getCustomer: (customerId: string) =>
    apiRequest<unknown>(`/aggregators/customers/${customerId}`),
  updateCustomer: (customerId: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/aggregators/customers/${customerId}`, { method: "PATCH", body: payload }),
  updateProfile: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/profile", { method: "PATCH", body: payload }),
  addCustomer: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/customers", { method: "POST", body: payload }),
  sendCustomerOtp: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/customers/send-otp", { method: "POST", body: payload }),
  verifyCustomerOtp: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/customers/verify-otp", { method: "POST", body: payload }),
  getBookings: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/aggregators/bookings${qs(params)}`),
  getBooking: (bookingId: string) => apiRequest<unknown>(`/aggregators/bookings/${bookingId}`),
  createBooking: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/bookings", { method: "POST", body: payload }),
  cancelBooking: (id: string, reason?: string) =>
    apiRequest<unknown>(`/aggregators/bookings/${id}/cancel`, {
      method: "POST",
      body: { reason },
    }),
  getCommission: () => apiRequest<unknown>("/aggregators/commission"),
  getCommissionDashboard: () => apiRequest<unknown>("/aggregators/commission/dashboard"),
  getPendingCommission: () => apiRequest<unknown>("/aggregators/commission/pending"),
  getCommissionHistory: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/aggregators/commission/history${qs(params)}`),
  getAnalytics: () => apiRequest<unknown>("/aggregators/analytics"),
  getRefunds: () => apiRequest<unknown>("/aggregators/refunds"),
  updatePayoutMethod: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/payout-method", { method: "PATCH", body: payload }),
  getComplaints: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/aggregators/complaints${qs(params)}`),
  createComplaint: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/complaints", { method: "POST", body: payload }),
  checkWeather: (payload: { latitude: number; longitude: number; targetDate?: string }) =>
    apiRequest<unknown>("/aggregators/bookings/weather-check", {
      method: "POST",
      body: {
        location: { lat: payload.latitude, lng: payload.longitude },
        ...(payload.targetDate ? { date: payload.targetDate } : {}),
      },
    }),
  checkRestrictions: (payload: { latitude: number; longitude: number; serviceType?: string }) =>
    apiRequest<unknown>("/aggregators/bookings/flying-restriction-check", {
      method: "POST",
      body: {
        location: { lat: payload.latitude, lng: payload.longitude },
        ...(payload.serviceType ? { serviceType: payload.serviceType } : {}),
      },
    }),
  getNotificationSettings: () => apiRequest<unknown>("/aggregators/notification-settings"),
  updateNotificationSettings: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/aggregators/notification-settings", { method: "PATCH", body: payload }),
  deleteAccount: (reason: string, feedback?: string) =>
    apiRequest<unknown>("/aggregators/account", {
      method: "DELETE",
      body: { reason, ...(feedback ? { feedback } : {}) },
    }),
};

// --- Service centre tickets (shared state machine FM/pilot -> technician) -----

export const serviceCentreApi = {
  createTicket: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/service-centre/tickets", { method: "POST", body: payload }),
  listTickets: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/service-centre/tickets${qs(params)}`),
  getTicket: (id: string) => apiRequest<unknown>(`/service-centre/tickets/${id}`),
  fmApprove: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/fm-approve`, {
      method: "PATCH",
      body: payload,
    }),
  assign: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/assign`, {
      method: "PATCH",
      body: payload,
    }),
  techDecision: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/tech-decision`, {
      method: "PATCH",
      body: payload,
    }),
  toolkitPickupVerify: (id: string, code: string) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/toolkit-pickup-verify`, {
      method: "POST",
      body: { code },
    }),
  startRepair: (id: string) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/start-repair`, { method: "POST" }),
  toolkitReturnVerify: (id: string, code: string) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/toolkit-return-verify`, {
      method: "POST",
      body: { code },
    }),
  addCharge: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/additional-charges`, {
      method: "POST",
      body: payload,
    }),
  finishRepair: (id: string) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/finish-repair`, { method: "POST" }),
  paymentOrder: (id: string) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/payment-order`, { method: "POST" }),
  paymentConfirm: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/service-centre/tickets/${id}/payment-confirm`, {
      method: "POST",
      body: payload,
    }),
  queues: () => apiRequest<unknown>("/service-centre/technician/queues"),
};

// --- Technician ---------------------------------------------------------------

export const technicianApi = {
  getProfile: () => apiRequest<unknown>("/technicians/me"),
  updateProfile: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/technicians/me", { method: "PATCH", body: payload }),
  getIncomingTickets: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/technicians/me/incoming-tickets${qs(params)}`),
  getTickets: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/technicians/me/tickets${qs(params)}`),
  getRejectedTickets: (params: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/technicians/me/rejected-tickets${qs(params)}`),
  getTicket: (id: string) => apiRequest<unknown>(`/technicians/me/tickets/${id}`),
  acceptTicket: (id: string) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/accept`, { method: "PATCH" }),
  rejectTicket: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/reject`, {
      method: "PATCH",
      body: payload,
    }),
  updateTicketStage: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/stage`, {
      method: "PATCH",
      body: payload,
    }),
  completeTicket: (id: string, payload: Record<string, unknown> = {}) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/complete`, {
      method: "POST",
      body: payload,
    }),
  addCharge: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/additional-charges`, {
      method: "POST",
      body: payload,
    }),
  getCharges: (id: string) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/additional-charges`),
  diagnose: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/diagnosis`, {
      method: "POST",
      body: payload,
    }),
  requestParts: (id: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/parts-request`, {
      method: "POST",
      body: payload,
    }),
  partsReceived: (id: string) =>
    apiRequest<unknown>(`/technicians/me/tickets/${id}/parts-received`, { method: "PATCH" }),
  getEarnings: () => apiRequest<unknown>("/technicians/me/earnings"),
  getPendingEarnings: () => apiRequest<unknown>("/technicians/me/earnings/pending"),
  getEarningHistory: () => apiRequest<unknown>("/technicians/me/earnings/history"),
  updatePayoutMethod: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/technicians/me/payout-method", { method: "PATCH", body: payload }),
  getUpiQr: () => apiRequest<unknown>("/technicians/me/upi-qr"),
  getRefunds: () => apiRequest<unknown>("/technicians/me/refunds"),
};

// --- File uploads (Super App filesApi parity) --------------------------------

export const filesApi = {
  /** Authenticated multipart upload: POST /files/upload (JWT). */
  upload: (form: FormData) => apiUpload<UploadedFile>("/files/upload", form),
  /** No-login upload for guest applications (form must include firebaseIdToken). */
  uploadGuest: (form: FormData) =>
    apiUpload<UploadedFile>("/files/guest-upload", form),
};

// --- Team (pilot/fleet manager teaming, Super App teamApi parity) -----------

export const teamApi = {
  getMyManagers: () => apiRequest<unknown>("/team/my-managers"),
  getSuggestedManagers: (limit = 5, opts: { lat?: number; lng?: number; radiusKm?: number } = {}) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (opts.lat != null) q.set("lat", String(opts.lat));
    if (opts.lng != null) q.set("lng", String(opts.lng));
    q.set("radiusKm", String(opts.radiusKm ?? 150));
    return apiRequest<unknown>(`/team/suggested-managers?${q.toString()}`);
  },
  getUnassignedPilots: (search?: string, opts: { lat?: number; lng?: number; radiusKm?: number } = {}) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (opts.lat != null) q.set("lat", String(opts.lat));
    if (opts.lng != null) q.set("lng", String(opts.lng));
    q.set("radiusKm", String(opts.radiusKm ?? 150));
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<unknown>(`/team/unassigned-pilots${suffix}`);
  },
  invitePilot: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/team/invites", { method: "POST", body: payload }),
  requestToJoin: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/team/requests", { method: "POST", body: payload }),
  incoming: () => apiRequest<unknown>("/team/incoming"),
  outgoing: () => apiRequest<unknown>("/team/outgoing"),
  accept: (id: string) => apiRequest<unknown>(`/team/${id}/accept`, { method: "POST" }),
  reject: (id: string) => apiRequest<unknown>(`/team/${id}/reject`, { method: "POST" }),
  cancel: (id: string) => apiRequest<unknown>(`/team/${id}/cancel`, { method: "POST" }),
};

// --- Complaints / support (Super App parity: POST /complaints, GET /complaints/my) ---

export const complaintApi = {
  create: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/complaints", { method: "POST", body: payload }),
  my: () => apiRequest<unknown>("/complaints/my"),
  stats: () => apiRequest<unknown>("/complaints/stats"),
  get: (id: string) => apiRequest<unknown>(`/complaints/${id}`),
};

// --- Refer & Earn + wallet -----------------------------------------------------

export const referralApi = {
  code: (targetRole?: string) =>
    apiRequest<unknown>("/referrals/code", {
      method: "POST",
      body: targetRole ? { targetRole } : {},
    }),
  my: () => apiRequest<unknown>("/referrals/my"),
  invites: (payload: { code: string; phones: string[]; targetRole?: string; channel?: string }) =>
    apiRequest<unknown>("/referrals/invites", { method: "POST", body: payload }),
  attach: (code: string) =>
    apiRequest<unknown>("/referrals/attach", { method: "POST", body: { code } }),
  landing: (code: string) => apiRequest<unknown>(`/referrals/resolve/${code}`, { auth: false }),
  /** Inviter identity for the apply form's "Invited by" row (auth:false). */
  inviter: (code: string) =>
    apiRequest<{ code?: string; name?: string; phone?: string }>(
      `/referrals/inviter/${encodeURIComponent(code)}`,
      { auth: false },
    ),
};

export const payoutApi = {
  methods: () => apiRequest<unknown[]>("/payouts/methods"),
  addMethod: (payload: {
    type: "bank" | "upi";
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    upiId?: string;
    isDefault?: boolean;
  }) => apiRequest<Record<string, unknown>>("/payouts/methods", { method: "POST", body: payload }),
  verifyMethod: (id: string) =>
    apiRequest<unknown>(`/payouts/methods/${id}/verify`, { method: "POST" }),
  deleteMethod: (id: string) =>
    apiRequest<unknown>(`/payouts/methods/${id}`, { method: "DELETE" }),
};

export const walletApi = {
  get: () => apiRequest<unknown>("/wallet"),
  history: () => apiRequest<unknown>("/wallet/history"),
  withdraw: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/wallet/withdraw", { method: "POST", body: payload }),
};

// --- Chat ---------------------------------------------------------------------

export const chatApi = {
  getConversations: () => apiRequest<unknown>("/chat/conversations"),
  getMessages: (conversationId: string) =>
    apiRequest<unknown>(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, payload: Record<string, unknown>) =>
    apiRequest<unknown>(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: payload,
    }),
  createConversation: (payload: Record<string, unknown>) =>
    apiRequest<unknown>("/chat/conversations", { method: "POST", body: payload }),
  getConversation: (conversationId: string) =>
    apiRequest<unknown>(`/chat/conversations/${conversationId}`),
  markAsRead: (conversationId: string) =>
    apiRequest<unknown>(`/chat/conversations/${conversationId}/read`, { method: "PATCH" }),
  initiateCall: (conversationId: string) =>
    apiRequest<unknown>(`/chat/conversations/${conversationId}/call`, { method: "POST" }),
  deleteConversation: (conversationId: string) =>
    apiRequest<unknown>(`/chat/conversations/${conversationId}`, { method: "DELETE" }),
};
