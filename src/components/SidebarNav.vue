<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10",
  },
  {
    to: "/dashboard/send",
    label: "Send SMS By Group",
    icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  },
  {
    to: "/dashboard/send-by-number",
    label: "Send SMS By Number",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    to: "/dashboard/groups",
    label: "Groups",
    icon: "M3 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14l-1.5-1.5L6 21l-1.5-1.5L3 21V7zm10-2h8a2 2 0 0 1 2 2v14l-1.5-1.5L20 21l-1.5-1.5L17 21V7a2 2 0 0 1 2-2m-2 6h6m-6 4h6m-6 4h6",
  },
  {
    to: "/dashboard/contacts",
    label: "Contact Add",
    icon: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-6 0m6 0A4 4 0 0 1 14 12m-6 0a4 4 0 0 1-2 3.5M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  },
  {
    to: "/dashboard/reports",
    label: "SMS History",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z",
  },
];
</script>

<template>
  <nav class="mt-6 flex-1 space-y-1 px-3">
    <router-link
      v-for="item in navItems"
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
