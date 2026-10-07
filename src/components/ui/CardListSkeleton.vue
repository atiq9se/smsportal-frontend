<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";

withDefaults(defineProps<{ items?: number }>(), { items: 3 });
</script>

<template>
  <div
    class="animate-pulse divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div v-for="i in items" :key="i" class="px-6 py-4">
      <LoadingSkeleton class-name="h-5 w-1/3" />
    </div>
  </div>
</template>
