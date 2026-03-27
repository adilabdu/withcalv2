export interface SalaryInputs {
  baseSalary: number
  transportationAllowance: number
  overtimeHours: number
}

export interface SalaryBreakdown {
  baseSalary: number
  transportationAllowance: number
  overtimeHours: number
  hourlyRate: number
  overtimeAmount: number
  taxableIncome: number
  pensionableIncome: number
  incomeTax: number
  employerPensionContribution: number
  employeePensionContribution: number
  taxBurdenAmount: number
  netPayAmount: number
  grossIncome: number
}

export interface OptimizationConstraints {
  minOvertimeHours?: number
  maxOvertimeHours?: number
  overtimeStep?: number
  minBaseSalary?: number
  maxBaseSalary?: number
  epsilon?: number
}

export interface OptimizationResult {
  isFeasible: boolean
  targetNetPayAmount: number
  deltaToTarget: number
  iterations: number
  breakdown: SalaryBreakdown | null
}

const HOURS_PER_DAY = 8
const DAYS_PER_MONTH = 30
const OVERTIME_MULTIPLIER = 1.5
const EMPLOYER_PENSION_RATE = 0.11
const EMPLOYEE_PENSION_RATE = 0.07
const MAX_TRANSPORT_ALLOWANCE = 2200
const MAX_SEARCH_BASE_CAP = 5_000_000
const NUMERIC_TOLERANCE = 1e-9

function transportCap(baseSalary: number) {
  return Math.min(baseSalary * 0.25, MAX_TRANSPORT_ALLOWANCE)
}

export function hourlyRate(baseSalary: number) {
  return baseSalary / DAYS_PER_MONTH / HOURS_PER_DAY
}

export function overtimeAmount(baseSalary: number, overtimeHours: number) {
  return hourlyRate(baseSalary) * OVERTIME_MULTIPLIER * overtimeHours
}

export function taxableIncome(baseSalary: number, overtimeHours: number) {
  return baseSalary + overtimeAmount(baseSalary, overtimeHours)
}

export function pensionableIncome(baseSalary: number) {
  return baseSalary
}

export function incomeTaxFromBrackets(taxableIncomeAmount: number) {
  const t = taxableIncomeAmount
  if (t <= 2000) return 0
  if (t <= 4000) return t * 0.15 - 300
  if (t <= 7000) return t * 0.2 - 500
  if (t <= 10000) return t * 0.25 - 850
  if (t <= 14000) return t * 0.3 - 1350
  return t * 0.35 - 2050
}

export function incomeTaxBracketLevel(taxableIncomeAmount: number) {
  const t = taxableIncomeAmount
  if (t <= 2000) return 1
  if (t <= 4000) return 2
  if (t <= 7000) return 3
  if (t <= 10000) return 4
  if (t <= 14000) return 5
  return 6
}

export function incomeTaxBracketLabel(taxableIncomeAmount: number) {
  return `Level ${incomeTaxBracketLevel(taxableIncomeAmount)}`
}

export function employerPensionContribution(baseSalary: number) {
  return pensionableIncome(baseSalary) * EMPLOYER_PENSION_RATE
}

export function employeePensionContribution(baseSalary: number) {
  return pensionableIncome(baseSalary) * EMPLOYEE_PENSION_RATE
}

export function taxBurdenAmount(baseSalary: number, overtimeHours: number) {
  const taxable = taxableIncome(baseSalary, overtimeHours)
  return (
    incomeTaxFromBrackets(taxable) +
    employerPensionContribution(baseSalary) +
    employeePensionContribution(baseSalary)
  )
}

export function netPayAmount(inputs: SalaryInputs) {
  const taxable = taxableIncome(inputs.baseSalary, inputs.overtimeHours)
  const incomeTax = incomeTaxFromBrackets(taxable)
  const employeePension = employeePensionContribution(inputs.baseSalary)

  return (
    inputs.baseSalary +
    inputs.transportationAllowance +
    overtimeAmount(inputs.baseSalary, inputs.overtimeHours) -
    incomeTax -
    employeePension
  )
}

export function calculateSalaryBreakdown(inputs: SalaryInputs): SalaryBreakdown {
  const computedHourlyRate = hourlyRate(inputs.baseSalary)
  const computedOvertimeAmount = overtimeAmount(inputs.baseSalary, inputs.overtimeHours)
  const computedTaxableIncome = taxableIncome(inputs.baseSalary, inputs.overtimeHours)
  const computedPensionableIncome = pensionableIncome(inputs.baseSalary)
  const computedIncomeTax = incomeTaxFromBrackets(computedTaxableIncome)
  const computedEmployerPension = employerPensionContribution(inputs.baseSalary)
  const computedEmployeePension = employeePensionContribution(inputs.baseSalary)
  const computedTaxBurden = computedIncomeTax + computedEmployerPension + computedEmployeePension
  const computedGrossIncome =
    inputs.baseSalary + inputs.transportationAllowance + computedOvertimeAmount

  return {
    baseSalary: inputs.baseSalary,
    transportationAllowance: inputs.transportationAllowance,
    overtimeHours: inputs.overtimeHours,
    hourlyRate: computedHourlyRate,
    overtimeAmount: computedOvertimeAmount,
    taxableIncome: computedTaxableIncome,
    pensionableIncome: computedPensionableIncome,
    incomeTax: computedIncomeTax,
    employerPensionContribution: computedEmployerPension,
    employeePensionContribution: computedEmployeePension,
    taxBurdenAmount: computedTaxBurden,
    netPayAmount: computedGrossIncome - computedIncomeTax - computedEmployeePension,
    grossIncome: computedGrossIncome,
  }
}

function netWithoutTransport(baseSalary: number, overtimeHours: number) {
  return netPayAmount({ baseSalary, overtimeHours, transportationAllowance: 0 })
}

function netWithMaxTransport(baseSalary: number, overtimeHours: number) {
  return netWithoutTransport(baseSalary, overtimeHours) + transportCap(baseSalary)
}

function resolveConstraintValues(targetNetPayAmount: number, constraints: OptimizationConstraints) {
  const minBaseSalary = constraints.minBaseSalary ?? 0
  const defaultMax = Math.max(20_000, targetNetPayAmount * 3)
  const maxBaseSalary = constraints.maxBaseSalary ?? defaultMax
  const minOvertimeHours = constraints.minOvertimeHours ?? 14
  const maxOvertimeHours = constraints.maxOvertimeHours ?? 26
  const parsedOvertimeStep = constraints.overtimeStep ?? 0.25
  const overtimeStep =
    Number.isFinite(parsedOvertimeStep) && parsedOvertimeStep > 0 ? parsedOvertimeStep : 0.25
  const parsedEpsilon = constraints.epsilon ?? 0.01
  const epsilon = Number.isFinite(parsedEpsilon) && parsedEpsilon >= 0 ? parsedEpsilon : 0.01

  return {
    minBaseSalary,
    maxBaseSalary,
    minOvertimeHours,
    maxOvertimeHours,
    overtimeStep,
    epsilon,
  }
}

function findBaseUpperBound(
  targetNetPayAmount: number,
  overtimeHours: number,
  lowerBound: number,
  configuredMax: number,
) {
  let upper = Math.max(lowerBound, configuredMax)
  while (upper < MAX_SEARCH_BASE_CAP) {
    if (netWithMaxTransport(upper, overtimeHours) >= targetNetPayAmount) {
      return upper
    }
    upper = Math.min(upper * 2 + 1, MAX_SEARCH_BASE_CAP)
  }
  return upper
}

function findMinimumFeasibleBase(
  minAcceptableNetPay: number,
  maxAcceptableNetPay: number,
  overtimeHours: number,
  minBaseSalary: number,
  maxBaseSalary: number,
) {
  const lowerBase = minBaseSalary
  const upperBase = findBaseUpperBound(minAcceptableNetPay, overtimeHours, lowerBase, maxBaseSalary)

  if (netWithMaxTransport(upperBase, overtimeHours) < minAcceptableNetPay) {
    return null
  }

  let left = lowerBase
  let right = upperBase
  for (let i = 0; i < 80; i += 1) {
    const mid = (left + right) / 2
    if (netWithMaxTransport(mid, overtimeHours) >= minAcceptableNetPay) {
      right = mid
    } else {
      left = mid
    }
  }

  const candidateBase = right
  const netAtZeroTransport = netWithoutTransport(candidateBase, overtimeHours)
  if (netAtZeroTransport - maxAcceptableNetPay > NUMERIC_TOLERANCE) {
    return null
  }

  const requiredTransport = minAcceptableNetPay - netAtZeroTransport
  const cap = transportCap(candidateBase)
  if (requiredTransport < -NUMERIC_TOLERANCE || requiredTransport - cap > NUMERIC_TOLERANCE) {
    return null
  }

  return candidateBase
}

export function optimizeForTargetNet(
  targetNetPayAmount: number,
  constraints: OptimizationConstraints = {},
): OptimizationResult {
  const {
    minBaseSalary,
    maxBaseSalary,
    minOvertimeHours,
    maxOvertimeHours,
    overtimeStep,
    epsilon,
  } = resolveConstraintValues(targetNetPayAmount, constraints)
  const minAcceptableNetPay = targetNetPayAmount
  const maxAcceptableNetPay = targetNetPayAmount + epsilon

  let iterations = 0
  let bestBreakdown: SalaryBreakdown | null = null

  for (
    let overtimeHours = minOvertimeHours;
    overtimeHours <= maxOvertimeHours + NUMERIC_TOLERANCE;
    overtimeHours += overtimeStep
  ) {
    iterations += 1
    const normalizedOvertime = Number(overtimeHours.toFixed(6))
    const base = findMinimumFeasibleBase(
      minAcceptableNetPay,
      maxAcceptableNetPay,
      normalizedOvertime,
      minBaseSalary,
      maxBaseSalary,
    )

    if (base === null) {
      continue
    }

    const netAtZeroTransport = netWithoutTransport(base, normalizedOvertime)
    const cap = transportCap(base)
    const transportationForTarget = targetNetPayAmount - netAtZeroTransport
    const transportationForMinimum = minAcceptableNetPay - netAtZeroTransport
    const transportationAllowance = Math.min(
      Math.max(transportationForTarget, transportationForMinimum, 0),
      cap,
    )
    const breakdown = calculateSalaryBreakdown({
      baseSalary: base,
      transportationAllowance,
      overtimeHours: normalizedOvertime,
    })
    const deltaToTarget = Math.abs(breakdown.netPayAmount - targetNetPayAmount)

    if (
      breakdown.netPayAmount < minAcceptableNetPay - NUMERIC_TOLERANCE ||
      breakdown.netPayAmount > maxAcceptableNetPay + NUMERIC_TOLERANCE
    ) {
      continue
    }

    if (
      bestBreakdown === null ||
      breakdown.taxBurdenAmount < bestBreakdown.taxBurdenAmount ||
      (Math.abs(breakdown.taxBurdenAmount - bestBreakdown.taxBurdenAmount) <= epsilon &&
        (deltaToTarget < Math.abs(bestBreakdown.netPayAmount - targetNetPayAmount) ||
          (Math.abs(deltaToTarget - Math.abs(bestBreakdown.netPayAmount - targetNetPayAmount)) <=
            NUMERIC_TOLERANCE &&
            breakdown.baseSalary < bestBreakdown.baseSalary)))
    ) {
      bestBreakdown = breakdown
    }
  }

  if (bestBreakdown === null) {
    return {
      isFeasible: false,
      targetNetPayAmount,
      deltaToTarget: Number.POSITIVE_INFINITY,
      iterations,
      breakdown: null,
    }
  }

  return {
    isFeasible: true,
    targetNetPayAmount,
    deltaToTarget: Math.abs(bestBreakdown.netPayAmount - targetNetPayAmount),
    iterations,
    breakdown: bestBreakdown,
  }
}
