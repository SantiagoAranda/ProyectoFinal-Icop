import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface ProtectedRouteProps {
  allowedRoles: ('admin' | 'empleado' | 'tesorero' | 'cliente')[];
  children: React.ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const user = useCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
