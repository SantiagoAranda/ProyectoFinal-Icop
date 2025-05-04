import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

function Navbar() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };


  //
  return (
    <nav className="bg-white p-4 flex justify-between items-center border-b border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <div className="text-white font-bold text-xl">MiSistema</div>
      <div className="flex gap-4">
        <Link to="/" className="text-white hover:text-gray-300">Inicio</Link>

        {user?.role === 'admin' && (
          <>
            <Link to="/turnos" className="text-white hover:text-gray-300">Turnos</Link>
            <Link to="/empleados" className="text-white hover:text-gray-300">Empleados</Link>
            <Link to="/servicios" className="text-white hover:text-gray-300">Servicios</Link>
            <Link to="/tesoreria" className="text-white hover:text-gray-300">Tesoreria</Link>
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
