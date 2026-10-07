<script setup lang="ts">
import LoadingSkeleton from "./LoadingSkeleton.vue";

withDefaults(defineProps<{ rows?: number; cols?: number }>(), {
  rows: 5,
  cols: 5,
});
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm">
      <thead>
        <tr
          class="border-b border-zinc-100 text-xs uppercase tracking-wider text-zinc-400 dark:border-zinc-800"
        >
          <th v-for="i in cols" :key="`h-${i}`" class="px-6 py-3 font-medium">
            <LoadingSkeleton class-name="h-4 w-3/4" />
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
        <tr v-for="row in rows" :key="`r-${row}`">
          <td v-for="col in cols" :key="`c-${col}`" class="px-6 py-4">
            <LoadingSkeleton class-name="h-4 w-full max-w-[200px]" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
