import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [openUsuarios, setOpenUsuarios] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const baseLink =
    "text-primary hover:text-primary-dark relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full";

  return (
    <nav className="bg-white border-b border-primary/30 shadow-[0_2px_8px_rgba(247,143,179,0.1)] font-sans">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* IZQUIERDA: LOGO O TÍTULO */}
        <div className="flex items-center gap-4">
          <div className="text-primary font-semibold text-xl">Mi Sistema</div>
        </div>

        {/* DERECHA: LINKS */}
        <div className="flex items-center gap-6">
          {/* ADMIN, TESORERO, CLIENTE: INICIO GENERAL */}
          {["admin", "tesorero", "cliente"].includes(user?.role ?? "") && (
            <Link to="/" className={baseLink}>
              Inicio
            </Link>
          )}

          {/* ADMIN */}
          {user?.role === "admin" && (
            <>
              <Link to="/turnos" className={baseLink}>
                Turnos
              </Link>

              {/* MENÚ USUARIOS (Empleados / Clientes) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenUsuarios((prev) => !prev)}
                  className={`${baseLink} flex items-center gap-1`}
                >
                  Usuarios
                  <span className="text-[10px] mt-[1px]">▼</span>
                </button>

                <div
                  className={`absolute right-0 mt-2 w-40 bg-white border border-primary/20 rounded-md shadow-lg py-1 z-50 ${
                    openUsuarios ? "block" : "hidden"
                  }`}
                >
                  <Link
                    to="/empleados"
                    onClick={() => setOpenUsuarios(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-primary/5"
                  >
                    Empleados
                  </Link>
                  <Link
                    to="/clientes"
                    onClick={() => setOpenUsuarios(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-primary/5"
                  >
                    Clientes
                  </Link>
                </div>
              </div>

              <Link to="/servicios" className={baseLink}>
                Servicios
              </Link>
              <Link to="/proveedores" className={baseLink}>
                Proveedores
              </Link>
              <Link to="/tesoreria" className={baseLink}>
                Tesoreria
              </Link>
            </>
          )}

          {/* TESORERO */}
          {user?.role === "tesorero" && (
            <Link to="/tesoreria" className={baseLink}>
              Tesoreria
            </Link>
          )}

          {/* CLIENTE */}
          {user?.role === "cliente" && (
            <>
              <Link to="/servicios" className={baseLink}>
                Productos y servicios
              </Link>
              <Link to="/turnos/nuevo" className={baseLink}>
                Reservar turno
              </Link>
            </>
          )}

          {/* EMPLEADO */}
          {user?.role === "empleado" && (
            <>
              <Link to="/inicio-empleado" className={baseLink}>
                Inicio
              </Link>
              <Link to="/turnos-empleado" className={baseLink}>
                Mis turnos
              </Link>
            </>
          )}

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
