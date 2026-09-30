export interface EarningsSummary {
  userId: string;
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnEarnings: number;
  lastServiceDate?: string | null;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  payoutMethodId: string;
  status: string;
  requestedAt: string;
}
