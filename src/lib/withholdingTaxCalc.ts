export type VATRate = 0.15 | 0.1 | 0.02

export type SourceField =
  | 'netAmount'
  | 'withholdingTaxableAmount'
  | 'grandTotalAmount'
  | 'withholdingTaxAmount'
  | 'vatAmount'

const WITHHOLDING_RATE = 0.03
const WITHHOLDING_THRESHOLD = 20000

export function forwardFromNet(netAmount: number, vatRate: number) {
  // VAT is a simple percentage of the net/base amount.
  const vatAmount = netAmount * vatRate
  const grandTotalAmount = netAmount + vatAmount

  return { vatAmount, grandTotalAmount }
}

export function withholdingFromNet(netAmount: number) {
  // Strict rule: withholding is applied only when net is >= 20,000.
  return netAmount >= WITHHOLDING_THRESHOLD ? netAmount * WITHHOLDING_RATE : 0
}

export function netFromSource(params: {
  sourceField: SourceField
  sourceValue: number
  vatRate: number
}) {
  const { sourceField, sourceValue, vatRate } = params

  switch (sourceField) {
    case 'netAmount':
    case 'withholdingTaxableAmount':
      return sourceValue
    case 'grandTotalAmount':
      return sourceValue / (1 + vatRate)
    case 'withholdingTaxAmount':
      // Inverse for strict threshold:
      // - derive N from W/0.03
      // - later recompute W using the strict rule
      return sourceValue / WITHHOLDING_RATE
    case 'vatAmount':
      // Inverse: VAT = N * vatRate => N = VAT / vatRate
      // (vatRate is never 0 for the supported options, but keep it safe.)
      return vatRate !== 0 ? sourceValue / vatRate : 0
    default:
      return sourceValue
  }
}

export function recalculateAll(params: {
  sourceField: SourceField
  sourceValue: number
  vatRate: number
}) {
  const netAmount = netFromSource(params)
  const { vatAmount, grandTotalAmount } = forwardFromNet(netAmount, params.vatRate)
  const withholdingTaxAmount = withholdingFromNet(netAmount)

  return {
    netAmount,
    vatAmount,
    grandTotalAmount,
    withholdingTaxAmount,
  }
}

