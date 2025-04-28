import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-blue-600 p-4 flex justify-between items-center">
      <div className="text-white font-bold text-xl">
        MiSistema
      </div>
      <div className="flex gap-4">
        <Link to="/" className="text-white hover:text-gray-300">Inicio</Link>
        <Link to="/servicios" className="text-white hover:text-gray-300">Servicios</Link>
        <Link to="/empleados" className="text-white hover:text-gray-300">Empleados</Link>
        <Link to="/turnos" className="text-white hover:text-gray-300">Turnos</Link>
        <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;
