<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center py-16 text-center"
  >
    <div
      class="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800"
    >
      <span class="text-zinc-400 dark:text-zinc-500">{{ icon }}</span>
    </div>
    <h3 class="mt-6 text-lg font-medium text-zinc-900 dark:text-white">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400"
    >
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
