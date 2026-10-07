<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.action" class="mt-4 sm:mt-0">
      <slot name="action" />
    </div>
  </div>
</template>
