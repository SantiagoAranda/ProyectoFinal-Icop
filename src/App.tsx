import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home'
import Login from '../pages/Login'
import DashboardCliente from '../pages/cliente/DashboardCliente'
import DashboardEmpleado from '../pages/empleado/DashboardEmpleado'
import DashboardAdmin from '../pages/admin/DashboardAdmin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cliente" element={<DashboardCliente />} />
      <Route path="/empleado" element={<DashboardEmpleado />} />
      <Route path="/admin" element={<DashboardAdmin />} />
    </Routes>
  )
}

export default App