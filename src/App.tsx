import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
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
import "react-toastify/dist/ReactToastify.css";
import 'react-big-calendar/lib/css/react-big-calendar.css';


function App() {
  return (
    <>
      <Routes>
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

      {/* Contenedor de notificaciones */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName={() =>
          "relative flex p-4 rounded-2xl justify-between overflow-hidden cursor-pointer bg-pink-100 text-pink-900 shadow-lg border border-pink-300"
        }
        bodyClassName={() => "text-sm font-medium"}
        progressClassName={() => "bg-pink-400"}
      />
    </>
  );
}

export default App;
