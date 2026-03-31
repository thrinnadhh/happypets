import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AppointmentsPage } from "@/pages/customer/AppointmentsPage";
import { ContactPage } from "@/pages/customer/ContactPage";
import { FavoritesPage } from "@/pages/customer/FavoritesPage";
import { CustomerHomePage } from "@/pages/customer/HomePage";
import { ProductDetailPage } from "@/pages/customer/ProductDetailPage";
import { SupportPage } from "@/pages/customer/SupportPage";
import { AdminDashboardPage } from "@/pages/admin/DashboardPage";
import { AdminProductsPage } from "@/pages/admin/ProductsPage";
import { LoginPage } from "@/pages/LoginPage";
import { SuperAdminAdminsPage } from "@/pages/superadmin/AdminsPage";
import { SuperAdminAnalyticsPage } from "@/pages/superadmin/AnalyticsPage";
import { SuperAdminDashboardPage } from "@/pages/superadmin/DashboardPage";
import { RoleRedirect } from "@/components/common/RoleRedirect";

export default function App(): JSX.Element {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/product/:id"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/home"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/appointments"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/contact"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ContactPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/support"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <SupportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute allowedRoles={["admin"]} requireApproved>
              <AdminProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/admins"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminAdminsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/analytics"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
