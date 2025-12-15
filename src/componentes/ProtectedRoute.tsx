import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

type Role = "admin" | "empleado" | "tesorero" | "cliente";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { user, loading } = useUser();
  const location = useLocation();

  // 0) Esperando a que cargue desde localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

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
