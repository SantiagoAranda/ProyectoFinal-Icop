import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/context/UserContext";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useUser();
  const [openUsuarios, setOpenUsuarios] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const baseLink =
    "text-primary hover:text-primary-dark relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full";

  const isActive = (path: string) =>
    location.pathname === path ? "font-semibold" : "";

  const closeMenus = () => {
    setOpenUsuarios(false);
    setOpenMobile(false);
  };

  const renderLinksByRole = () => {
    if (!user) return null;

    const role = user.role;

    // 🔹 Solo admin y cliente usan Inicio → "/"
    const commonInicio =
      ["admin", "cliente"].includes(role ?? "") ? (
        <Link
          to="/"
          className={`${baseLink} ${isActive("/")}`}
          onClick={closeMenus}
        >
          Inicio
        </Link>
      ) : null;

    if (role === "admin") {
      return (
        <>
          {commonInicio}

          <Link
            to="/turnos"
            className={`${baseLink} ${isActive("/turnos")}`}
            onClick={closeMenus}
          >
            Turnos
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenUsuarios((prev) => !prev)}
              className={`${baseLink} flex items-center gap-1`}
            >
              Usuarios <span className="text-[10px] mt-[1px]">▼</span>
            </button>

            <div
              className={`absolute right-0 mt-2 w-40 bg-white border border-primary/20 rounded-md shadow-lg py-1 z-50 ${
                openUsuarios ? "block" : "hidden"
              }`}
            >
              <Link
                to="/empleados"
                onClick={closeMenus}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-primary/5"
              >
                Empleados
              </Link>
              <Link
                to="/clientes"
                onClick={closeMenus}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-primary/5"
              >
                Clientes
              </Link>
            </div>
          </div>

          <Link
            to="/servicios"
            className={`${baseLink} ${isActive("/servicios")}`}
            onClick={closeMenus}
          >
            Productos y servicios
          </Link>

          <Link
            to="/proveedores"
            className={`${baseLink} ${isActive("/proveedores")}`}
            onClick={closeMenus}
          >
            Proveedores
          </Link>

          <Link
            to="/tesoreria"
            className={`${baseLink} ${isActive("/tesoreria")}`}
            onClick={closeMenus}
          >
            Tesoreria
          </Link>
        </>
      );
    }

    if (role === "tesorero") {
      // 🔹 Vista unificada → solo Inicio tesorero
      return (
        <>
          <Link
            to="/inicio-tesorero"
            className={`${baseLink} ${isActive("/inicio-tesorero")}`}
            onClick={closeMenus}
          >
            Inicio
          </Link>
        </>
      );
    }

    if (role === "cliente") {
      return (
        <>
          {commonInicio}
          <Link
            to="/servicios"
            className={`${baseLink} ${isActive("/servicios")}`}
            onClick={closeMenus}
          >
            Productos y servicios
          </Link>
        </>
      );
    }

    if (role === "empleado") {
      return (
        <Link
          to="/inicio-empleado"
          className={`${baseLink} ${isActive("/inicio-empleado")}`}
          onClick={closeMenus}
        >
          Inicio
        </Link>
      );
    }

    return null;
  };

  return (
    <nav className="bg-white border-b border-primary/30 shadow-[0_2px_8px_rgba(247,143,179,0.1)] font-sans">
      <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* IZQUIERDA: LOGO / TÍTULO */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            MS
          </div>
          <div className="text-primary font-semibold text-lg sm:text-xl">
            Mi Sistema
          </div>
        </div>

        {/* BOTÓN MOBILE */}
        <button
          className="sm:hidden text-primary focus:outline-none"
          onClick={() => setOpenMobile((prev) => !prev)}
        >
          {openMobile ? (
            <span className="text-xl">✕</span>
          ) : (
            <span className="text-2xl">☰</span>
          )}
        </button>

        {/* LINKS DESKTOP */}
        <div className="hidden sm:flex items-center gap-6">
          {renderLinksByRole()}

          {/* 🔥 Corrección: si NO hay user, no mostrar "Login" */}
          {user && (
            <button
              onClick={handleLogout}
              className="text-primary hover:text-primary-dark font-semibold transition"
            >
              Salir
            </button>
          )}
        </div>
      </div>

      {/* MENÚ MOBILE */}
      {openMobile && (
        <div className="sm:hidden px-4 pb-3 border-t border-primary/10 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col gap-3 pt-3">
            {renderLinksByRole()}

            {/* 🔥 Igual que en desktop: si no hay user, no mostramos Login */}
            {user && (
              <button
                onClick={handleLogout}
                className="text-primary hover:text-primary-dark font-semibold text-left"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
