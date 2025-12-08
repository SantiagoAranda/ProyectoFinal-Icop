import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { FiEdit, FiTrash, FiLock, FiUnlock } from "react-icons/fi";

/* =======================================
   TIPOS
======================================= */
type RolUsuario = "ADMIN" | "EMPLEADO" | "TESORERO";

interface Empleado {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string | null;
  eficiencia?: number | null;
  activo: boolean;
  // opcional para ser compatible si el backend aún no lo envía
  role?: RolUsuario;
}

/* =======================================
   HELPERS
======================================= */
const getOcupacionColor = (valor: number) => {
  if (valor <= 20) return "bg-green-500";
  if (valor <= 60) return "bg-orange-500";
  return "bg-red-500";
};

const ESPECIALIDADES = ["Peluquería", "Uñas", "Masajes", "Depilación"];

const formatearRol = (role?: RolUsuario) => {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "TESORERO":
      return "Tesorero";
    case "EMPLEADO":
      return "Empleado";
    default:
      return "";
  }
};

// Lo tratamos como EMPLEADO si su rol es EMPLEADO o si no viene rol
const esEmpleado = (emp: Empleado) =>
  !emp.role || emp.role === "EMPLEADO";

/* =======================================
   COMPONENTE PRINCIPAL
======================================= */
const VistaEmpleados = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  // MODAL CREAR
  const [modalOpen, setModalOpen] = useState(false);

  // MODAL EDITAR
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(
    null
  );

  // Formularios
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // solo crear
  const [role, setRole] = useState<RolUsuario | "">("");
  const [especialidad, setEspecialidad] = useState("");

  /* =======================================
     FETCH EMPLEADOS
  ======================================= */
  const fetchEmpleados = async () => {
    try {
      const res = await api.get("/empleados");
      console.log("👉 /empleados respondió:", res.data); // <--- agregar
      setEmpleados(res.data || []);
    } catch (error) {
      toast.error("Error de red al cargar empleados.");
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  /* =======================================
     CREAR USUARIO
  ======================================= */
  const handleCrearUsuario = async () => {
    if (!nombre || !email || !password || !role) {
      toast.error("Complete todos los campos obligatorios.");
      return;
    }

    const payload: any = { nombre, email, password, role };
    if (role === "EMPLEADO") payload.especialidad = especialidad;

    try {
      const token = localStorage.getItem("token");

      await api.post("/users/admin-create", payload, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      toast.success("Usuario creado correctamente.");

      setModalOpen(false);
      setNombre("");
      setEmail("");
      setPassword("");
      setRole("");
      setEspecialidad("");

      fetchEmpleados();
    } catch (error: any) {
      console.error("Error al crear usuario:", error?.response?.data || error);

      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Error del servidor al crear usuario.";

      toast.error(msg);
    }
  };

  /* =======================================
     ABRIR MODAL EDITAR
  ======================================= */
  const abrirModalEditar = (empleado: Empleado) => {
    setEmpleadoEditando(empleado);
    setNombre(empleado.nombre);
    setEmail(empleado.email);
    setRole(empleado.role ?? "EMPLEADO");
    setEspecialidad(empleado.especialidad ?? "");
    setModalEditarOpen(true);
  };

  /* =======================================
     GUARDAR EDICIÓN
  ======================================= */
  const handleEditarUsuario = async () => {
    if (!empleadoEditando) return;

    if (!nombre || !email) {
      toast.error("Complete los campos obligatorios.");
      return;
    }

    const payload: any = {
      nombre,
      email,
    };

    // Solo los EMPLEADO manejan especialidad
    if (esEmpleado(empleadoEditando)) {
      payload.especialidad = especialidad;
    }

    try {
      const token = localStorage.getItem("token");

      await api.put(`/users/admin-edit/${empleadoEditando.id}`, payload, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      toast.success("Usuario actualizado.");

      setModalEditarOpen(false);
      fetchEmpleados();
    } catch (error) {
      toast.error("Error de red.");
    }
  };

  /* =======================================
     BLOQUEAR / DESBLOQUEAR
  ======================================= */
  const toggleActivo = async (id: number, activoActual: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      await api.patch(`/users/admin-toggle/${id}`, null, { headers });

      toast.success(
        activoActual ? "Usuario bloqueado" : "Usuario habilitado"
      );

      fetchEmpleados();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Error de red al cambiar el estado.";
      toast.error(msg);
    }
  };

  /* =======================================
     ELIMINAR
  ======================================= */
  const eliminarUsuario = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      await api.delete(`/users/admin-delete/${id}`, { headers });

      toast.success("Usuario eliminado.");
      fetchEmpleados();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        "Error de red al eliminar el usuario.";
      toast.error(msg);
    }
  };

  /* =======================================
     RENDER
  ======================================= */
  return (
    <div className="p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-400 text-transparent bg-clip-text">
          Lista de empleados
        </h2>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-md shadow hover:bg-primary/80 transition"
        >
          Crear Usuario
        </button>
      </div>

      {/* GRID EMPLEADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {empleados.map((empleado) => {
          const ocupacion = empleado.eficiencia ?? 0;

          return (
            <div
              key={empleado.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
            >
              {/* ACCIONES */}
              <div className="flex justify-end gap-3 mb-2">
                <button
                  onClick={() => abrirModalEditar(empleado)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Editar usuario"
                >
                  <FiEdit size={20} />
                </button>

                <button
                  onClick={() => toggleActivo(empleado.id, empleado.activo)}
                  className={
                    empleado.activo
                      ? "text-yellow-600 hover:text-yellow-800"
                      : "text-green-600 hover:text-green-800"
                  }
                  title={empleado.activo ? "Bloquear" : "Desbloquear"}
                >
                  {empleado.activo ? (
                    <FiLock size={20} />
                  ) : (
                    <FiUnlock size={20} />
                  )}
                </button>

                <button
                  onClick={() => eliminarUsuario(empleado.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Eliminar usuario"
                >
                  <FiTrash size={20} />
                </button>
              </div>

              {/* ENCABEZADO */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold">
                  {empleado.nombre
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {empleado.nombre}
                  </p>

                  {esEmpleado(empleado) ? (
                    <p className="text-sm text-pink-500">
                      {empleado.especialidad || "Sin especialidad"}
                    </p>
                  ) : (
                    formatearRol(empleado.role) && (
                      <p className="text-sm text-pink-500">
                        {formatearRol(empleado.role)}
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* Email */}
              <p className="text-sm text-gray-600 mb-1">{empleado.email}</p>

              {/* Estado */}
              <p
                className={`text-xs mb-3 ${
                  empleado.activo ? "text-green-600" : "text-red-600"
                }`}
              >
                ● {empleado.activo ? "Activo" : "Bloqueado"}
              </p>

              {/* Ocupación SOLO para EMPLEADO */}
              {esEmpleado(empleado) && (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Ocupación
                  </p>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
                    <div
                      className={`${getOcupacionColor(ocupacion)} h-2`}
                      style={{ width: `${ocupacion}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {ocupacion.toFixed(0)}%
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR USUARIO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Crear nuevo usuario
            </h3>

            <label className="text-sm">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border px-3 py-2 mt-1 rounded"
            />

            <label className="text-sm mt-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 mt-1 rounded"
            />

            <label className="text-sm mt-3">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 mt-1 rounded"
            />

            <label className="text-sm mt-3">Rol</label>
            <select
              value={role}
              onChange={(e) => {
                const value = e.target.value;
                setRole(value as any);
                if (value !== "EMPLEADO") setEspecialidad("");
              }}
              className="w-full border px-3 py-2 mt-1 rounded"
            >
              <option value="">Seleccione un rol</option>
              <option value="ADMIN">Admin</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="TESORERO">Tesorero</option>
            </select>

            {role === "EMPLEADO" && (
              <>
                <label className="text-sm mt-3">Especialidad</label>
                <select
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="w-full border px-3 py-2 mt-1 rounded"
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

      {/* MODAL EDITAR USUARIO */}
      {modalEditarOpen && empleadoEditando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Editar usuario
            </h3>

            <label className="text-sm">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border px-3 py-2 mt-1 rounded"
            />

            <label className="text-sm mt-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 mt-1 rounded"
            />

            {esEmpleado(empleadoEditando) && (
              <>
                <label className="text-sm mt-3">Especialidad</label>
                <select
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="w-full border px-3 py-2 mt-1 rounded"
                >
                  <option value="">Sin especialidad</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalEditarOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>

              <button
                onClick={handleEditarUsuario}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaEmpleados;
