import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import LoginView from "@/views/LoginView.vue";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import DashboardView from "@/views/DashboardView.vue";
import SendView from "@/views/SendView.vue";
import SendByNumberView from "@/views/SendByNumberView.vue";
import GroupsView from "@/views/GroupsView.vue";
import ContactsView from "@/views/ContactsView.vue";
import ReportsView from "@/views/ReportsView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/dashboard",
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        { path: "", name: "dashboard", component: DashboardView },
        { path: "send", name: "send", component: SendView },
        { path: "send-by-number", name: "send-by-number", component: SendByNumberView },
        { path: "groups", name: "groups", component: GroupsView },
        { path: "contacts", name: "contacts", component: ContactsView },
        { path: "reports", name: "reports", component: ReportsView },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
  ],
});

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth();

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { path: "/login" };
  }

  if (to.path === "/login" && isAuthenticated.value) {
    return { path: "/dashboard" };
  }

  return true;
});

export default router;
