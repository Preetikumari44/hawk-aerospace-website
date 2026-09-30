/** Aggregator API */

import { api } from './client';

export interface Aggregator {
  uid: string;
  displayName: string;
  phone: string;
  email: string;
  region: string;
  totalCustomers: number;
  totalBookings: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

export const aggregatorApi = {
  getAll: () =>
    api.get<Aggregator[]>('/aggregators'),

  getById: (uid: string) =>
    api.get<Aggregator>(`/aggregators/${uid}`),

  create: (dto: Partial<Aggregator>) =>
    api.post<Aggregator>('/aggregators', dto),

  addCustomer: (aggregatorId: string, customer: { name: string; phone: string }) =>
    api.post(`/aggregators/${aggregatorId}/customers`, customer),
};
