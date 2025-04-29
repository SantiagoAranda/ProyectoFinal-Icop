import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}'); // Obtener el usuario desde localStorage

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login'); // Redirigir al login
  };

  return (
    <nav className="bg-blue-600 p-4 flex justify-between items-center">
      <div className="text-white font-bold text-xl">
        MiSistema
      </div>
      <div className="flex gap-4">
        <Link to="/" className="text-white hover:text-gray-300">Inicio</Link>
        {user?.role === 'admin' && (
          <Link to="/turnos" className="text-white hover:text-gray-300">Turnos</Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/empleados" className="text-white hover:text-gray-300">Empleados</Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/servicios" className="text-white hover:text-gray-300">Servicios</Link>
        )}
        {user?.role === 'cliente' && (
          <Link to="/servicios" className="text-white hover:text-gray-300">Servicios</Link>
        )}
        {user ? (
          <button onClick={handleLogout} className="text-white hover:text-gray-300">Logout</button>
        ) : (
          <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
