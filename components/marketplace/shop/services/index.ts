// Swap this single line for real API clients implementing ./contracts.
import type { Services } from './contracts';
import { mockServices } from './mock/mockServices';
export const services: Services = mockServices;

// Which services are still backed by sample data. The existing Hawk Aerospace
// backends (contact, careers, distributor) expose no product, cart, order,
// delivery-location, payment or support endpoints, so every service below is a
// mock. Flip an entry to 'live' only when its real client is wired in above.
// While any entry is 'mock' the UI says so (IS_DEMO) and never claims that a
// real order, payment, delivery or support request happened.
export const SERVICE_MODES: Record<keyof Services, 'mock' | 'live'> = {
  products: 'mock', cart: 'mock', orders: 'mock', location: 'mock', payment: 'mock', support: 'mock',
};
export const IS_DEMO = Object.values(SERVICE_MODES).some((m) => m === 'mock');
export { effectivePrice } from './mock/mockServices';
