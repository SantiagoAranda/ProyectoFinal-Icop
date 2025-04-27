import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/layout/MainLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import DashboardCliente from '../pages/cliente/DashboardCliente';
import DashboardEmpleado from '../pages/empleado/DashboardEmpleado';
import DashboardAdmin from '../pages/admin/DashboardAdmin';
import Register from '../pages/Register';


function App() {
  return (
    <Routes>
      {/* Rutas que usan el MainLayout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="cliente" element={<DashboardCliente />} />
        <Route path="empleado" element={<DashboardEmpleado />} />
        <Route path="admin" element={<DashboardAdmin />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Rutas que NO usan el layout */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;