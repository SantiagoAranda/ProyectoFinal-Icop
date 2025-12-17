import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../src/lib/api";
import { FiEdit, FiTrash } from "react-icons/fi";
import { useUser } from "../../src/context/UserContext";

/* =======================================
   TIPOS
======================================= */
type RolUsuario = "ADMIN" | "EMPLEADO" | "TESORERO";

interface Empleado {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string | null;
  eficiencia?: number | null; // compatibilidad (ya no se usa para la barra)
  activo: boolean;
  role?: RolUsuario;
}

interface Turno {
  id: number;
  fechaHora: string;
  estado?: string | null;
  empleadoId?: number | null;
  servicio?: { duracion?: number | null } | null;
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

// Normaliza roles por si vienen en minúscula o con valores inesperados
const normRole = (r?: unknown): RolUsuario | undefined => {
  const x = String(r ?? "").toUpperCase();
  return x === "ADMIN" || x === "EMPLEADO" || x === "TESORERO"
    ? (x as RolUsuario)
    : undefined;
};

// Lo tratamos como EMPLEADO si su rol es EMPLEADO o si no viene rol
const esEmpleado = (emp: Empleado) => !emp.role || emp.role === "EMPLEADO";

/** Toast de confirmación reutilizable */
const confirmar = (mensaje: string, onConfirm: () => void) => {
  toast(
    ({ closeToast }) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm">{mensaje}</p>
        <div className="flex justify-end gap-3">
          <button
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
            onClick={() => closeToast?.()}
          >
            Cancelar
          </button>
          <button
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            onClick={() => {
              closeToast?.();
              onConfirm();
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    ),
    {
      autoClose: false,
      closeOnClick: false,
      draggable: false,
    }
  );
};

// Semana actual (lunes 00:00)
const startOfWeekMonday = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0 dom ... 6 sab
  const diff = (day === 0 ? -6 : 1) - day; // mover al lunes
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Duración robusta: asume que si es > 24 probablemente venga en minutos
const duracionEnHoras = (dur?: number | null) => {
  const v = Number(dur);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return v > 24 ? v / 60 : v;
};

const isEmailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v);

/* =======================================
   COMPONENTE PRINCIPAL
======================================= */
const VistaEmpleados = () => {
  const { user } = useUser(); // usuario logueado
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]); // para calcular ocupación semanal

  // MODAL CREAR
  const [modalOpen, setModalOpen] = useState(false);

  // MODAL EDITAR
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(
    null
  );

  // Formularios (crear/editar)
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // solo crear
  const [role, setRole] = useState<RolUsuario | "">("");
  const [especialidad, setEspecialidad] = useState("");

  // Errores formulario CREAR
  type CrearErrors = {
    nombre?: string;
    email?: string;
    password?: string;
    role?: string;
    especialidad?: string;
  };
  const [crearErrors, setCrearErrors] = useState<CrearErrors>({});

  // Errores formulario EDITAR
  type EditErrors = {
    nombre?: string;
    email?: string;
    especialidad?: string;
  };
  const [editErrors, setEditErrors] = useState<EditErrors>({});

  /* =======================================
     FETCH EMPLEADOS + TURNOS
  ======================================= */
  const fetchEmpleados = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [empleadosRes, turnosRes] = await Promise.all([
        api.get("/empleados", { headers }).catch(() => ({ data: [] })),
        api.get("/turnos", { headers }).catch(() => ({ data: [] })),
      ]);

      const empleadosData = Array.isArray(empleadosRes.data)
        ? empleadosRes.data
        : [];

      setEmpleados(
        empleadosData.map((e: any) => ({
          ...e,
          role: normRole(e?.role),
        }))
      );

      setTurnos(Array.isArray(turnosRes.data) ? turnosRes.data : []);
    } catch {
      toast.error("Error de red al cargar empleados.");
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  /* =======================================
     OCUPACIÓN SEMANAL (FRONT)
     - Semana actual (lun->dom)
     - Solo lun->vie
     - Solo turnos estado 'reservado'
     - Duración robusta (min->h si corresponde)
  ======================================= */
  const ocupacionPorEmpleado = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    // Capacidad semanal: 9-19 => 10h por día * 5 días = 50h
    const HORAS_SEMANA = 50;

    const horas: Record<number, number> = {};

    for (const t of turnos) {
      if (!t.empleadoId) continue;

      const estado = String(t.estado ?? "").toLowerCase().trim();
      if (estado !== "reservado") continue;

      const fh = new Date(t.fechaHora);
      if (Number.isNaN(fh.getTime())) continue;
      if (!(fh >= start && fh < end)) continue;

      const day = fh.getDay(); // 0 dom ... 6 sab
      if (day < 1 || day > 5) continue; // solo lun-vie

      const durHoras = duracionEnHoras(t.servicio?.duracion);
      horas[t.empleadoId] = (horas[t.empleadoId] ?? 0) + durHoras;
    }

    const porcentaje: Record<number, number> = {};
    for (const [idStr, h] of Object.entries(horas)) {
      const id = Number(idStr);
      porcentaje[id] = Math.min(100, (h / HORAS_SEMANA) * 100);
    }

    return porcentaje;
  }, [turnos]);

  /* =======================================
     VALIDACIONES CREAR
  ======================================= */
  const validarCampoCrear = (campo: keyof CrearErrors, valor: string) => {
    let msg = "";
    const v = (valor ?? "").trim();

    if (campo === "nombre") {
      if (!v) msg = "El nombre es obligatorio.";
      else if (/\d/.test(v)) msg = "El nombre no puede contener números.";
      else if (v.length < 6) msg = "El nombre debe tener al menos 6 caracteres.";
    }

    if (campo === "email") {
      if (!v) msg = "El email es obligatorio.";
      else if (!isEmailValido(v)) msg = "El email debe ser válido.";
    }

    if (campo === "password") {
      if (!v) msg = "La contraseña es obligatoria.";
      else if (v.length < 6) msg = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (campo === "role") {
      if (!v) msg = "Selecciona un rol.";
    }

    if (campo === "especialidad") {
      if (role === "EMPLEADO" && !v) msg = "Selecciona una especialidad.";
    }

    setCrearErrors((prev) => ({ ...prev, [campo]: msg }));
    return msg;
  };

  const validarFormularioCrear = () => {
    const nuevosErrores: CrearErrors = {};
    nuevosErrores.nombre = validarCampoCrear("nombre", nombre);
    nuevosErrores.email = validarCampoCrear("email", email);
    nuevosErrores.password = validarCampoCrear("password", password);
    nuevosErrores.role = validarCampoCrear("role", role || "");
    if (role === "EMPLEADO") {
      nuevosErrores.especialidad = validarCampoCrear("especialidad", especialidad);
    }

    const hayErrores = Object.values(nuevosErrores).some((m) => m && m.length > 0);
    setCrearErrors(nuevosErrores);
    return !hayErrores;
  };

  /* =======================================
     VALIDACIONES EDITAR
  ======================================= */
  const validarCampoEditar = (campo: keyof EditErrors, valor: string) => {
    let msg = "";
    const v = (valor ?? "").trim();

    if (campo === "nombre") {
      if (!v) msg = "El nombre es obligatorio.";
      else if (/\d/.test(v)) msg = "El nombre no puede contener números.";
      else if (v.length < 6) msg = "El nombre debe tener al menos 6 caracteres.";
    }

    if (campo === "email") {
      if (!v) msg = "El email es obligatorio.";
      else if (!isEmailValido(v)) msg = "El email debe ser válido.";
    }

    if (campo === "especialidad") {
      if (empleadoEditando && esEmpleado(empleadoEditando) && !v) {
        msg = "Selecciona una especialidad.";
      }
    }

    setEditErrors((prev) => ({ ...prev, [campo]: msg }));
    return msg;
  };

  const validarFormularioEditar = () => {
    const nuevosErrores: EditErrors = {};
    nuevosErrores.nombre = validarCampoEditar("nombre", nombre);
    nuevosErrores.email = validarCampoEditar("email", email);
    if (empleadoEditando && esEmpleado(empleadoEditando)) {
      nuevosErrores.especialidad = validarCampoEditar("especialidad", especialidad);
    }

    const hayErrores = Object.values(nuevosErrores).some((m) => m && m.length > 0);
    setEditErrors(nuevosErrores);
    return !hayErrores;
  };

  /* =======================================
     CREAR USUARIO
  ======================================= */
  const handleCrearUsuario = async () => {
    if (!validarFormularioCrear()) {
      toast.error("Corrige los errores del formulario.");
      return;
    }

    const payload: any = {
      nombre: nombre.trim(),
      email: email.trim(),
      password,
      role,
    };
    if (role === "EMPLEADO") payload.especialidad = especialidad.trim();

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
      setCrearErrors({});

      fetchEmpleados();
    } catch (error: any) {
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
    setEditErrors({});
    setModalEditarOpen(true);
  };

  /* =======================================
     GUARDAR EDICIÓN
  ======================================= */
  const handleEditarUsuario = async () => {
    if (!empleadoEditando) return;

    if (!validarFormularioEditar()) {
      toast.error("Corrige los errores del formulario.");
      return;
    }

    const payload: any = {
      nombre: nombre.trim(),
      email: email.trim(),
    };

    if (esEmpleado(empleadoEditando)) {
      payload.especialidad = especialidad.trim();
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
      setEditErrors({});
      fetchEmpleados();
    } catch {
      toast.error("Error de red.");
    }
  };

  /* =======================================
     BLOQUEAR / DESBLOQUEAR (OCULTO)
  ======================================= */
  const toggleActivo = async (id: number, activoActual: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      await api.patch(`/users/admin-toggle/${id}`, null, { headers });

      toast.success(activoActual ? "Usuario bloqueado" : "Usuario habilitado");
      fetchEmpleados();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Error de red al cambiar el estado.";
      toast.error(msg);
    }
  };

  /* =======================================
     ELIMINAR (con toastify)
  ======================================= */
  const eliminarUsuario = async (id: number) => {
    confirmar("¿Seguro que deseas eliminar este usuario?", async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        await api.delete(`/users/admin-delete/${id}`, { headers });

        toast.success("Usuario eliminado.");
        fetchEmpleados();
      } catch (error: any) {
        const msg =
          error?.response?.data?.message || "Error de red al eliminar el usuario.";
        toast.error(msg);
      }
    });
  };

  /* =======================================
     LISTAS POR ROL
  ======================================= */
  const empleadosSolo = empleados.filter(esEmpleado);
  const tesoreros = empleados.filter((e) => e.role === "TESORERO");
  const administradores = empleados.filter((e) => e.role === "ADMIN");

  /* =======================================
     RENDER CARD (reutilizable)
  ======================================= */
  const renderCard = (empleado: Empleado) => {
    const ocupacion = ocupacionPorEmpleado[empleado.id] ?? 0;
    const esUsuarioActual = !!user && user.id === empleado.id;

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

          {/* Botón eliminar oculto si es el usuario actual */}
          {!esUsuarioActual && (
            <button
              onClick={() => eliminarUsuario(empleado.id)}
              className="text-red-600 hover:text-red-800"
              title="Eliminar usuario"
            >
              <FiTrash size={20} />
            </button>
          )}
        </div>

        {/* ENCABEZADO */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold">
            {empleado.nombre
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{empleado.nombre}</p>

            {esEmpleado(empleado) ? (
              <p className="text-sm text-pink-500">
                {empleado.especialidad || "Sin especialidad"}
              </p>
            ) : (
              formatearRol(empleado.role) && (
                <p className="text-sm text-pink-500">{formatearRol(empleado.role)}</p>
              )
            )}
          </div>
        </div>

        {/* Email */}
        <p className="text-sm text-gray-600 mb-1">{empleado.email}</p>

        {/* Estado */}
        <p className={`text-xs mb-3 ${empleado.activo ? "text-green-600" : "text-red-600"}`}>
          ● {empleado.activo ? "Activo" : "Bloqueado"}
        </p>

        {/* Ocupación SOLO para EMPLEADO */}
        {esEmpleado(empleado) && (
          <>
            <p className="text-sm font-medium text-gray-700 mb-1">Ocupación</p>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
              <div
                className={`${getOcupacionColor(ocupacion)} h-2`}
                style={{ width: `${ocupacion}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{ocupacion.toFixed(0)}%</p>
          </>
        )}
      </div>
    );
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
          onClick={() => {
            setModalOpen(true);
            setNombre("");
            setEmail("");
            setPassword("");
            setRole("");
            setEspecialidad("");
            setCrearErrors({});
          }}
          className="px-4 py-2 bg-primary text-white rounded-md shadow hover:bg-primary/80 transition"
        >
          Crear Usuario
        </button>
      </div>

      {/* SECCIÓN EMPLEADOS */}
      {empleadosSolo.length > 0 && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Empleados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {empleadosSolo.map((emp) => renderCard(emp))}
          </div>
        </>
      )}

      {/* SECCIÓN TESOREROS */}
      {tesoreros.length > 0 && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Tesoreros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {tesoreros.map((emp) => renderCard(emp))}
          </div>
        </>
      )}

      {/* SECCIÓN ADMINISTRADORES */}
      {administradores.length > 0 && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Administradores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {administradores.map((emp) => renderCard(emp))}
          </div>
        </>
      )}

      {/* MODAL CREAR USUARIO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Crear nuevo usuario</h3>

            <label className="text-sm">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                const value = e.target.value;
                setNombre(value);
                validarCampoCrear("nombre", value);
              }}
              className={`w-full px-3 py-2 mt-1 rounded border ${
                crearErrors.nombre ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-pink-400`}
            />
            {crearErrors.nombre && <p className="text-xs text-red-600 mt-1">{crearErrors.nombre}</p>}

            <label className="text-sm mt-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                validarCampoCrear("email", value);
              }}
              className={`w-full px-3 py-2 mt-1 rounded border ${
                crearErrors.email ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-pink-400`}
            />
            {crearErrors.email && <p className="text-xs text-red-600 mt-1">{crearErrors.email}</p>}

            <label className="text-sm mt-3">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                validarCampoCrear("password", value);
              }}
              className={`w-full px-3 py-2 mt-1 rounded border ${
                crearErrors.password ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-pink-400`}
            />
            {crearErrors.password && <p className="text-xs text-red-600 mt-1">{crearErrors.password}</p>}

            <label className="text-sm mt-3">Rol</label>
            <select
              value={role}
              onChange={(e) => {
                const value = e.target.value as RolUsuario | "";
                setRole(value);
                validarCampoCrear("role", value || "");
                if (value !== "EMPLEADO") {
                  setEspecialidad("");
                  setCrearErrors((prev) => ({ ...prev, especialidad: "" }));
                }
              }}
              className={`w-full px-3 py-2 mt-1 rounded border ${
                crearErrors.role ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-pink-400`}
            >
              <option value="">Seleccione un rol</option>
              <option value="ADMIN">Admin</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="TESORERO">Tesorero</option>
            </select>
            {crearErrors.role && <p className="text-xs text-red-600 mt-1">{crearErrors.role}</p>}

            {role === "EMPLEADO" && (
              <>
                <label className="text-sm mt-3">Especialidad</label>
                <select
                  value={especialidad}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEspecialidad(value);
                    validarCampoCrear("especialidad", value);
                  }}
                  className={`w-full px-3 py-2 mt-1 rounded border ${
                    crearErrors.especialidad ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-pink-400`}
                >
                  <option value="">Seleccione especialidad</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
                {crearErrors.especialidad && (
                  <p className="text-xs text-red-600 mt-1">{crearErrors.especialidad}</p>
                )}
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
            <h3 className="text-xl font-bold mb-4 text-gray-800">Editar usuario</h3>

            <label className="text-sm">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                const value = e.target.value;
                setNombre(value);
                validarCampoEditar("nombre", value);
              }}
              className={`w-full px-3 py-2 mt-1 rounded border ${
                editErrors.nombre ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-pink-400`}
            />
            {editErrors.nombre && <p className="text-xs text-red-600 mt-1">{editErrors.nombre}</p>}

            <label className="text-sm mt-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                validarCampoEditar("email", value);
              }}
              className={`w-full px-3 py-2 mt-1 rounded border ${
                editErrors.email ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-pink-400`}
            />
            {editErrors.email && <p className="text-xs text-red-600 mt-1">{editErrors.email}</p>}

            {esEmpleado(empleadoEditando) && (
              <>
                <label className="text-sm mt-3">Especialidad</label>
                <select
                  value={especialidad}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEspecialidad(value);
                    validarCampoEditar("especialidad", value);
                  }}
                  className={`w-full px-3 py-2 mt-1 rounded border ${
                    editErrors.especialidad ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-pink-400`}
                >
                  <option value="">Sin especialidad</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
                {editErrors.especialidad && (
                  <p className="text-xs text-red-600 mt-1">{editErrors.especialidad}</p>
                )}
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
