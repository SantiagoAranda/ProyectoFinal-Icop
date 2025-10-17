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

  return (
    <nav className="bg-white border-b border-primary/30 shadow-[0_2px_8px_rgba(247,143,179,0.1)] font-sans">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* izquierda: título */}
        <div className="flex items-center gap-4">
          <div className="text-primary font-semibold text-xl">Mi Sistema</div>
        </div>

        {/* derecha: links y auth */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-primary hover:text-primary-dark relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
          >
            Inicio
          </Link>

          {user?.role === 'admin' && (
            <>
              <Link to="/turnos" className="navbar-link">Turnos</Link>
              <Link to="/empleados" className="navbar-link">Empleados</Link>
              <Link to="/servicios" className="navbar-link">Servicios</Link>
              <Link to="/tesoreria" className="navbar-link">Tesorería</Link>
            </>
          )}

          {user?.role === 'tesorero' && (
            <Link to="/tesoreria" className="navbar-link">Tesorería</Link>
          )}

          {user?.role === 'cliente' && (
            <Link to="/servicios" className="navbar-link">Servicios</Link>
          )}

          {user ? (
            <button onClick={handleLogout} className="navbar-link">Salir</button>
          ) : (
            <Link to="/login" className="navbar-link">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
