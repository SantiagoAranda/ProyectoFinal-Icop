import { Navigate, Outlet } from 'react-router-dom';

function PrivateRoute() {
  const user = JSON.parse(localStorage.getItem('user') || '{}'); // Obtener el usuario desde localStorage

  // Si no hay un usuario autenticado, redirigir a login
  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}

export default PrivateRoute;
