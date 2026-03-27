<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="min-h-full bg-white">
    <section class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 class="text-3xl font-semibold text-slate-900">Welcome</h1>
      <p class="text-slate-600">
        This is the homepage. Open the withholding calculator from the dedicated route.
      </p>
      <div>
        <RouterLink
          class="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-700"
          to="/withcal"
        >
          Go to Withholding Calculator
        </RouterLink>
      </div>
      <div>
        <RouterLink
          class="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-700"
          to="/salcal"
        >
          Go to Salary Calculator
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped></style>
