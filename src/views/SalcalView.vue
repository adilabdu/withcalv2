<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  calculateSalaryBreakdown,
  defaultSalaryInputs,
  incomeTaxBracketLabel,
  maxTransportationAllowance,
} from '../lib/salaryCalc'

const defaults = defaultSalaryInputs()
const baseSalaryInput = ref(defaults.baseSalary)
const transportationAllowanceInput = ref(defaults.transportationAllowance)
const overtimeHoursInput = ref(defaults.overtimeHours)

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const sanitizedInputs = computed(() => {
  const baseSalary = Math.max(Number.isFinite(baseSalaryInput.value) ? baseSalaryInput.value : 0, 0)
  const overtimeHours = Math.max(
    Number.isFinite(overtimeHoursInput.value) ? overtimeHoursInput.value : 0,
    0,
  )
  const transportCap = maxTransportationAllowance(baseSalary)
  const transportationAllowance = Math.min(
    Math.max(
      Number.isFinite(transportationAllowanceInput.value) ? transportationAllowanceInput.value : 0,
      0,
    ),
    transportCap,
  )

  return {
    baseSalary,
    overtimeHours,
    transportationAllowance,
  }
})

const breakdown = computed(() => calculateSalaryBreakdown(sanitizedInputs.value))
const taxBracketLabel = computed(() => incomeTaxBracketLabel(breakdown.value.taxableIncome))
const transportationCap = computed(() => maxTransportationAllowance(sanitizedInputs.value.baseSalary))

function resetToDefaults() {
  const nextDefaults = defaultSalaryInputs()
  baseSalaryInput.value = nextDefaults.baseSalary
  transportationAllowanceInput.value = nextDefaults.transportationAllowance
  overtimeHoursInput.value = nextDefaults.overtimeHours
}

const isTransportCapped = computed(
  () => sanitizedInputs.value.transportationAllowance !== transportationAllowanceInput.value,
)
</script>

<template>
  <main class="min-h-full bg-white">
    <section class="mx-auto max-w-3xl p-6">
      <div class="mb-4">
        <RouterLink class="text-sm text-slate-500 hover:text-slate-700" to="/">Home</RouterLink>
      </div>

      <h1 class="text-2xl font-semibold text-slate-900">Salary Calculator</h1>
      <p class="mt-1 text-sm text-slate-600">
        Enter salary inputs directly. The calculator keeps the same formulas and recomputes tax,
        pension, gross income, and net pay instantly.
      </p>

      <div class="mt-6 grid gap-4 sm:grid-cols-3">
        <label class="block">
          <span class="text-sm font-medium text-slate-600">Base Salary</span>
          <input
            v-model.number="baseSalaryInput"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            step="0.01"
            inputmode="decimal"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-600">Transportation Allowance</span>
          <input
            v-model.number="transportationAllowanceInput"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            step="0.01"
            inputmode="decimal"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-600">Overtime Hours</span>
          <input
            v-model.number="overtimeHoursInput"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            step="0.25"
            inputmode="decimal"
          />
        </label>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <p class="text-xs text-slate-500">
          Transportation cap at current base salary:
          <span class="font-medium text-slate-700">{{ formatMoney(transportationCap) }}</span>
        </p>
        <button
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          type="button"
          @click="resetToDefaults"
        >
          Reset defaults
        </button>
      </div>
      <p v-if="isTransportCapped" class="mt-2 text-xs text-amber-700">
        Transportation allowance is capped to the allowed maximum for the entered base salary.
      </p>

      <div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm text-slate-600">
          Net Pay (Computed):
          <span class="font-semibold text-slate-900">{{ formatMoney(breakdown.netPayAmount) }}</span>
        </p>
        <p class="text-sm text-slate-600">
          Gross Income:
          <span class="font-semibold text-slate-900">{{ formatMoney(breakdown.grossIncome) }}</span>
        </p>
        <p class="text-sm text-slate-600">
          Tax Burden:
          <span class="font-semibold text-slate-900">{{ formatMoney(breakdown.taxBurdenAmount) }}</span>
        </p>
        <p class="text-sm text-slate-600">
          Tax Bracket:
          <span class="font-semibold text-slate-900">{{ taxBracketLabel }}</span>
        </p>
        <p class="text-sm text-slate-600">
          Hourly Rate:
          <span class="font-semibold text-slate-900">{{ formatMoney(breakdown.hourlyRate) }}</span>
        </p>
      </div>

      <div class="mt-6">
        <h2 class="text-lg font-semibold text-slate-900">Calculated Breakdown</h2>
        <div class="mt-3 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
          <p>Base Salary: <strong>{{ formatMoney(breakdown.baseSalary) }}</strong></p>
          <p>
            Transportation Allowance:
            <strong>{{ formatMoney(breakdown.transportationAllowance) }}</strong>
          </p>
          <p>Overtime Hours: <strong>{{ breakdown.overtimeHours.toFixed(2) }}</strong></p>
          <p>Overtime Amount: <strong>{{ formatMoney(breakdown.overtimeAmount) }}</strong></p>
          <p>Taxable Amount: <strong>{{ formatMoney(breakdown.taxableIncome) }}</strong></p>
          <p>
            Tax Bracket: <strong>{{ taxBracketLabel }}</strong>
          </p>
          <p>Income Tax: <strong>{{ formatMoney(breakdown.incomeTax) }}</strong></p>
          <p>
            Employer Pension:
            <strong>{{ formatMoney(breakdown.employerPensionContribution) }}</strong>
          </p>
          <p>
            Employee Pension:
            <strong>{{ formatMoney(breakdown.employeePensionContribution) }}</strong>
          </p>
          <p>Tax Burden: <strong>{{ formatMoney(breakdown.taxBurdenAmount) }}</strong></p>
          <p>Gross Income: <strong>{{ formatMoney(breakdown.grossIncome) }}</strong></p>
          <p>Net Pay (Computed): <strong>{{ formatMoney(breakdown.netPayAmount) }}</strong></p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped></style>
