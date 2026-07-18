import type { ProductType } from '../models/types'

// Market "worth checking" thresholds per product type (percent).
// Above these values the cost engine raises a soft finding.
// These are conservative market references, not legal caps.
export interface FeeThreshold {
  fromDeposit: number | null
  fromAccumulation: number | null
}

export const marketFeeThresholds: Partial<Record<ProductType, FeeThreshold>> = {
  pension: { fromDeposit: 3.0, fromAccumulation: 0.25 },
  gemel: { fromDeposit: null, fromAccumulation: 0.7 },
  education: { fromDeposit: null, fromAccumulation: 0.7 },
  managers: { fromDeposit: 4.0, fromAccumulation: 1.2 },
}
