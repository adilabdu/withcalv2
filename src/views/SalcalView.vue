<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { incomeTaxBracketLabel, optimizeForTargetNet } from '../lib/salaryCalc'

const targetNetInput = ref(12000)
const epsilonInput = ref(0.01)

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const targetNet = computed(() => (Number.isFinite(targetNetInput.value) ? targetNetInput.value : 0))
const epsilon = computed(() =>
  Math.max(Number.isFinite(epsilonInput.value) ? epsilonInput.value : 0.01, 0.000001),
)

const optimization = computed(() =>
  optimizeForTargetNet(targetNet.value, {
    epsilon: epsilon.value,
    minOvertimeHours: 14,
    maxOvertimeHours: 26,
    overtimeStep: 0.25,
  }),
)

const computedNetPay = computed(() => optimization.value.breakdown?.netPayAmount ?? null)
const signedDeltaToTarget = computed(() =>
  computedNetPay.value === null ? null : computedNetPay.value - targetNet.value,
)
const isWithinTolerance = computed(() =>
  signedDeltaToTarget.value === null
    ? false
    : signedDeltaToTarget.value >= -0.000001 && signedDeltaToTarget.value <= epsilon.value,
)
const taxBracketLabel = computed(() =>
  optimization.value.breakdown ? incomeTaxBracketLabel(optimization.value.breakdown.taxableIncome) : 'N/A',
)

function formatSignedMoney(value: number) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${formatMoney(Math.abs(value))}`
}
</script>

<template>
  <main class="min-h-full bg-white">
    <section class="mx-auto max-w-3xl p-6">
      <div class="mb-4">
        <RouterLink class="text-sm text-slate-500 hover:text-slate-700" to="/">Home</RouterLink>
      </div>

      <h1 class="text-2xl font-semibold text-slate-900">Salary Calculator (Optimizer)</h1>
      <p class="mt-1 text-sm text-slate-600">
        Enter a target net pay amount. The optimizer solves for base salary, transport allowance,
        and overtime hours to minimize tax burden under your constraints. Epsilon sets an
        upper-only band: computed net must be between target and target + epsilon.
      </p>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="text-sm font-medium text-slate-600">Target Net Pay Amount</span>
          <input
            v-model.number="targetNetInput"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            step="0.01"
            inputmode="decimal"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-600">Tolerance (epsilon)</span>
          <input
            v-model.number="epsilonInput"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            step="0.001"
            inputmode="decimal"
          />
        </label>
      </div>

      <div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm text-slate-600">
          Target Net Pay:
          <span class="font-semibold text-slate-900">{{ formatMoney(targetNet) }}</span>
        </p>
        <p class="text-sm text-slate-600">
          Computed Net Pay:
          <span class="font-semibold text-slate-900">
            {{ computedNetPay === null ? 'N/A' : formatMoney(computedNetPay) }}
          </span>
        </p>
        <p class="text-sm text-slate-600">
          Iterations: <span class="font-semibold text-slate-900">{{ optimization.iterations }}</span>
        </p>
        <p class="text-sm text-slate-600">
          Delta to target (signed):
          <span class="font-semibold text-slate-900">
            {{ signedDeltaToTarget === null ? 'N/A' : formatSignedMoney(signedDeltaToTarget) }}
          </span>
        </p>
        <p class="text-sm text-slate-600">
          Delta to target (absolute):
          <span class="font-semibold text-slate-900">
            {{ optimization.isFeasible ? formatMoney(optimization.deltaToTarget) : 'N/A' }}
          </span>
        </p>
        <p class="text-sm text-slate-600">
          Within allowed band [target, target + epsilon]:
          <span class="font-semibold text-slate-900">
            {{ optimization.isFeasible ? (isWithinTolerance ? 'Yes' : 'No') : 'N/A' }}
          </span>
        </p>
      </div>

      <div v-if="optimization.isFeasible && optimization.breakdown" class="mt-6">
        <h2 class="text-lg font-semibold text-slate-900">Optimized Result</h2>
        <div class="mt-3 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
          <p>Base Salary: <strong>{{ formatMoney(optimization.breakdown.baseSalary) }}</strong></p>
          <p>
            Transportation Allowance:
            <strong>{{ formatMoney(optimization.breakdown.transportationAllowance) }}</strong>
          </p>
          <p>Overtime Hours: <strong>{{ optimization.breakdown.overtimeHours.toFixed(2) }}</strong></p>
          <p>Overtime Amount: <strong>{{ formatMoney(optimization.breakdown.overtimeAmount) }}</strong></p>
          <p>Taxable Amount: <strong>{{ formatMoney(optimization.breakdown.taxableIncome) }}</strong></p>
          <p>Tax Bracket: <strong>{{ taxBracketLabel }}</strong></p>
          <p>Income Tax: <strong>{{ formatMoney(optimization.breakdown.incomeTax) }}</strong></p>
          <p>
            Employer Pension:
            <strong>{{ formatMoney(optimization.breakdown.employerPensionContribution) }}</strong>
          </p>
          <p>
            Employee Pension:
            <strong>{{ formatMoney(optimization.breakdown.employeePensionContribution) }}</strong>
          </p>
          <p>Tax Burden: <strong>{{ formatMoney(optimization.breakdown.taxBurdenAmount) }}</strong></p>
          <p>Gross Income: <strong>{{ formatMoney(optimization.breakdown.grossIncome) }}</strong></p>
          <p>Net Pay (Computed): <strong>{{ formatMoney(optimization.breakdown.netPayAmount) }}</strong></p>
        </div>
      </div>

      <div v-else class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        No feasible optimized result found for this target and tolerance.
      </div>
    </section>
  </main>
</template>

<style scoped></style>
