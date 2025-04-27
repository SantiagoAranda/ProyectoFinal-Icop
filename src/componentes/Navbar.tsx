import { Link } from 'react-router-dom';


function Navbar() {
  return (
    <nav className="bg-blue-600 p-4 flex justify-between items-center">
      <div className="text-white font-bold text-xl">
        MiSistema
      </div>
      <div className="flex gap-4">
        <Link to="/" className="text-white hover:text-gray-300">Inicio</Link>
        <Link to="/cliente" className="text-white hover:text-gray-300">Cliente</Link>
        <Link to="/empleado" className="text-white hover:text-gray-300">Empleado</Link>
        <Link to="/admin" className="text-white hover:text-gray-300">Admin</Link>
        <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;