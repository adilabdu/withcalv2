import { describe, expect, it } from 'vitest'

import {
  SALARY_CALCULATOR_DEFAULT_INPUTS,
  calculateSalaryBreakdown,
  defaultSalaryInputs,
  employeePensionContribution,
  employerPensionContribution,
  hourlyRate,
  incomeTaxBracketLabel,
  incomeTaxBracketLevel,
  incomeTaxFromBrackets,
  maxTransportationAllowance,
  netPayAmount,
  overtimeAmount,
  pensionableIncome,
  taxableIncome,
} from './salaryCalc'

function expectClose(actual: number, expected: number, precision = 6) {
  expect(actual).toBeCloseTo(expected, precision)
}

describe('salary formulas', () => {
  it('computes base helpers and contribution formulas correctly', () => {
    const baseSalary = 10_000
    const overtimeHours = 20

    expectClose(hourlyRate(baseSalary), 41.6666666667, 6)
    expectClose(overtimeAmount(baseSalary, overtimeHours), 1250, 6)
    expectClose(taxableIncome(baseSalary, overtimeHours), 11_250, 6)
    expectClose(pensionableIncome(baseSalary), 10_000, 6)
    expectClose(employerPensionContribution(baseSalary), 1100, 6)
    expectClose(employeePensionContribution(baseSalary), 700, 6)
  })

  it('matches tax bracket boundaries exactly', () => {
    expect(incomeTaxFromBrackets(2000)).toBe(0)
    expect(incomeTaxFromBrackets(4000)).toBe(300)
    expect(incomeTaxFromBrackets(7000)).toBe(900)
    expect(incomeTaxFromBrackets(10_000)).toBe(1650)
    expect(incomeTaxFromBrackets(14_000)).toBe(2850)
  })

  it('maps taxable income to Level 1..Level 6 labels', () => {
    expect(incomeTaxBracketLevel(2000)).toBe(1)
    expect(incomeTaxBracketLevel(2000.01)).toBe(2)
    expect(incomeTaxBracketLevel(4000.01)).toBe(3)
    expect(incomeTaxBracketLevel(7000.01)).toBe(4)
    expect(incomeTaxBracketLevel(10_000.01)).toBe(5)
    expect(incomeTaxBracketLevel(14_000.01)).toBe(6)
    expect(incomeTaxBracketLabel(14_000.01)).toBe('Level 6')
  })

  it('computes net pay and full breakdown consistently', () => {
    const payload = {
      baseSalary: 10_000,
      transportationAllowance: 500,
      overtimeHours: 20,
    }

    const net = netPayAmount(payload)
    expectClose(net, 9025, 6)

    const breakdown = calculateSalaryBreakdown(payload)
    expectClose(breakdown.netPayAmount, net, 6)
    expectClose(breakdown.taxBurdenAmount, 3825, 6)
    expectClose(breakdown.grossIncome, 11_750, 6)
  })
})

describe('calculator defaults and overrides', () => {
  it('exposes stable default input values', () => {
    expect(SALARY_CALCULATOR_DEFAULT_INPUTS).toEqual({
      baseSalary: 10_000,
      transportationAllowance: 500,
      overtimeHours: 14,
    })
  })

  it('returns a cloned defaults object on each call', () => {
    const first = defaultSalaryInputs()
    const second = defaultSalaryInputs()
    first.baseSalary = 1

    expect(second.baseSalary).toBe(10_000)
    expect(first).not.toBe(second)
  })

  it('calculates transportation cap from base salary', () => {
    expect(maxTransportationAllowance(1000)).toBe(250)
    expect(maxTransportationAllowance(10_000)).toBe(2200)
    expect(maxTransportationAllowance(20_000)).toBe(2200)
  })

  it('recomputes deterministic breakdown when input overrides change', () => {
    const baseline = calculateSalaryBreakdown(defaultSalaryInputs())
    const withHigherOvertime = calculateSalaryBreakdown({
      ...defaultSalaryInputs(),
      overtimeHours: baseline.overtimeHours + 2,
    })
    const withHigherBase = calculateSalaryBreakdown({
      ...defaultSalaryInputs(),
      baseSalary: baseline.baseSalary + 1000,
    })

    expect(withHigherOvertime.overtimeAmount).toBeGreaterThan(baseline.overtimeAmount)
    expect(withHigherOvertime.netPayAmount).toBeGreaterThan(baseline.netPayAmount)
    expect(withHigherBase.grossIncome).toBeGreaterThan(baseline.grossIncome)
    expect(withHigherBase.employeePensionContribution).toBeGreaterThan(
      baseline.employeePensionContribution,
    )
  })
})
