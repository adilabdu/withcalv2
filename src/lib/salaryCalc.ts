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

const HOURS_PER_DAY = 8
const DAYS_PER_MONTH = 30
const OVERTIME_MULTIPLIER = 1.5
const EMPLOYER_PENSION_RATE = 0.11
const EMPLOYEE_PENSION_RATE = 0.07
const MAX_TRANSPORT_ALLOWANCE = 2200

function transportCap(baseSalary: number) {
  return Math.min(baseSalary * 0.25, MAX_TRANSPORT_ALLOWANCE)
}

export const SALARY_CALCULATOR_DEFAULT_INPUTS: SalaryInputs = {
  baseSalary: 10_000,
  transportationAllowance: 500,
  overtimeHours: 14,
}

export function defaultSalaryInputs(): SalaryInputs {
  return { ...SALARY_CALCULATOR_DEFAULT_INPUTS }
}

export function maxTransportationAllowance(baseSalary: number) {
  return transportCap(baseSalary)
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
