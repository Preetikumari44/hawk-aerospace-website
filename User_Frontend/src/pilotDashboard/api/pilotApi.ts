import { apiRequest, buildQuerySuffix } from './client';

/**
 * Pilot API surface — endpoint paths reused verbatim from the existing
 * SuperApp Pilot module (User_Frontend/src/utils/api.js) so this dashboard
 * can be pointed at the real Hawk backend later with zero contract drift.
 */
export const pilotApi = {
  getProfile: () => apiRequest('/pilots/profile'),
  updateProfile: (payload: unknown) =>
    apiRequest('/pilots/profile', { method: 'PATCH', body: JSON.stringify(payload) }),

  updateAvailability: (payload: { availability: 'active' | 'offDuty' }) =>
    apiRequest('/pilots/availability', { method: 'PATCH', body: JSON.stringify(payload) }),

  getMissions: (params: Record<string, unknown> = {}) =>
    apiRequest(`/pilots/missions${buildQuerySuffix(params)}`),
  getIncomingRequests: (params: Record<string, unknown> = {}) =>
    apiRequest(`/pilots/incoming-requests${buildQuerySuffix(params)}`),
  getRejectedMissions: (params: Record<string, unknown> = {}) =>
    apiRequest(`/pilots/rejected-missions${buildQuerySuffix(params)}`),
  getMission: (id: string) => apiRequest(`/pilots/missions/${id}`),

  acceptMission: (id: string) =>
    apiRequest(`/pilots/missions/${id}/accept`, { method: 'PATCH', body: JSON.stringify({ accepted: true }) }),
  rejectMission: (id: string, payload: unknown = {}) =>
    apiRequest(`/pilots/missions/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) }),
  updateMissionStatus: (id: string, payload: unknown) =>
    apiRequest(`/pilots/missions/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
  startMission: (id: string, payload: unknown = {}) =>
    apiRequest(`/pilots/missions/${id}/start`, { method: 'POST', body: JSON.stringify(payload) }),
  completeMission: (id: string, payload: unknown = {}) =>
    apiRequest(`/pilots/missions/${id}/complete`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelMission: (id: string, reason?: string) =>
    apiRequest(`/pilots/missions/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  postMissionProgress: (id: string, payload: unknown = {}) =>
    apiRequest(`/pilots/missions/${id}/progress`, { method: 'POST', body: JSON.stringify(payload) }),

  getEarnings: () => apiRequest('/pilots/earnings'),
  getPendingEarnings: () => apiRequest('/pilots/earnings/pending'),
  getEarningHistory: (params: Record<string, unknown> = {}) =>
    apiRequest(`/pilots/earnings/history${buildQuerySuffix(params)}`),
  getEarningsSummary: () => apiRequest('/payouts/earnings'),

  getPayoutMethods: () => apiRequest('/payouts/methods'),
  addPayoutMethod: (data: unknown) => apiRequest('/payouts/methods', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayoutMethod: (id: string) => apiRequest(`/payouts/methods/${id}/verify`, { method: 'POST' }),
  deletePayoutMethod: (id: string) => apiRequest(`/payouts/methods/${id}`, { method: 'DELETE' }),
  createWithdrawal: (data: unknown) => apiRequest('/payouts/withdraw', { method: 'POST', body: JSON.stringify(data) }),
  getWithdrawalHistory: () => apiRequest('/payouts/withdrawals'),

  getMyRefunds: () => apiRequest('/refunds/me'),
  getRefundStatus: (bookingId: string) => apiRequest(`/refunds/booking/${bookingId}`),

  updateLocation: (payload: unknown) => apiRequest('/pilots/location', { method: 'POST', body: JSON.stringify(payload) }),
};

export const teamApi = {
  getMyManagers: () => apiRequest('/team/my-managers'),
  getSuggestedManagers: (limit = 5) => apiRequest(`/team/suggested-managers${buildQuerySuffix({ limit })}`),
  requestToJoin: (payload: unknown) => apiRequest('/team/requests', { method: 'POST', body: JSON.stringify(payload) }),
  incoming: () => apiRequest('/team/incoming'),
  outgoing: () => apiRequest('/team/outgoing'),
  accept: (id: string) => apiRequest(`/team/${id}/accept`, { method: 'POST' }),
  reject: (id: string) => apiRequest(`/team/${id}/reject`, { method: 'POST' }),
  cancel: (id: string) => apiRequest(`/team/${id}/cancel`, { method: 'POST' }),
};

export const notificationApi = {
  getNotifications: () => apiRequest('/notifications'),
  markRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
};

export const marketplaceApi = {
  getProducts: (params: Record<string, unknown> = {}) => apiRequest(`/marketplace/products${buildQuerySuffix(params)}`),
  getProduct: (id: string) => apiRequest(`/marketplace/products/${id}`),
};
