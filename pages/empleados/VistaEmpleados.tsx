import { useEffect, useState } from "react";
import { toast } from "react-toastify";

/* =======================================
   TIPOS
======================================= */
interface Empleado {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
  eficiencia?: number;
}

/* =======================================
   COLORES PARA OCUPACIÓN
======================================= */
const getOcupacionColor = (valor: number) => {
  if (valor <= 20) return "bg-green-500";
  if (valor <= 60) return "bg-orange-500";
  return "bg-red-500";
};

/* =======================================
   ESPECIALIDADES
======================================= */
const ESPECIALIDADES = [
  "Peluquería",
  "Uñas",
  "Masajes",
  "Depilación"
];

/* =======================================
   COMPONENTE PRINCIPAL
======================================= */
const VistaEmpleados = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Campos del formulario del modal
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [especialidad, setEspecialidad] = useState("");

  /* =======================================
     CARGAR EMPLEADOS
  ======================================= */
  const fetchEmpleados = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/empleados");

      if (!res.ok) {
        toast.error("No se pudieron cargar los empleados.", { autoClose: 3000 });
        return;
      }

      const data = await res.json();
      setEmpleados(data);

      if (data.length === 0) {
        toast.info("No hay empleados registrados.", { autoClose: 3000 });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de red al cargar empleados.", { autoClose: 3000 });
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  /* =======================================
     CREAR USUARIO (ADMIN)
  ======================================= */
  const handleCrearUsuario = async () => {
    if (!nombre || !email || !password || !role) {
      toast.error("Todos los campos obligatorios deben completarse.", { autoClose: 2500 });
      return;
    }

    const payload: any = { nombre, email, password, role };
    if (role === "EMPLEADO") payload.especialidad = especialidad;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3001/api/users/admin-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al crear el usuario.", { autoClose: 3000 });
        return;
      }

      toast.success("Usuario creado correctamente.", { autoClose: 2500 });

      // Reset form
      setNombre("");
      setEmail("");
      setPassword("");
      setRole("");
      setEspecialidad("");

      setModalOpen(false);
      fetchEmpleados(); // refrescar la lista

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error del servidor.", { autoClose: 3000 });
    }
  };

  return (
    <div className="p-4">

      {/* =================== HEADER =================== */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-400 text-transparent bg-clip-text">
          Lista de empleados
        </h2>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-md shadow hover:bg-primary/80 transition"
        >
          ➕ Crear Usuario
        </button>
      </div>

      {/* =================== GRID EMPLEADOS =================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {empleados.map((empleado) => {
          const ocupacion = empleado.eficiencia ?? 0;
          const colorBarra = getOcupacionColor(ocupacion);

          return (
            <div
              key={empleado.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
            >
              {/* Encabezado */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold">
                  {empleado.nombre
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{empleado.nombre}</p>
                  <p className="text-sm text-pink-500">{empleado.especialidad ?? "Sin especialidad"}</p>
                </div>
              </div>

              {/* Email */}
              <p className="text-sm text-gray-600 mb-1">{empleado.email}</p>
              <p className="text-xs text-green-600 mb-3">● Activo</p>

              {/* Tag de especialidad */}
              {empleado.especialidad && (
                <span className="inline-block px-3 py-1 text-xs font-medium text-pink-600 bg-pink-100 rounded-full mb-3">
                  {empleado.especialidad}
                </span>
              )}

              {/* Barra de Ocupación */}
              <p className="text-sm font-medium text-gray-700 mb-1">Ocupación</p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
                <div
                  className={`${colorBarra} h-2 transition-all`}
                  style={{ width: `${ocupacion}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{ocupacion.toFixed(0)}%</p>
            </div>
          );
        })}
      </div>

      {/* =================== MODAL =================== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">

            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Crear nuevo usuario
            </h3>

            {/* Nombre */}
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              className="w-full border px-3 py-2 mt-1 rounded"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            {/* Email */}
            <label className="text-sm font-medium text-gray-700 mt-3">Email</label>
            <input
              type="email"
              className="w-full border px-3 py-2 mt-1 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Password */}
            <label className="text-sm font-medium text-gray-700 mt-3">Contraseña</label>
            <input
              type="password"
              className="w-full border px-3 py-2 mt-1 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Rol */}
            <label className="text-sm font-medium text-gray-700 mt-3">Rol</label>
            <select
              className="w-full border px-3 py-2 mt-1 rounded"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== "EMPLEADO") setEspecialidad("");
              }}
            >
              <option value="">Seleccione un rol</option>
              <option value="ADMIN">Admin</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="TESORERO">Tesorero</option>
              <option value="CLIENTE">Cliente</option>
            </select>

            {/* Especialidad solo si es empleado */}
            {role === "EMPLEADO" && (
              <>
                <label className="text-sm font-medium text-gray-700 mt-3">Especialidad</label>
                <select
                  className="w-full border px-3 py-2 mt-1 rounded"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                >
                  <option value="">Seleccione especialidad</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* BOTONES */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>

              <button
                onClick={handleCrearUsuario}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
              >
                Crear Usuario
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default VistaEmpleados;
