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
    <>
    <nav className="bg-white p-4 flex justify-between items-center relative z-10 shadow-md">
      <div className="text-gray-800 font-bold text-xl">MiSistema</div>
      <div className="flex gap-4">
        <Link to="/" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Inicio</Link>
  
        {user?.role === 'admin' && (
          <>
            <Link to="/turnos" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Turnos</Link>
            <Link to="/empleados" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Empleados</Link>
            <Link to="/servicios" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Servicios</Link>
            <Link to="/tesoreria" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Tesorería</Link>
          </>
        )}
  
        {user?.role === 'tesorero' && (
          <Link to="/tesoreria" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Tesorería</Link>
        )}
  
        {user?.role === 'cliente' && (
          <Link to="/servicios" className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Servicios</Link>
        )}
  
        {user ? (
          <button onClick={handleLogout} className="relative font-sans text-gray-800 hover:text-black transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-black after:transition-all after:duration-300">Salir</button>
        ) : (
          <Link to="/login" className="text-gray-800 hover:text-gray-500">Login</Link>
        )}
      </div>
    </nav>
  
    {/* Degradado invertido para dar sensación de elevación */}
    <div className="h-[6px] bg-gradient-to-b from-white to-gray-200 animate-fade-in" />
  </>
  
  );
}

export default Navbar;
