// Financial modeling utilities for corporate real estate analysis.
// Pure functions — ported from the backend so the app can run fully in-browser.

export function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

export function pmt(rate: number, nper: number, pv: number): number {
  if (rate === 0) return -pv / nper;
  return (-pv * rate) / (1 - Math.pow(1 + rate, -nper));
}

export interface LeaseInputs {
  rentableSqft: number;
  baseRentAnnual: number;
  escalationPct: number;
  opexPsf: number;
  freeRentMonths: number;
  tiAllowancePsf: number;
  termYears: number;
  discountRate: number;
}

export interface YearCashflow {
  year: number;
  baseRent: number;
  opex: number;
  freeRent: number;
  ti: number;
  netCost: number;
}

// The effective "no rent" period at the start of a lease, in months: the greater
// of the stated free-rent months and the gap between the lease commencement and
// an explicit rent-commencement (rent start) date. Ensures projections don't show
// rent before it actually starts.
export function effectiveFreeMonths(
  commencementISO?: string,
  rentStartISO?: string,
  freeMonths = 0,
): number {
  let eff = freeMonths || 0;
  if (commencementISO && rentStartISO) {
    const c = new Date(commencementISO);
    const r = new Date(rentStartISO);
    if (!Number.isNaN(+c) && !Number.isNaN(+r) && r > c) {
      const gap = (r.getFullYear() - c.getFullYear()) * 12 + (r.getMonth() - c.getMonth());
      eff = Math.max(eff, gap);
    }
  }
  return eff;
}

export function buildLeaseCashflows(i: LeaseInputs): YearCashflow[] {
  const rows: YearCashflow[] = [];
  for (let y = 1; y <= i.termYears; y++) {
    const esc = Math.pow(1 + i.escalationPct / 100, y - 1);
    const baseRent = i.baseRentAnnual * esc;
    const opex = i.opexPsf * i.rentableSqft * esc;
    const freeMonthsThisYear = Math.max(0, Math.min(12, i.freeRentMonths - (y - 1) * 12));
    const freeRent = (baseRent / 12) * freeMonthsThisYear;
    const ti = y === 1 ? i.tiAllowancePsf * i.rentableSqft : 0;
    const netCost = baseRent + opex - freeRent - ti;
    rows.push({ year: y, baseRent, opex, freeRent, ti, netCost });
  }
  return rows;
}

export interface BuyInputs {
  purchasePrice: number;
  downPaymentPct: number;
  loanRate: number;
  loanTermYears: number;
  opexPsf: number;
  rentableSqft: number;
  appreciationPct: number;
  sellingCostPct: number;
  holdYears: number;
  discountRate: number;
}

export interface BuyYearCashflow {
  year: number;
  debtService: number;
  opex: number;
  saleProceeds: number;
  netCost: number;
}

export function buildBuyCashflows(i: BuyInputs): { initial: number; rows: BuyYearCashflow[] } {
  const loanAmount = i.purchasePrice * (1 - i.downPaymentPct / 100);
  const annualPayment = -pmt(i.loanRate, i.loanTermYears, -loanAmount);
  const downPayment = i.purchasePrice * (i.downPaymentPct / 100);

  const rows: BuyYearCashflow[] = [];
  let balance = loanAmount;
  for (let y = 1; y <= i.holdYears; y++) {
    const interest = balance * i.loanRate;
    const principal = Math.min(balance, annualPayment - interest);
    balance = Math.max(0, balance - principal);
    const debtService = y <= i.loanTermYears ? annualPayment : 0;
    const opex = i.opexPsf * i.rentableSqft * Math.pow(1 + i.appreciationPct / 100, y - 1);

    let saleProceeds = 0;
    if (y === i.holdYears) {
      const saleValue = i.purchasePrice * Math.pow(1 + i.appreciationPct / 100, y);
      const sellingCost = saleValue * (i.sellingCostPct / 100);
      saleProceeds = saleValue - sellingCost - balance;
    }
    const netCost = debtService + opex - saleProceeds;
    rows.push({ year: y, debtService, opex, saleProceeds, netCost });
  }
  return { initial: downPayment, rows };
}

export interface ComparisonResult {
  lease: {
    rows: YearCashflow[];
    npv: number;
    totalNetCost: number;
    avgAnnualCost: number;
    effectiveRentPsf: number;
  };
  buy: {
    initial: number;
    rows: BuyYearCashflow[];
    npv: number;
    totalNetCost: number;
    avgAnnualCost: number;
  };
  recommendation: string;
  npvSavings: number;
}

export function compareLeaseVsBuy(lease: LeaseInputs, buy: BuyInputs): ComparisonResult {
  const leaseRows = buildLeaseCashflows(lease);
  const leaseFlows = [0, ...leaseRows.map((r) => r.netCost)];
  const leaseNpv = npv(lease.discountRate, leaseFlows);
  const leaseTotal = leaseRows.reduce((s, r) => s + r.netCost, 0);

  const { initial, rows: buyRows } = buildBuyCashflows(buy);
  const buyFlows = [initial, ...buyRows.map((r) => r.netCost)];
  const buyNpv = npv(buy.discountRate, buyFlows);
  const buyTotal = initial + buyRows.reduce((s, r) => s + r.netCost, 0);

  const npvSavings = leaseNpv - buyNpv;
  const recommendation =
    Math.abs(npvSavings) < 1
      ? 'Lease and buy are financially equivalent on an NPV basis.'
      : npvSavings > 0
        ? `Buying is favorable — it lowers the NPV of occupancy cost by ${fmt(npvSavings)}.`
        : `Leasing is favorable — it lowers the NPV of occupancy cost by ${fmt(-npvSavings)}.`;

  return {
    lease: {
      rows: leaseRows,
      npv: leaseNpv,
      totalNetCost: leaseTotal,
      avgAnnualCost: leaseTotal / lease.termYears,
      effectiveRentPsf:
        lease.rentableSqft > 0 ? leaseTotal / lease.termYears / lease.rentableSqft : 0,
    },
    buy: {
      initial,
      rows: buyRows,
      npv: buyNpv,
      totalNetCost: buyTotal,
      avgAnnualCost: buyTotal / buy.holdYears,
    },
    recommendation,
    npvSavings,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
