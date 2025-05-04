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


function App() {
  return (
    <Routes>
      {/* Rutas protegidas que usan el layout principal */}
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
