import { Link } from "react-router-dom";
import { useUser } from "@/context/UserContext";

function Home() {
  const { user } = useUser();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      {!user ? (
        <>
          <h1 className="text-4xl font-bold mb-4 text-center">
            Bienvenido al Sistema de Gestión
          </h1>
          <p className="text-lg text-gray-600 text-center mb-6">
            Administra empleados, turnos y servicios fácilmente.
          </p>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Registrarse
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold mb-4 text-center">
            Hola, {user.nombre} 
          </h1>
          <p className="text-lg text-gray-600 text-center mb-6">
            {user.role === "cliente"
              ? "Reserva un turno y disfruta de nuestros servicios."
              : "Accede a la gestión de tu área."}
          </p>

          {user.role === "cliente" && (
            <Link
              to="/turnos/nuevo"
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              Reservar turno
            </Link>
          )}

          {user.role === "admin" && (
            <div className="flex gap-4">
              <Link
                to="/turnos"
                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
              >
                Gestionar Turnos
              </Link>
              <Link
                to="/empleados"
                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
              >
                Gestionar Empleados
              </Link>
            </div>
          )}

          {user.role === "tesorero" && (
            <Link
              to="/tesoreria"
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              Ver Tesorería
            </Link>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
