<script setup lang="ts">
withDefaults(defineProps<{ className?: string }>(), { className: "" });
</script>

<template>
  <div
    class="animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
    :class="className"
    aria-hidden="true"
  />
</template>
