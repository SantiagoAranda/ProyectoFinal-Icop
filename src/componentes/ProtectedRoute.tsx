import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

type Role = "admin" | "empleado" | "tesorero" | "cliente";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { user } = useUser();
  const location = useLocation();

  // 1) Usuario NO logueado -> al login
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // 2) Usuario con sesión pero SIN permiso -> al home
  if (!allowedRoles.includes(user.role as Role)) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname, denied: true }}
      />
    );
  }

  // 3) Usuario autorizado -> render normal
  return <>{children}</>;
};

export default ProtectedRoute;
