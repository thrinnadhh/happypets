import { Navigate } from "react-router-dom";
import { Loader } from "@/components/common/Loader";
import { getDefaultRoute, useAuth } from "@/contexts/AuthContext";

export function RoleRedirect(): JSX.Element {
  const { loading, user } = useAuth();

  if (loading) {
    return <Loader />;
  }

  return <Navigate to={getDefaultRoute(user)} replace />;
}
