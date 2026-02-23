import Decimal from 'decimal.js';

export type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE';

// Default VAT for Kenya
export const DEFAULT_VAT_RATE = 16;

interface TaxComputationInput {
  amount: number | string | Decimal;
  taxRatePercent: number | string | Decimal;
  mode?: TaxMode;
}

interface LineTotalInput {
  unitPrice: number | string | Decimal;
  quantity: number;
  discount?: number | string | Decimal;
}

export interface TaxComputationResult {
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRatePercent: number;
}

const ZERO = new Decimal(0);
const ONE_HUNDRED = new Decimal(100);

const toDecimal = (value: number | string | Decimal) => new Decimal(value);

const toMoney = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

export const validateTaxRate = (taxRatePercent: number | string | Decimal): Decimal => {
  const rate = toDecimal(taxRatePercent);

  if (rate.lessThan(ZERO) || rate.greaterThan(ONE_HUNDRED)) {
    throw new Error('Invalid tax rate');
  }

  return rate;
};

export function applyDefaultVAT(lineTotal: number): number {
  return Math.round((lineTotal * DEFAULT_VAT_RATE) / 100);
}

export const calculateLineTotal = (input: LineTotalInput): Decimal => {
  const unitPrice = toDecimal(input.unitPrice);
  const quantity = new Decimal(input.quantity);
  const discount = toDecimal(input.discount || 0);

  if (unitPrice.lessThan(ZERO) || quantity.lessThanOrEqualTo(ZERO) || discount.lessThan(ZERO)) {
    throw new Error('Invalid line values');
  }

  const lineSubtotal = unitPrice.mul(quantity);
  if (discount.greaterThan(lineSubtotal)) {
    throw new Error('Discount cannot exceed line subtotal');
  }

  return lineSubtotal.minus(discount);
};

export const computeTaxTotals = (input: TaxComputationInput): TaxComputationResult => {
  const amount = toDecimal(input.amount);
  const rate = validateTaxRate(input.taxRatePercent);
  const mode = input.mode || 'EXCLUSIVE';

  if (amount.lessThan(ZERO)) {
    throw new Error('Invalid taxable amount');
  }

  if (mode === 'INCLUSIVE') {
    const divisor = ONE_HUNDRED.plus(rate);
    const taxableAmount = divisor.equals(ZERO) ? ZERO : amount.mul(ONE_HUNDRED).div(divisor);
    const taxAmount = amount.minus(taxableAmount);

    return {
      taxableAmount: toMoney(taxableAmount),
      taxAmount: toMoney(taxAmount),
      totalAmount: toMoney(amount),
      taxRatePercent: rate.toNumber(),
    };
  }

  const taxAmount = amount.mul(rate).div(ONE_HUNDRED);
  const totalAmount = amount.plus(taxAmount);

  return {
    taxableAmount: toMoney(amount),
    taxAmount: toMoney(taxAmount),
    totalAmount: toMoney(totalAmount),
    taxRatePercent: rate.toNumber(),
  };
};
