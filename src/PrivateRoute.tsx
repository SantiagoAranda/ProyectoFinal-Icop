import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

interface PrivateRouteProps {
  allowedRoles?: ('admin' | 'empleado' | 'tesorero' | 'cliente')[];
}

function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { user } = useUser();

  // No autenticado -> login
  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  // Si se especifican roles y el usuario no está permitido -> home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
