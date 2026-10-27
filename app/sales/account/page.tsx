import type { Metadata } from 'next';

import AccountView from '@/components/sales/AccountView';

export const metadata: Metadata = { title: 'Account — Hawk Aerospace Sales Aggregator' };

// Reached from the header profile menu (?section=profile | settings). Reading searchParams on the
// server avoids a client-side Suspense boundary.
export default async function SalesAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const { section } = await searchParams;
  return <AccountView section={(Array.isArray(section) ? section[0] : section) || 'profile'} />;
}
