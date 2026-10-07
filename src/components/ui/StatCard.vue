<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = withDefaults(
  defineProps<{
    title: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    accent: string;
    href?: string;
  }>(),
  {
    trend: undefined,
    trendUp: true,
    href: undefined,
  }
);

const tag = computed(() => (props.href ? RouterLink : "div"));
const tagProps = computed(() => (props.href ? { to: props.href } : {}));
</script>

<template>
  <component
    :is="tag"
    v-bind="tagProps"
    class="group rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    :class="{ 'cursor-pointer': href }"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {{ title }}
        </p>
        <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
          {{ value }}
        </p>
        <div v-if="trend" class="mt-2 flex items-center gap-1.5">
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium"
            :class="
              trendUp
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
            "
          >
            {{ trendUp ? "↑" : "↓" }}
          </span>
          <span
            class="text-xs font-medium"
            :class="
              trendUp
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            "
          >
            {{ trend }}
          </span>
        </div>
      </div>
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="accent">
        <slot name="icon" />
      </div>
    </div>
    <div v-if="href" class="mt-4 flex items-center justify-end">
      <span
        class="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-gap group-hover:gap-2 dark:text-blue-400"
      >
        View details
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </span>
    </div>
  </component>
</template>
