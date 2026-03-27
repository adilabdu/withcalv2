<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="min-h-full bg-white">
    <section class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div class="flex flex-col gap-4">
        <RouterLink
          class="group flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
          to="/withcal"
        >
          <span
            class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M4 10h16M8 14h2.5M13.5 14H16"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="font-semibold text-slate-900">Withholding Calculator</span>
            <span class="text-sm text-slate-600">
              Estimate paycheck withholding using filing status and allowances.
            </span>
          </span>
        </RouterLink>

        <RouterLink
          class="group flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
          to="/salcal"
        >
          <span
            class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5v13A1.5 1.5 0 0 1 15.5 20h-7A1.5 1.5 0 0 1 7 18.5v-13Z"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M10 8h4M10 11h4M10 14h2"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="font-semibold text-slate-900">Salary Calculator</span>
            <span class="text-sm text-slate-600">
              Break down salary figures and compare monthly and annual totals.
            </span>
          </span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped></style>
