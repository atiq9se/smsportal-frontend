<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PageHeader, StatCard } from "@/components/ui";
import type { Group } from "@/types";

const groups = ref<Group[]>([]);
const selectedGroup = ref("");
const file = ref<File | null>(null);
const loading = ref(false);
const message = ref<{ type: "success" | "error"; text: string } | null>(null);
const formRef = ref<HTMLFormElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);

const totalGroups = computed(() => groups.value.length);
const totalContacts = computed(() =>
  groups.value.reduce((sum, g) => sum + (g.contacts ?? 0), 0)
);
const selectedGroupObj = computed(
  () => groups.value.find((g) => g.id === selectedGroup.value) ?? null
);

onMounted(() => {
  fetch("/api/groups")
    .then((r) => r.json())
    .then((data) => {
      groups.value = data.groups ?? [];
    })
    .catch(() => {});
});

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

function openFilePicker() {
  if (!selectedGroup.value) return;
  fileInput.value?.click();
}

function setFile(f: File | null | undefined) {
  if (!f) return;
  file.value = f;
  message.value = null;
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  setFile(target.files?.[0]);
}

function handleDrop(event: DragEvent) {
  dragOver.value = false;
  if (!selectedGroup.value) return;
  setFile(event.dataTransfer?.files?.[0]);
}

function clearFile() {
  file.value = null;
  formRef.value?.reset();
}

function dismissMessage() {
  message.value = null;
}

async function handleCsvSubmit() {
  if (!selectedGroup.value || !file.value) return;
  loading.value = true;
  message.value = null;

  try {
    const formData = new FormData();
    formData.append("groupId", selectedGroup.value);
    formData.append("file", file.value);
    const res = await fetch("/api/contacts/import", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      const dupes = data.duplicates ?? [];
      if (dupes.length > 0) {
        const shown = dupes.slice(0, 10).join(", ");
        const more = dupes.length > 10 ? ` (+${dupes.length - 10} more)` : "";
        message.value = {
          type: "success",
          text: `Imported ${data.imported} contacts. Skipped ${dupes.length} duplicate number(s) already in this group: ${shown}${more}`,
        };
      } else {
        message.value = {
          type: "success",
          text: `Imported ${data.imported} contacts.`,
        };
      }
      file.value = null;
      formRef.value?.reset();
      selectedGroup.value = "";
    } else {
      message.value = { type: "error", text: data.message ?? "Import failed." };
    }
  } catch {
    message.value = { type: "error", text: "Network error." };
  } finally {
    loading.value = false;
  }
}

const howItWorks = [
  {
    step: "1",
    title: "Choose a group",
    text: "Pick the destination group for your contacts.",
  },
  {
    step: "2",
    title: "Upload your file",
    text: "Drag & drop or browse a .csv / .xlsx file.",
  },
  {
    step: "3",
    title: "Import & review",
    text: "Duplicates are skipped automatically.",
  },
];

const columns = [
  { label: "Phone Number", required: true },
  { label: "Name", required: false },
  { label: "Email", required: false },
  { label: "Address", required: false },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Contact Add"
      description="Add contacts to a group via CSV or Excel upload"
    >
      <template #action>
        <a
          href="/demo.xlsx"
          download="demo.xlsx"
          class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Demo XLSX
        </a>
      </template>
    </PageHeader>

    <div
      v-if="message"
      class="flex items-start gap-3 rounded-xl border p-4 text-sm"
      :class="
        message.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
      "
      role="alert"
    >
      <span
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        :class="
          message.type === 'success'
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400'
            : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
        "
      >
        <svg
          v-if="message.type === 'success'"
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg
          v-else
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14"
          />
        </svg>
      </span>
      <p class="flex-1 break-words">{{ message.text }}</p>
      <button
        type="button"
        class="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
        @click="dismissMessage"
      >
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <StatCard
        title="Total Groups"
        :value="totalGroups"
        accent="bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
        href="/dashboard/groups"
      >
        <template #icon>
          <span class="text-2xl" role="img" aria-hidden="true">📁</span>
        </template>
      </StatCard>
      <StatCard
        title="Total Contacts"
        :value="totalContacts.toLocaleString()"
        accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        href="/dashboard/groups"
      >
        <template #icon>
          <span class="text-2xl" role="img" aria-hidden="true">👥</span>
        </template>
      </StatCard>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <div
          class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
            <h2 class="text-base font-semibold text-zinc-900 dark:text-white">
              Import Contacts
            </h2>
            <p class="mt-1 text-sm text-zinc-500">
              Upload a CSV or Excel file to add numbers to a group
            </p>
          </div>

          <div class="space-y-6 p-6">
            <div>
              <label
                for="groupSelect"
                class="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white"
                >
                  1
                </span>
                Select Group
              </label>
              <select
                id="groupSelect"
                v-model="selectedGroup"
                class="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              >
                <option value="">Choose a group…</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">
                  {{ g.name }} ({{ g.contacts }} contacts)
                </option>
              </select>
              <p
                v-if="selectedGroupObj"
                class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <span class="font-medium text-emerald-600 dark:text-emerald-400">
                  {{ selectedGroupObj.contacts }}
                </span>
                contact(s) already in this group — duplicates will be skipped.
              </p>
              <p
                v-else-if="groups.length === 0"
                class="mt-1.5 text-xs text-amber-600 dark:text-amber-400"
              >
                No groups found — create a group first.
              </p>
            </div>

            <div>
              <p
                class="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white"
                >
                  2
                </span>
                Upload File
              </p>

              <form ref="formRef" @submit.prevent="handleCsvSubmit">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  class="hidden"
                  :disabled="!selectedGroup"
                  @change="handleFileChange"
                />

                <div
                  class="mt-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors"
                  :class="
                    !selectedGroup
                      ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-800/40'
                      : dragOver
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                        : 'cursor-pointer border-zinc-300 bg-zinc-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/20'
                  "
                  @click="openFilePicker"
                  @dragover.prevent="
                    selectedGroup && (dragOver = true)
                  "
                  @dragleave.prevent="dragOver = false"
                  @drop.prevent="handleDrop"
                >
                  <svg
                    class="mx-auto h-9 w-9"
                    :class="
                      selectedGroup
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-zinc-400'
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                  </svg>
                  <p class="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {{
                      selectedGroup
                        ? "Drag & drop your file here, or click to browse"
                        : "Select a group first to upload files"
                    }}
                  </p>
                  <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Accepted formats: .csv, .xlsx, .xls
                  </p>
                </div>

                <div
                  v-if="file"
                  class="mt-3 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {{ file.name }}
                    </p>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">
                      {{ formatSize(file.size) }} · ready to import
                    </p>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                    title="Remove file"
                    @click="clearFile"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <button
                  type="submit"
                  :disabled="!selectedGroup || !file || loading"
                  class="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    v-if="loading"
                    class="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  {{ loading ? "Importing…" : "Import Contacts" }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">
            How it works
          </h3>
          <ol class="mt-4 space-y-4">
            <li v-for="item in howItWorks" :key="item.step" class="flex gap-3">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              >
                {{ item.step }}
              </span>
              <div>
                <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {{ item.title }}
                </p>
                <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {{ item.text }}
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">
            Required columns
          </h3>
          <ul class="mt-4 space-y-2">
            <li
              v-for="col in columns"
              :key="col.label"
              class="flex items-center justify-between gap-3"
            >
              <code
                class="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {{ col.label }}
              </code>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="
                  col.required
                    ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                "
              >
                {{ col.required ? "required" : "optional" }}
              </span>
            </li>
          </ul>
          <a
            href="/demo.xlsx"
            download="demo.xlsx"
            class="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download demo file
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
