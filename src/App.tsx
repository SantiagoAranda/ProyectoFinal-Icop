import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/layout/MainLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import DashboardEmpleados from '../pages/empleados/DashboardEmpleados';
import DashboardTurnos from '../pages/turnos/DashboardTurnos';
import DashboardServicios from '../pages/servicios/DashboardServicios';
import Register from '../pages/Register';
import PrivateRoute from './PrivateRoute';

function App() {
  return (
    <Routes>
      {/* Rutas que usan el MainLayout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        
        {/* Rutas protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="empleados" element={<DashboardEmpleados />} />
          <Route path="turnos" element={<DashboardTurnos />} />
          <Route path="servicios" element={<DashboardServicios />} />
        </Route>
        
        <Route path="register" element={<Register />} />
      </Route>

      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
