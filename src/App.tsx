import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import DashboardEmpleados from '../pages/empleados/DashboardEmpleados';
import DashboardTurnos from '../pages/turnos/DashboardTurnos';
import DashboardServicios from '../pages/servicios/DashboardServicios';

function App() {
  return (
    <Routes>
      {/* Rutas que usan el MainLayout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="empleados" element={<DashboardEmpleados />} />
        <Route path="turnos" element={<DashboardTurnos />} />
        <Route path="servicios" element={<DashboardServicios />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Rutas que NO usan el layout */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
