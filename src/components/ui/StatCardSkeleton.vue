<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";
</script>

<template>
  <div
    class="animate-pulse rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <LoadingSkeleton class-name="h-4 w-3/4" />
        <LoadingSkeleton class-name="mt-4 h-8 w-1/2" />
        <LoadingSkeleton class-name="mt-2 h-3 w-1/3" />
      </div>
      <LoadingSkeleton class-name="h-12 w-12 shrink-0 rounded-xl" />
    </div>
  </div>
</template>
