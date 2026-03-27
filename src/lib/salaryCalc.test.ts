import { describe, expect, it } from 'vitest'

import {
  calculateSalaryBreakdown,
  employeePensionContribution,
  employerPensionContribution,
  hourlyRate,
  incomeTaxBracketLabel,
  incomeTaxBracketLevel,
  incomeTaxFromBrackets,
  netPayAmount,
  optimizeForTargetNet,
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

describe('optimizer', () => {
  it('finds a feasible solution at target net within tolerance', () => {
    const targetNet = 12_000
    const result = optimizeForTargetNet(targetNet, { epsilon: 0.01 })

    expect(result.isFeasible).toBe(true)
    expect(result.breakdown).not.toBeNull()
    expect(result.deltaToTarget).toBeLessThanOrEqual(0.010000001)

    const best = result.breakdown!
    expect(best.overtimeHours).toBeGreaterThanOrEqual(14)
    expect(best.overtimeHours).toBeLessThanOrEqual(26)
    expect(best.transportationAllowance).toBeGreaterThanOrEqual(0)
    expect(best.transportationAllowance).toBeLessThanOrEqual(Math.min(best.baseSalary * 0.25, 2200))
  })

  it('keeps best burden against nearby feasible alternatives', () => {
    const targetNet = 12_000
    const epsilon = 0.01
    const result = optimizeForTargetNet(targetNet, { epsilon })

    expect(result.isFeasible).toBe(true)
    const best = result.breakdown!
    const bestBurden = best.taxBurdenAmount

    const candidates = [
      { baseSalary: best.baseSalary + 25, overtimeHours: best.overtimeHours },
      { baseSalary: Math.max(0, best.baseSalary - 25), overtimeHours: best.overtimeHours },
      { baseSalary: best.baseSalary, overtimeHours: Math.min(26, best.overtimeHours + 0.25) },
      { baseSalary: best.baseSalary, overtimeHours: Math.max(14, best.overtimeHours - 0.25) },
    ]

    for (const candidate of candidates) {
      const netWithoutTransport = netPayAmount({
        baseSalary: candidate.baseSalary,
        overtimeHours: candidate.overtimeHours,
        transportationAllowance: 0,
      })
      const transport = targetNet - netWithoutTransport
      const transportCap = Math.min(candidate.baseSalary * 0.25, 2200)
      const isFeasibleTransport = transport >= 0 && transport <= transportCap

      if (!isFeasibleTransport) {
        continue
      }

      const alt = calculateSalaryBreakdown({
        baseSalary: candidate.baseSalary,
        overtimeHours: candidate.overtimeHours,
        transportationAllowance: transport,
      })
      expect(Math.abs(alt.netPayAmount - targetNet)).toBeLessThanOrEqual(epsilon)
      expect(alt.taxBurdenAmount + epsilon).toBeGreaterThanOrEqual(bestBurden)
    }
  })

  it('returns infeasible when target net cannot be satisfied', () => {
    const result = optimizeForTargetNet(-1)
    expect(result.isFeasible).toBe(false)
    expect(result.breakdown).toBeNull()
  })

  it('keeps overtime within bounds even with very large epsilon', () => {
    const result = optimizeForTargetNet(12_000, {
      epsilon: 200,
      minOvertimeHours: 14,
      maxOvertimeHours: 26,
      overtimeStep: 0.25,
    })

    expect(result.isFeasible).toBe(true)
    expect(result.breakdown).not.toBeNull()

    const breakdown = result.breakdown!
    expect(breakdown.overtimeHours).toBeGreaterThanOrEqual(14)
    expect(breakdown.overtimeHours).toBeLessThanOrEqual(26)
    expect(breakdown.transportationAllowance).toBeGreaterThanOrEqual(0)
    expect(breakdown.transportationAllowance).toBeLessThanOrEqual(
      Math.min(breakdown.baseSalary * 0.25, 2200),
    )
  })

  it('uses epsilon as an upper-only band [target, target + epsilon]', () => {
    const strict = optimizeForTargetNet(2330, { epsilon: 0.000001 })
    const banded = optimizeForTargetNet(2330, { epsilon: 25 })

    expect(strict.isFeasible).toBe(true)
    expect(banded.isFeasible).toBe(true)
    expect(strict.breakdown).not.toBeNull()
    expect(banded.breakdown).not.toBeNull()

    const strictBreakdown = strict.breakdown!
    const bandedBreakdown = banded.breakdown!
    expect(bandedBreakdown.netPayAmount).toBeGreaterThanOrEqual(2330 - 0.000001)
    expect(bandedBreakdown.netPayAmount).toBeLessThanOrEqual(2355 + 0.000001)
    expect(bandedBreakdown.taxBurdenAmount).toBeLessThanOrEqual(
      strictBreakdown.taxBurdenAmount + 0.0001,
    )
  })

  it('matches brute-force oracle on representative targets', () => {
    const targets = [5000, 12_000, 25_000]
    const epsilon = 0.01

    type OracleCandidate = {
      burden: number
      baseSalary: number
      overtimeHours: number
      transportationAllowance: number
      net: number
    }

    function bruteForceOracle(targetNet: number): OracleCandidate | null {
      let best: OracleCandidate | null = null

      // Coarse, independent grid search used only as a validation oracle.
      for (let overtimeHours = 14; overtimeHours <= 26 + 1e-9; overtimeHours += 0.25) {
        const overtime = Number(overtimeHours.toFixed(6))
        for (let baseSalary = 0; baseSalary <= 80_000; baseSalary += 25) {
          const transportCap = Math.min(baseSalary * 0.25, 2200)
          const netWithoutTransport = netPayAmount({
            baseSalary,
            overtimeHours: overtime,
            transportationAllowance: 0,
          })
          const requiredTransportForTarget = targetNet - netWithoutTransport
          const requiredTransportForMinimum = targetNet - netWithoutTransport
          const transportationAllowance = Math.min(
            Math.max(requiredTransportForTarget, requiredTransportForMinimum, 0),
            transportCap,
          )
          const netAtChosenTransport = netWithoutTransport + transportationAllowance

          if (netAtChosenTransport < targetNet || netAtChosenTransport > targetNet + epsilon) {
            continue
          }

          const breakdown = calculateSalaryBreakdown({
            baseSalary,
            overtimeHours: overtime,
            transportationAllowance,
          })

          if (breakdown.netPayAmount < targetNet || breakdown.netPayAmount > targetNet + epsilon) {
            continue
          }

          if (
            best === null ||
            breakdown.taxBurdenAmount < best.burden ||
            (Math.abs(breakdown.taxBurdenAmount - best.burden) <= epsilon &&
              breakdown.baseSalary < best.baseSalary)
          ) {
            best = {
              burden: breakdown.taxBurdenAmount,
              baseSalary,
              overtimeHours: overtime,
              transportationAllowance,
              net: breakdown.netPayAmount,
            }
          }
        }
      }

      return best
    }

    for (const targetNet of targets) {
      const optimized = optimizeForTargetNet(targetNet, { epsilon, overtimeStep: 0.25 })
      expect(optimized.isFeasible).toBe(true)
      expect(optimized.breakdown).not.toBeNull()

      const oracle = bruteForceOracle(targetNet)
      expect(oracle).not.toBeNull()

      const optimizedBreakdown = optimized.breakdown!
      expect(optimizedBreakdown.netPayAmount).toBeGreaterThanOrEqual(targetNet - 0.000001)
      expect(optimizedBreakdown.netPayAmount).toBeLessThanOrEqual(targetNet + epsilon + 0.000001)
      expect(optimizedBreakdown.taxBurdenAmount).toBeLessThanOrEqual(oracle!.burden + 0.1)
    }
  })
})
