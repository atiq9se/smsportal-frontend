<script setup lang="ts">
import { useRoute } from "vue-router";

defineProps<{
  items: { to: string; label: string; icon: string }[];
}>();

const route = useRoute();
</script>

<template>
  <nav class="mt-6 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
      :class="
        route.path === item.to
          ? 'bg-blue-600 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      "
    >
      <svg
        class="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
      </svg>
      {{ item.label }}
    </router-link>
  </nav>
</template>
