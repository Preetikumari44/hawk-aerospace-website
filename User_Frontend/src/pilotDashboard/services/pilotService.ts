import { pilotApi, teamApi, notificationApi, marketplaceApi } from '../api/pilotApi';
import { ApiError } from '../api/client';
import {
  mockPilot,
  mockActiveMissions,
  mockAssignedMissions,
  mockUpcomingMissions,
  mockCompletedMissions,
  mockFleetManagers,
  mockSuggestedFleetManagers,
  mockTeamRequests,
  mockEarningsSummary,
  mockEarningsSeries,
  mockPayoutMethods,
  mockMarketplaceProducts,
  mockNotifications,
  mockPromotions,
} from '../mock/pilotMockData';
import {
  Pilot,
  Mission,
  FleetManager,
  TeamRequest,
  EarningsSummary,
  EarningsPoint,
  PayoutMethod,
  MarketplaceProduct,
  AppNotification,
  PromoOffer,
} from '../types';

/**
 * Service layer: every screen calls THIS, never src/api directly.
 * Each function tries the live Hawk API first; if no backend is
 * configured yet (ApiError with status 0) or the call fails, it falls
 * back to local mock data so the UI never renders broken/empty by
 * accident during integration. The dashboard is now connected to the SuperApp authenticated API client, so the existing
 * backend base URL and access-token refresh flow are reused automatically.
 */
const withFallback = async <T>(call: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiError || (err as any)?.status != null) return fallback;
    throw err;
  }
};

export const pilotService = {
  getProfile: (): Promise<Pilot> => withFallback(() => pilotApi.getProfile() as Promise<Pilot>, mockPilot),

  updateAvailability: (availability: Pilot['availability']): Promise<Pilot> =>
    withFallback(
      () => pilotApi.updateAvailability({ availability }) as Promise<Pilot>,
      { ...mockPilot, availability },
    ),

  getActiveMissions: (): Promise<Mission[]> =>
    withFallback(() => pilotApi.getMissions({ status: 'active' }) as Promise<Mission[]>, mockActiveMissions),

  getAssignedMissions: (): Promise<Mission[]> =>
    withFallback(() => pilotApi.getIncomingRequests() as Promise<Mission[]>, mockAssignedMissions),

  getUpcomingMissions: (): Promise<Mission[]> =>
    withFallback(() => pilotApi.getMissions({ status: 'upcoming' }) as Promise<Mission[]>, mockUpcomingMissions),

  getCompletedMissions: (): Promise<Mission[]> =>
    withFallback(() => pilotApi.getMissions({ status: 'completed' }) as Promise<Mission[]>, mockCompletedMissions),

  getMission: (id: string): Promise<Mission | undefined> =>
    withFallback(
      () => pilotApi.getMission(id) as Promise<Mission>,
      [...mockActiveMissions, ...mockAssignedMissions, ...mockUpcomingMissions, ...mockCompletedMissions].find(
        (m) => m.id === id,
      ),
    ),

  acceptMission: (id: string) => withFallback(() => pilotApi.acceptMission(id), { ok: true }),
  rejectMission: (id: string, reason?: string) =>
    withFallback(() => pilotApi.rejectMission(id, { reason }), { ok: true }),

  getFleetManagers: (): Promise<FleetManager[]> =>
    withFallback(() => teamApi.getMyManagers() as Promise<FleetManager[]>, mockFleetManagers),

  getSuggestedFleetManagers: (): Promise<FleetManager[]> =>
    withFallback(() => teamApi.getSuggestedManagers() as Promise<FleetManager[]>, mockSuggestedFleetManagers),

  getTeamRequests: (): Promise<{ pending: TeamRequest[]; invites: TeamRequest[] }> =>
    withFallback(
      async () => {
        const [pending, invites] = await Promise.all([teamApi.outgoing(), teamApi.incoming()]);
        return { pending: pending as TeamRequest[], invites: invites as TeamRequest[] };
      },
      {
        pending: mockTeamRequests.filter((r) => r.type === 'pending'),
        invites: mockTeamRequests.filter((r) => r.type === 'invite'),
      },
    ),

  getEarningsSummary: (): Promise<EarningsSummary> =>
    withFallback(() => pilotApi.getEarningsSummary() as Promise<EarningsSummary>, mockEarningsSummary),

  getEarningsSeries: (): Promise<EarningsPoint[]> =>
    withFallback(() => pilotApi.getEarningHistory() as Promise<EarningsPoint[]>, mockEarningsSeries),

  getPayoutMethods: (): Promise<PayoutMethod[]> =>
    withFallback(() => pilotApi.getPayoutMethods() as Promise<PayoutMethod[]>, mockPayoutMethods),

  addPayoutMethod: (payload: unknown): Promise<PayoutMethod> =>
    withFallback(() => pilotApi.addPayoutMethod(payload) as Promise<PayoutMethod>, {
      id: `pm_${Date.now()}`,
      verificationStatus: 'pending',
      ...(payload as object),
    } as PayoutMethod),

  verifyPayoutMethod: (id: string) => withFallback(() => pilotApi.verifyPayoutMethod(id), { ok: true }),

  getMarketplaceProducts: (): Promise<MarketplaceProduct[]> =>
    withFallback(() => marketplaceApi.getProducts() as Promise<MarketplaceProduct[]>, mockMarketplaceProducts),

  // Promotions & Offers has no equivalent SuperApp/Hawk endpoint yet — this
  // is presentational marketing content, so it resolves directly rather
  // than being routed through pilotApi like real mission/earnings data.
  getPromotions: (): Promise<PromoOffer[]> => Promise.resolve(mockPromotions),

  getNotifications: (): Promise<AppNotification[]> =>
    withFallback(() => notificationApi.getNotifications() as Promise<AppNotification[]>, mockNotifications),
};
