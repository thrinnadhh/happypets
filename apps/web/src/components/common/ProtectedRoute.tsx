import { Navigate, useLocation } from "react-router-dom";
import { useAuth, getDefaultRoute } from "@/contexts/AuthContext";
import { Loader } from "@/components/common/Loader";
import { Role } from "@/types";

export function ProtectedRoute({
  children,
  allowedRoles,
  requireApproved = false,
}: {
  children: JSX.Element;
  allowedRoles: Role[];
  requireApproved?: boolean;
}): JSX.Element {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader label="Checking your workspace access..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  if (requireApproved && user.role === "admin" && !user.approved) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
