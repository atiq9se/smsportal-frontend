<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "default" | "bordered" | "elevated";
    padding?: "none" | "sm" | "md" | "lg";
  }>(),
  {
    variant: "bordered",
    padding: "md",
  }
);

const variants: Record<string, string> = {
  default: "bg-white dark:bg-zinc-900",
  bordered:
    "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
  elevated: "bg-white shadow-sm dark:bg-zinc-900 dark:shadow-lg",
};

const paddings: Record<string, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};
</script>

<template>
  <div class="rounded-2xl" :class="[variants[variant], paddings[padding]]">
    <slot />
  </div>
</template>
