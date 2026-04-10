import { AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AppointmentsPage } from "@/pages/customer/AppointmentsPage";
import { ContactPage } from "@/pages/customer/ContactPage";
import { CategoryPage } from "@/pages/customer/CategoryPage";
import { CartPage } from "@/pages/customer/CartPage";
import { FavoritesPage } from "@/pages/customer/FavoritesPage";
import { CustomerHomePage } from "@/pages/customer/HomePage";
import { OrdersPage } from "@/pages/customer/OrdersPage";
import { ProductDetailPage } from "@/pages/customer/ProductDetailPage";
import { ProfilePage } from "@/pages/customer/ProfilePage";
import { SupportPage } from "@/pages/customer/SupportPage";
import { AdminBannersPage } from "@/pages/admin/BannersPage";
import { AdminCouponsPage } from "@/pages/admin/CouponsPage";
import { AdminDashboardPage } from "@/pages/admin/DashboardPage";
import { AdminDeliveryPage } from "@/pages/admin/DeliveryPage";
import { AdminProductsPage } from "@/pages/admin/ProductsPage";
import { LoginPage } from "@/pages/LoginPage";
import { SuperAdminAdminsPage } from "@/pages/superadmin/AdminsPage";
import { SuperAdminAnalyticsPage } from "@/pages/superadmin/AnalyticsPage";
import { SuperAdminDashboardPage } from "@/pages/superadmin/DashboardPage";
import { SuperAdminShopsPage } from "@/pages/superadmin/ShopsPage";
import { RoleRedirect } from "@/components/common/RoleRedirect";

export default function App(): JSX.Element {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string>("");

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}${location.hash}`;

    // Prevent duplicate page_view events in React StrictMode and repeated renders.
    if (lastTrackedPathRef.current === pagePath) {
      return;
    }

    lastTrackedPathRef.current = pagePath;

    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_path: pagePath,
        page_location: window.location.href,
      });
    }
  }, [location.hash, location.pathname, location.search]);

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
          path="/category/:type"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CategoryPage />
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
          path="/cart"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <OrdersPage />
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
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ProfilePage />
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
          path="/admin/banners"
          element={
            <ProtectedRoute allowedRoles={["admin"]} requireApproved>
              <AdminBannersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <ProtectedRoute allowedRoles={["admin"]} requireApproved>
              <AdminCouponsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/delivery"
          element={
            <ProtectedRoute allowedRoles={["admin"]} requireApproved>
              <AdminDeliveryPage />
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
          path="/superadmin/shops"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminShopsPage />
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
