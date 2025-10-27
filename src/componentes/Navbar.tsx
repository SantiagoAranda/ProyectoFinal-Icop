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

  const baseLink =
    "text-primary hover:text-primary-dark relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full";

  return (
    <nav className="bg-white border-b border-primary/30 shadow-[0_2px_8px_rgba(247,143,179,0.1)] font-sans">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* === IZQUIERDA: LOGO O TÍTULO === */}
        <div className="flex items-center gap-4">
          <div className="text-primary font-semibold text-xl">Mi Sistema</div>
        </div>

        {/* === DERECHA: LINKS === */}
        <div className="flex items-center gap-6">

          {/* === ADMIN, TESORERO, CLIENTE: INICIO GENERAL === */}
          {['admin', 'tesorero', 'cliente'].includes(user?.role ?? '') && (
            <Link to="/" className={baseLink}>
              Inicio
            </Link>
          )}

          {/* === ADMIN === */}
          {user?.role === 'admin' && (
            <>
              <Link to="/turnos" className={baseLink}>Turnos</Link>
              <Link to="/empleados" className={baseLink}>Empleados</Link>
              <Link to="/servicios" className={baseLink}>Servicios</Link>
              <Link to="/tesoreria" className={baseLink}>Tesorería</Link>
            </>
          )}

          {/* === TESORERO === */}
          {user?.role === 'tesorero' && (
            <Link to="/tesoreria" className={baseLink}>Tesorería</Link>
          )}

          {/* === CLIENTE === */}
          {user?.role === 'cliente' && (
            <>
              <Link to="/servicios" className={baseLink}>Servicios</Link>
              <Link to="/turnos/nuevo" className={baseLink}>Reservar turno</Link>
            </>
          )}

          {/* === EMPLEADO === */}
          {user?.role === 'empleado' && (
            <>
              <Link to="/inicio-empleado" className={baseLink}>
                Inicio
              </Link>
              <Link to="/turnos-empleado" className={baseLink}>
                Mis turnos
              </Link>
            </>
          )}

          {/* === LOGIN / LOGOUT === */}
          {user ? (
            <button
              onClick={handleLogout}
              className="text-primary hover:text-primary-dark font-semibold transition"
            >
              Salir
            </button>
          ) : (
            <Link to="/login" className={baseLink}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
