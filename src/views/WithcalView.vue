<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { recalculateAll, type SourceField, type VATRate } from '../lib/withholdingTaxCalc'

const vatRateOptions: Array<{ label: string; value: VATRate }> = [
  { label: '15%', value: 0.15 },
  { label: '10%', value: 0.1 },
  { label: '2%', value: 0.02 },
]

// The calculator keeps the last-edited amount as the "source".
// VAT type changes will recompute everything while keeping this source constant.
const sourceField = ref<SourceField>('netAmount')
const sourceValue = ref<number>(0)

// Default to 15%; ensures we always have a VAT rate even if the options array changes.
const vatRate = ref<VATRate>(0.15)
const selectedVatRateLabel = computed(
  () => vatRateOptions.find((opt) => opt.value === vatRate.value)?.label ?? '',
)

const calc = computed(() =>
  recalculateAll({
    sourceField: sourceField.value,
    sourceValue: sourceValue.value,
    vatRate: vatRate.value,
  }),
)

const focusedField = ref<SourceField | null>(null)

// Keeps the exact user-typed string while the field is focused.
// This prevents the cursor jumping caused by re-rendering `toFixed(2)` during typing.
const rawInput = ref<Record<SourceField, string>>({
  netAmount: '0',
  withholdingTaxableAmount: '0',
  grandTotalAmount: '0',
  withholdingTaxAmount: '0',
  vatAmount: '0',
  paymentAmount: '0',
})

const flashMap = ref<Record<SourceField, boolean>>({
  netAmount: false,
  withholdingTaxableAmount: false,
  grandTotalAmount: false,
  withholdingTaxAmount: false,
  vatAmount: false,
  paymentAmount: false,
})

const flashTimers: Partial<Record<SourceField, ReturnType<typeof setTimeout>>> = {}

function startFlash(targets: SourceField[]) {
  // Briefly highlight fields that changed due to recalculation.
  for (const field of targets) {
    const existing = flashTimers[field]
    if (existing) clearTimeout(existing)

    flashMap.value[field] = true
    flashTimers[field] = setTimeout(() => {
      flashMap.value[field] = false
    }, 500)
  }
}

function parseInput(raw: string) {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : 0
}

function format2Plain(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : ''
}

function format2Display(value: number) {
  if (!Number.isFinite(value)) return ''

  // Display-only formatting; keep focused input strings unformatted to avoid
  // breaking `parseInput()` (which uses `Number()`).
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function numberForSourceField(field: SourceField) {
  // `withholdingTaxableAmount` mirrors `netAmount`.
  switch (field) {
    case 'netAmount':
      return calc.value.netAmount
    case 'withholdingTaxableAmount':
      return calc.value.netAmount
    case 'grandTotalAmount':
      return calc.value.grandTotalAmount
    case 'withholdingTaxAmount':
      return calc.value.withholdingTaxAmount
    case 'vatAmount':
      return calc.value.vatAmount
    case 'paymentAmount':
      return calc.value.paymentAmount
  }
}

function onVatRateChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement
  vatRate.value = Number(target.value) as VATRate
}

function onFocus(field: SourceField) {
  focusedField.value = field
  rawInput.value[field] = format2Plain(numberForSourceField(field))
}

function onBlur(field: SourceField) {
  // Normalize to 2 decimals when leaving the field.
  rawInput.value[field] = format2Plain(numberForSourceField(field))
  focusedField.value = null
}

function onEdit(field: SourceField, event: Event) {
  const target = event.target as HTMLInputElement
  sourceField.value = field
  sourceValue.value = parseInput(target.value)
  rawInput.value[field] = target.value

  const numericTargets: SourceField[] = [
    'netAmount',
    'grandTotalAmount',
    'withholdingTaxAmount',
    'vatAmount',
    'paymentAmount',
  ]
  startFlash(numericTargets.filter((t) => t !== field))
}
</script>

<template>
  <div class="min-h-full bg-white">
    <div class="mx-auto max-w-2xl p-6">
      <div class="mb-4">
        <RouterLink class="text-sm text-slate-500 hover:text-slate-700" to="/">Home</RouterLink>
      </div>

      <h1 class="text-2xl font-semibold">Withholding Tax Calculator</h1>
      <p class="mt-1 text-sm text-slate-600">
        Net Amount is the base amount (same as Withholding Taxable Amount). Grand Total Amount is
        Net Amount + VAT Amount, and withholding is 3% when net is at least 20,000.
      </p>

      <div class="mt-6 w-full min-w-0">
        <p class="block text-sm font-medium text-slate-500">VAT Type</p>
        <div class="mt-2 w-full min-w-0 max-w-full overflow-hidden">
          <div
            class="box-border w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 sm:overflow-x-visible"
            role="radiogroup"
            aria-label="VAT Type"
          >
            <div class="flex min-w-max sm:min-w-0 sm:w-full">
              <label
                v-for="opt in vatRateOptions"
                :key="opt.value"
                class="relative min-w-max flex-none cursor-pointer rounded-lg sm:min-w-0 sm:flex-1"
              >
                <input
                  class="peer sr-only"
                  type="radio"
                  name="vatType"
                  :value="opt.value"
                  :checked="vatRate === opt.value"
                  @change="onVatRateChange"
                />
                <span
                  class="inline-flex w-full whitespace-nowrap items-center justify-center rounded-lg px-6 py-2 text-center leading-none text-6xl tracking-tight font-semibold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 peer-focus-visible:ring-offset-2"
                  :class="
                    vatRate === opt.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  "
                >
                  {{ opt.label }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-slate-500">
            Net Amount (Withholding Taxable)
          </label>
          <input
            class="mt-1 w-full bg-white text-6xl font-sans tabular-nums leading-none font-semibold tracking-tight focus:outline-none focus:ring-0"
            :class="{ 'text-green-500': flashMap.netAmount }"
            type="text"
            step="0.01"
            inputmode="decimal"
            :value="
              focusedField === 'netAmount' ? rawInput.netAmount : format2Display(calc.netAmount)
            "
            @input="onEdit('netAmount', $event)"
            @focus="onFocus('netAmount')"
            @blur="onBlur('netAmount')"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-500">
            VAT Amount ({{ selectedVatRateLabel }})
          </label>
          <input
            class="mt-1 w-full bg-white text-6xl font-sans tabular-nums leading-none font-semibold tracking-tight focus:outline-none focus:ring-0"
            :class="{ 'text-green-500': flashMap.vatAmount }"
            type="text"
            step="0.01"
            inputmode="decimal"
            :value="
              focusedField === 'vatAmount' ? rawInput.vatAmount : format2Display(calc.vatAmount)
            "
            @input="onEdit('vatAmount', $event)"
            @focus="onFocus('vatAmount')"
            @blur="onBlur('vatAmount')"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-500">Withholding Tax Amount</label>
          <input
            class="mt-1 w-full bg-white text-6xl font-sans tabular-nums leading-none font-semibold tracking-tight focus:outline-none focus:ring-0"
            :class="{ 'text-green-500': flashMap.withholdingTaxAmount }"
            type="text"
            step="0.01"
            inputmode="decimal"
            :value="
              focusedField === 'withholdingTaxAmount'
                ? rawInput.withholdingTaxAmount
                : format2Display(calc.withholdingTaxAmount)
            "
            @input="onEdit('withholdingTaxAmount', $event)"
            @focus="onFocus('withholdingTaxAmount')"
            @blur="onBlur('withholdingTaxAmount')"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-slate-500">Grand Total Amount</label>
          <input
            class="mt-1 w-full bg-white text-6xl font-sans tabular-nums leading-none font-semibold tracking-tight focus:outline-none focus:ring-0"
            :class="{ 'text-green-500': flashMap.grandTotalAmount }"
            type="text"
            step="0.01"
            inputmode="decimal"
            :value="
              focusedField === 'grandTotalAmount'
                ? rawInput.grandTotalAmount
                : format2Display(calc.grandTotalAmount)
            "
            @input="onEdit('grandTotalAmount', $event)"
            @focus="onFocus('grandTotalAmount')"
            @blur="onBlur('grandTotalAmount')"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-slate-500">Payment Amount</label>
          <input
            class="mt-1 w-full bg-white text-6xl font-sans tabular-nums leading-none font-semibold tracking-tight focus:outline-none focus:ring-0"
            :class="{ 'text-green-500': flashMap.paymentAmount }"
            type="text"
            step="0.01"
            inputmode="decimal"
            :value="
              focusedField === 'paymentAmount'
                ? rawInput.paymentAmount
                : format2Display(calc.paymentAmount)
            "
            @input="onEdit('paymentAmount', $event)"
            @focus="onFocus('paymentAmount')"
            @blur="onBlur('paymentAmount')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
