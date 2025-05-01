import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/layout/MainLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import DashboardEmpleados from '../pages/empleados/DashboardEmpleados';
import DashboardTurnos from '../pages/turnos/DashboardTurnos';
import DashboardServicios from '../pages/servicios/DashboardServicios';
import DashboardTesoreria from '../pages/tesoreria/DashboardTesoreria';
import Register from '../pages/Register';
import ProtectedRoute from '@/componentes/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Rutas que usan el MainLayout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />

        <Route
          path="empleados"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardEmpleados />
            </ProtectedRoute>
          }
        />
        <Route
          path="turnos"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardTurnos />
            </ProtectedRoute>
          }
        />
        <Route
          path="servicios"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <DashboardServicios />
            </ProtectedRoute>
          }
        />
        <Route
          path="tesoreria"
          element={
            <ProtectedRoute allowedRoles={['tesorero']}>
              <DashboardTesoreria />
            </ProtectedRoute>
          }
        />

        <Route path="register" element={<Register />} />
      </Route>

      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
