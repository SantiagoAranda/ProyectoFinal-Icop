import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  // Obtener usuario desde localStorage (de forma segura)
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

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
          <>
            <Link to="/turnos" className="text-white hover:text-gray-300">Turnos</Link>
            <Link to="/empleados" className="text-white hover:text-gray-300">Empleados</Link>
            <Link to="/servicios" className="text-white hover:text-gray-300">Servicios</Link>
          </>
        )}

        {user?.role === 'tesorero' && (
          <Link to="/tesoreria" className="text-white hover:text-gray-300">Tesorería</Link>
        )}

        {user?.role === 'cliente' && (
          <Link to="/servicios" className="text-white hover:text-gray-300">Servicios</Link>
        )}

        {user ? (
          <button onClick={handleLogout} className="text-white hover:text-gray-300">Salir</button>
        ) : (
          <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
