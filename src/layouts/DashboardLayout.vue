<script setup lang="ts">
import { RouterLink } from "vue-router";
import LogoutButton from "@/components/LogoutButton.vue";
import SidebarNav from "@/components/SidebarNav.vue";
</script>

<template>
  <div class="flex min-h-screen bg-zinc-100 dark:bg-zinc-950">
    <aside class="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-zinc-950 dark:bg-black">
      <RouterLink to="/dashboard" class="flex items-center gap-3 px-6 py-5 hover:bg-zinc-900/50 dark:hover:bg-zinc-800/50 transition-colors">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold text-white">SMS Portal</p>
          <p class="text-xs text-zinc-500">Admin Panel</p>
        </div>
      </RouterLink>

      <SidebarNav />
    </aside>

    <div class="ml-64 flex min-h-screen flex-1 flex-col">
      <header
        class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/80 px-8 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <img
          src="/iylma.png"
          alt="iylma"
          class="h-9 w-auto rounded"
        />
        <div class="flex items-center gap-3">
          <LogoutButton />
        </div>
      </header>

      <main class="flex-1 p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>
