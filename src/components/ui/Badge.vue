<script setup lang="ts">
import type { BadgeVariant } from "./badgeStyles";

withDefaults(
  defineProps<{
    variant?: BadgeVariant;
    size?: "sm" | "md" | "lg";
    dot?: boolean;
  }>(),
  {
    variant: "default",
    size: "md",
    dot: false,
  }
);

const variants: Record<BadgeVariant, string> = {
  default:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  outline:
    "border border-zinc-200 bg-transparent text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
};

const sizes: Record<string, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1 text-sm",
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-medium"
    :class="[variants[variant], sizes[size]]"
  >
    <span
      v-if="dot"
      class="h-1.5 w-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
