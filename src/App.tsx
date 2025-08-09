import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/layout/MainLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import DashboardEmpleados from '../pages/empleados/DashboardEmpleados';
import DashboardTurnos from '../pages/turnos/DashboardTurnos';
import DashboardServicios from '../pages/servicios/DashboardServicios';
import DashboardTesoreria from '../pages/tesoreria/DashboardTesoreria';
import ProtectedRoute from '@/componentes/ProtectedRoute';
import GenerarTurnoCliente from '../pages/turnos/GenerarTurnoCliente';

function App() {
  return (
    <Routes>
      {/* Layout principal para rutas protegidas */}
      <Route path="/" element={<MainLayout />}>
        {/* Página de inicio */}
        <Route index element={<Home />} />

        {/* Gestión de empleados (solo admin) */}
        <Route
          path="empleados"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardEmpleados />
            </ProtectedRoute>
          }
        />

        {/* Gestión de turnos */}
        <Route
          path="turnos"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardTurnos />
            </ProtectedRoute>
          }
        />
        {/* Nuevo turno para clientes */}
        <Route
          path="turnos/nuevo"
          element={
            <ProtectedRoute allowedRoles={['cliente']}>
              <GenerarTurnoCliente />
            </ProtectedRoute>
          }
        />

        {/* Servicios (admin y cliente) */}
        <Route
          path="servicios"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <DashboardServicios />
            </ProtectedRoute>
          }
        />

        {/* Tesorería (admin y tesorero) */}
        <Route
          path="tesoreria"
          element={
            <ProtectedRoute allowedRoles={['tesorero', 'admin']}>
              <DashboardTesoreria />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Rutas públicas sin MainLayout */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;
