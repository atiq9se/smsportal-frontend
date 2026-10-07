<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface MultiSelectOption {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    options: MultiSelectOption[];
    modelValue: string[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: "Select groups...",
    disabled: false,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const open = ref(false);
const search = ref("");
const root = ref<HTMLElement | null>(null);

const filteredOptions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return props.options;
  return props.options.filter((o) => o.label.toLowerCase().includes(term));
});

function toggleOption(value: string) {
  const current = props.modelValue;
  if (current.includes(value)) {
    emit(
      "update:modelValue",
      current.filter((v) => v !== value)
    );
  } else {
    emit("update:modelValue", [...current, value]);
  }
}

function removeOption(value: string) {
  emit(
    "update:modelValue",
    props.modelValue.filter((v) => v !== value)
  );
}

function openMenu() {
  if (!props.disabled) open.value = true;
}

function handleDocumentMousedown(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    closeMenu();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeMenu();
}

function closeMenu() {
  open.value = false;
  search.value = "";
}

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentMousedown);
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentMousedown);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div ref="root" class="relative">
    <div
      class="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:focus-within:border-blue-500"
      :class="{ 'cursor-not-allowed opacity-50': disabled }"
      @click="openMenu"
    >
      <span
        v-if="modelValue.length === 0 && !search"
        class="pointer-events-none px-1 text-zinc-500"
      >
        {{ placeholder }}
      </span>

      <span
        v-for="option in options.filter((o) => modelValue.includes(o.value))"
        :key="option.value"
        class="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
      >
        {{ option.label }}
        <button
          type="button"
          class="rounded text-blue-600 transition-colors hover:bg-blue-200 hover:text-blue-900 dark:text-blue-400 dark:hover:bg-blue-900 dark:hover:text-blue-200"
          :aria-label="`Remove ${option.label}`"
          @click.stop="removeOption(option.value)"
        >
          <svg
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>

      <input
        v-model="search"
        type="text"
        class="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-900 outline-none dark:text-zinc-100"
        :disabled="disabled"
        :placeholder="modelValue.length > 0 ? '' : undefined"
        @focus="openMenu"
        @keydown.down.prevent="open = true"
      />

      <button
        type="button"
        class="pointer-events-auto ml-auto flex h-6 w-6 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        tabindex="-1"
        aria-label="Toggle menu"
        @click.stop="open = !open"
      >
        <svg
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': open }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <div
      v-if="open"
      class="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
    >
      <button
        v-for="option in filteredOptions"
        :key="option.value"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors"
        :class="
          modelValue.includes(option.value)
            ? 'bg-blue-600 text-white'
            : 'text-zinc-900 hover:bg-blue-50 dark:text-zinc-100 dark:hover:bg-zinc-700'
        "
        @click="toggleOption(option.value)"
      >
        <span>{{ option.label }}</span>
        <svg
          v-if="modelValue.includes(option.value)"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <p v-if="filteredOptions.length === 0" class="px-3 py-2 text-sm text-zinc-500">
        No groups found
      </p>
    </div>
  </div>
</template>
