import { createRouter, createWebHistory, type RouteLocation } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import LoginView from "@/views/LoginView.vue";
import AdminLayout from "@/layouts/AdminLayout.vue";
import UserLayout from "@/layouts/UserLayout.vue";
import AdminDashboardView from "@/views/AdminDashboardView.vue";
import AdminUsersView from "@/views/AdminUsersView.vue";
import UserDashboardView from "@/views/UserDashboardView.vue";
import SendView from "@/views/SendView.vue";
import SendByNumberView from "@/views/SendByNumberView.vue";
import GroupsView from "@/views/GroupsView.vue";
import ContactsView from "@/views/ContactsView.vue";
import AddSingleContactView from "@/views/AddSingleContactView.vue";
import ReportsView from "@/views/ReportsView.vue";
import MyBalanceView from "@/views/MyBalanceView.vue";
import ChangePasswordView from "@/views/ChangePasswordView.vue";
import GoogleContactsView from "@/views/GoogleContactsView.vue";
import AdminUserSmsBalanceView from "@/views/AdminUserSmsBalanceView.vue";
import SmsSettingView from "@/views/SmsSettingView.vue";

function legacyRedirect(to: RouteLocation) {
  const { isAuthenticated, basePath } = useAuth();

  if (!isAuthenticated.value) {
    return "/login";
  }

  const path = to.path;
  if (path.startsWith("/dashboard/")) {
    return basePath.value + path.slice("/dashboard".length);
  }

  return basePath.value;
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/admin",
      component: AdminLayout,
      meta: { requiresAuth: true, role: "admin" },
      children: [
        { path: "", name: "admin-dashboard", component: AdminDashboardView },
        { path: "users", name: "admin-users", component: AdminUsersView },
        {
          path: "user-sms-balance",
          name: "admin-user-sms-balance",
          component: AdminUserSmsBalanceView,
        },
        {
          path: "sms-setting",
          name: "admin-sms-setting",
          component: SmsSettingView,
        },
        { path: "reports", name: "admin-reports", component: ReportsView },
      ],
    },
    {
      path: "/user",
      component: UserLayout,
      meta: { requiresAuth: true, role: "user" },
      children: [
        { path: "", name: "user-dashboard", component: UserDashboardView },
        { path: "send", name: "user-send", component: SendView },
        {
          path: "send-by-number",
          name: "user-send-by-number",
          component: SendByNumberView,
        },
        { path: "groups", name: "user-groups", component: GroupsView },
        { path: "contacts", name: "user-contacts", component: ContactsView },
        {
          path: "contacts/add-single",
          name: "user-contacts-add-single",
          component: AddSingleContactView,
        },
        {
          path: "google-contacts",
          name: "user-google-contacts",
          component: GoogleContactsView,
        },
        { path: "balance", name: "user-balance", component: MyBalanceView },
        {
          path: "change-password",
          name: "user-change-password",
          component: ChangePasswordView,
        },
        { path: "reports", name: "user-reports", component: ReportsView },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: legacyRedirect },
  ],
});

router.beforeEach(async (to) => {
  const { isAuthenticated, user, basePath, refresh } = useAuth();

  if (to.meta.requiresAuth) {
    if (!isAuthenticated.value) {
      return { path: "/login" };
    }

    if (!(await refresh())) {
      return { path: "/login" };
    }
  }

  if (to.path === "/login" && isAuthenticated.value) {
    if (await refresh()) {
      return { path: basePath.value };
    }
  }

  const requiredRole = to.meta.role as string | undefined;
  if (requiredRole && user.value?.role !== requiredRole) {
    return { path: basePath.value };
  }

  return true;
});

export default router;
