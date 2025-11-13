import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { toast } from "react-toastify";
import { useRef } from "react";

interface ProtectedRouteProps {
  allowedRoles: ("admin" | "empleado" | "tesorero" | "cliente")[];
  children: React.ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { user } = useUser();

  // Evita mostrar toasts duplicados en render doble de React StrictMode
  const hasWarned = useRef(false);

  // Usuario NO logueado
  if (!user) {
    if (!hasWarned.current) {
      toast.error("Debes iniciar sesión para acceder a esta sección.");
      hasWarned.current = true;
    }
    return <Navigate to="/login" replace />;
  }

  // Usuario logueado pero sin permiso
  if (!allowedRoles.includes(user.role)) {
    if (!hasWarned.current) {
      toast.error("No tienes permiso para acceder a esta página.");
      hasWarned.current = true;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
