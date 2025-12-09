import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../src/lib/api";
import {
  Calendar,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Clock,
  History,
  Repeat,
  MessageSquare,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useUser } from "../src/context/UserContext";
import { toast } from "react-toastify";

/* ============================
   Helper de confirmación (toast)
============================ */
const confirmar = (
  mensaje: string,
  onConfirm: () => void | Promise<void>
) => {
  toast(
    ({ closeToast }) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm">{mensaje}</p>
        <div className="flex justify-end gap-3 mt-1">
          <button
            className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
            onClick={() => closeToast()}
          >
            Cancelar
          </button>
          <button
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            onClick={async () => {
              await onConfirm();
              closeToast();
            }}
          >
            Confirmar
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

/* ============================
   Modal de Sugerencias
============================ */
const SugerenciasModal = ({
  onClose,
  role,
}: {
  onClose: () => void;
  role: "cliente" | "admin";
}) => {
  const [mensaje, setMensaje] = useState("");
  const [sugerencias, setSugerencias] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("sugerencias") || "[]");
    setSugerencias(data);
  }, []);

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }

    let nuevas = JSON.parse(localStorage.getItem("sugerencias") || "[]");

    const nueva = {
      id: Date.now(),
      remitente: "Cliente",
      mensaje,
      estado: "pendiente",
      fecha: new Date().toLocaleDateString("es-AR"),
    };

    nuevas.push(nueva);
    if (nuevas.length > 20) nuevas = nuevas.slice(-20);

    localStorage.setItem("sugerencias", JSON.stringify(nuevas));
    setSugerencias(nuevas);
    setMensaje("");

    toast.success("Sugerencia enviada correctamente");
  };

  const esLeida = (estado: string) =>
    String(estado || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0301]/g, "") === "leida";

  const marcarLeida = (id: number) => {
    const actualizadas = sugerencias.map((s) =>
      s.id === id ? { ...s, estado: "leida" } : s
    );
    setSugerencias(actualizadas);
    localStorage.setItem("sugerencias", JSON.stringify(actualizadas));
  };

  const borrarLeidas = () => {
    const hayLeidas = sugerencias.some((s) => esLeida(s.estado));
    if (!hayLeidas) {
      toast.info("No hay sugerencias leídas para borrar.");
      return;
    }

    // ✅ Confirmación con toastify (sin window.confirm)
    confirmar(
      "¿Seguro que deseas borrar las sugerencias leídas?",
      () => {
        const restantes = sugerencias.filter((s) => !esLeida(s.estado));
        setSugerencias(restantes);
        localStorage.setItem("sugerencias", JSON.stringify(restantes));
        toast.success("Sugerencias leídas eliminadas");
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40las flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        {role === "cliente" ? (
          <>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Enviar sugerencia
            </h2>
            <form onSubmit={handleEnviar} className="flex flex-col gap-4">
              <textarea
                className="border rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-pink-400"
                placeholder="Escribí tu sugerencia..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
              />
              <button
                type="submit"
                className="bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 transition"
              >
                Enviar
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Sugerencias de clientes
              </h2>
              {sugerencias.some((s) => esLeida(s.estado)) && (
                <button
                  onClick={borrarLeidas}
                  className="text-sm px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                >
                  Borrar leídas
                </button>
              )}
            </div>

            {sugerencias.length === 0 ? (
              <p className="text-gray-500 text-center">No hay sugerencias</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Mensaje</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugerencias.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.mensaje}</td>
                        <td className="p-2">{s.fecha}</td>
                        <td className="p-2 text-center">
                          {esLeida(s.estado) ? (
                            <span className="text-green-600 font-semibold">
                              Leída
                            </span>
                          ) : (
                            <button
                              onClick={() => marcarLeida(s.id)}
                              className="bg-yellow-400 text-white px-3 py-1 rounded-md hover:bg-yellow-500"
                            >
                              Marcar leída
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ============================
   Widget
============================ */
const Widget = ({ icon: Icon, title, value, sub, color, to }: any) => {
  const colorClasses: Record<string, string> = {
    pink: "text-pink-500",
    green: "text-green-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
  };

  return (
    <Link
      to={to}
      className="p-5 bg-white rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer flex flex-col gap-2 border border-gray-100 hover:-translate-y-1"
    >
      <div className={`${colorClasses[color] || "text-gray-500"} text-3xl`}>
        <Icon />
      </div>
      <h3 className="text-gray-700 font-semibold">{title}</h3>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </Link>
  );
};

export default function Home() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [showSugerencias, setShowSugerencias] = useState(false);

  /* ============================
     Estados principales
  ============================ */
  const [turnos, setTurnos] = useState<any[]>([]);
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [proximoTurno, setProximoTurno] = useState<string | null>(null);
  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [eficienciaPromedio, setEficienciaPromedio] = useState(0);
  const [serviciosActivos, setServiciosActivos] = useState(0);
  const [productosBajoStock, setProductosBajoStock] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [turnosDia, setTurnosDia] = useState<any[]>([]);
  const [ultimoTurno, setUltimoTurno] = useState<any | null>(null);
  const [graficoData, setGraficoData] = useState<
    { dia: string; ingresos: number }[]
  >([]);

  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /* ============================
     Cargar datos del dashboard
  ============================ */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const turnosRes = await api.get("/turnos", { headers });
        const allTurnos = Array.isArray(turnosRes.data) ? turnosRes.data : [];
        setTurnos(allTurnos);

        const hoy = new Date().toISOString().split("T")[0];
        const turnosHoyArr = allTurnos.filter((t) =>
          t.fechaHora.startsWith(hoy)
        );
        setTurnosHoy(turnosHoyArr.length);
        setTurnosDia(turnosHoyArr.slice(0, 3));

        const proximos = turnosHoyArr.sort(
          (a, b) =>
            new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
        );
        setProximoTurno(
          proximos[0]
            ? new Date(proximos[0].fechaHora).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null
        );

        if (user?.role === "admin") {
          const empleadosRes = await api.get("/empleados", { headers });
          const empleados = Array.isArray(empleadosRes.data)
            ? empleadosRes.data
            : [];
          setEmpleadosActivos(empleados.length);
          const eficiencias = empleados.map((e) => e.eficiencia ?? 0);
          const prom =
            eficiencias.reduce((a, b) => a + b, 0) /
            (eficiencias.length || 1);
          setEficienciaPromedio(Math.round(prom));

          const serviciosRes = await api.get("/servicios", { headers });
          const servicios = Array.isArray(serviciosRes.data)
            ? serviciosRes.data
            : [];
          setServiciosActivos(servicios.length);

          const productosRes = await api.get("/productos", { headers });
          const productos = Array.isArray(productosRes.data)
            ? productosRes.data
            : [];
          const bajos = productos.filter((p) => p.stock <= 5).length;
          setProductosBajoStock(bajos);

          const balanceRes = await api.get("/tesoreria/balance", { headers });
          setBalance(balanceRes.data.balanceSemanal || 0);

          const ingresosRes = await api.get("/tesoreria/ingresos-semanales", {
            headers,
          });
          setGraficoData(ingresosRes.data || []);

          const alertasTemp: string[] = [];
          if (bajos > 0)
            alertasTemp.push(`${bajos} productos con stock bajo`);
          if (turnosHoyArr.length === 0)
            alertasTemp.push("No hay turnos programados hoy");
          if (prom < 30)
            alertasTemp.push("Ocupación de empleados baja esta semana");
          setAlertas(alertasTemp);
        }

        if (user?.role === "cliente") {
          const misTurnos = allTurnos.filter((t) => t.clienteId === user.id);
          if (misTurnos.length > 0) {
            const ordenados = [...misTurnos].sort(
              (a, b) =>
                new Date(b.fechaHora).getTime() -
                new Date(a.fechaHora).getTime()
            );
            setUltimoTurno(ordenados[0]);
          }
        }
      } catch (err) {
        console.error("Error cargando datos para el dashboard:", err);
      }
    };

    fetchData();
  }, [user]);

  /* ============================
        Cancelar turno – cliente
  ============================ */
  const handleCancelarTurno = (turnoId: number) => {
    confirmar("¿Estás seguro de cancelar este turno?", async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await api.patch(`/turnos/${turnoId}/cancelar`, null, {
          headers,
        });

        if (res.status === 200) {
          toast.success("Turno cancelado correctamente");

          setTurnos((prev) =>
            prev.map((t) =>
              t.id === turnoId ? { ...t, estado: "cancelado" } : t
            )
          );
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.message || "Error al cancelar el turno";
        toast.error(msg);
      }
    });
  };

  /* ============================
     Repetir último turno – cliente
  ============================ */
  const handleRepetirUltimoTurno = () => {
    if (!ultimoTurno) {
      toast.error("No se encontró un turno anterior para repetir.");
      return;
    }

    try {
      const datosParaRepetir = {
        servicioId: ultimoTurno.servicioId,
        empleadoId: ultimoTurno.empleadoId,
        fechaHora: ultimoTurno.fechaHora,
      };

      localStorage.setItem("ultimoTurno", JSON.stringify(datosParaRepetir));
      localStorage.setItem("ultimoTurnoData", JSON.stringify(datosParaRepetir));

      navigate("/turnos/nuevo");
    } catch (error) {
      console.error("Error guardando último turno en localStorage:", error);
      toast.error("No se pudo preparar la repetición del turno.");
    }
  };

  /* ============================
     Nuevo turno – cliente
  ============================ */
  const handleNuevoTurno = () => {
    localStorage.removeItem("ultimoTurno");
    localStorage.removeItem("ultimoTurnoData");
    navigate("/turnos/nuevo");
  };

  /* ============================
     Cálculos derivados cliente
  ============================ */
  const ahora = new Date();
  const turnosCliente = turnos.filter((t) => t.clienteId === user?.id);

  const turnosFuturos = turnosCliente
    .filter((t) => {
      const fechaTurno = new Date(t.fechaHora);
      const estado = (t.estado ?? "").toLowerCase();
      return (
        fechaTurno > ahora &&
        estado !== "cancelado" &&
        estado !== "completado"
      );
    })
    .sort(
      (a, b) =>
        new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
    );

  const turnosPasados = turnosCliente
    .filter((t) => {
      const fechaTurno = new Date(t.fechaHora);
      const estado = (t.estado ?? "").toLowerCase();
      return (
        fechaTurno <= ahora ||
        estado === "completado" ||
        estado === "cancelado"
      );
    })
    .sort(
      (a, b) =>
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-pink-50 to-white flex flex-col items-center">
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
          <h1 className="text-4xl font-bold mb-1 text-center">
            {saludo}, {user.nombre}
          </h1>
          <p className="text-gray-500 text-sm mb-8 text-center capitalize">
            {fecha}
          </p>

          {/* Botón sugerencias */}
          <div className="mb-6">
            <button
              onClick={() => setShowSugerencias(true)}
              className="flex items-center gap-2 px-5 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              <MessageSquare className="w-5 h-5" />
              {user.role === "admin" ? "Ver sugerencias" : "Enviar sugerencia"}
            </button>
          </div>

          {showSugerencias && (
            <SugerenciasModal
              onClose={() => setShowSugerencias(false)}
              role={user.role === "admin" ? "admin" : "cliente"}
            />
          )}

          {/* ============================
              ADMIN
          ============================ */}
          {user.role === "admin" && (
            <>
              <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Widget
                  icon={Calendar}
                  title="Turnos de hoy"
                  value={turnosHoy}
                  sub={
                    proximoTurno
                      ? `Próximo: ${proximoTurno}`
                      : "Sin próximos"
                  }
                  color="pink"
                  to="/turnos"
                />
                <Widget
                  icon={TrendingUp}
                  title="Tesorería"
                  value={
                    balance ? `$${balance.toLocaleString("es-AR")}` : "—"
                  }
                  sub="Balance semanal"
                  color="green"
                  to="/tesoreria"
                />
                <Widget
                  icon={Users}
                  title="Empleados activos"
                  value={empleadosActivos}
                  sub={`Ocupación promedio: ${eficienciaPromedio}%`}
                  color="blue"
                  to="/empleados"
                />
                <Widget
                  icon={Package}
                  title="Servicios y Productos"
                  value={`${serviciosActivos} / ${productosBajoStock}`}
                  sub="Productos con stock bajo"
                  color="violet"
                  to="/servicios"
                />
              </div>

              {alertas.length > 0 && (
                <div className="bg-white border-l-4 border-yellow-400 p-4 rounded-md shadow-sm w-full max-w-6xl mb-10">
                  <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <AlertTriangle size={20} />
                    <h3 className="font-semibold">Novedades del día</h3>
                  </div>
                  <ul className="text-sm text-gray-700 list-disc ml-6 space-y-1">
                    {alertas.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-6xl mb-10">
                <h2 className="text-lg font-semibold mb-4">
                  Ingresos semanales
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={graficoData}>
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#ec4899"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-6xl">
                <h2 className="text-lg font-semibold mb-4">
                  Próximos turnos del día
                </h2>
                {turnosDia.length > 0 ? (
                  <ul className="space-y-2 text-gray-700 text-sm">
                    {turnosDia.map((t) => (
                      <li
                        key={t.id}
                        className="flex justify-between border-b pb-1"
                      >
                        <span>
                          {new Date(t.fechaHora).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          —{" "}
                          <strong>
                            {t.cliente?.nombre ?? "Cliente"}
                          </strong>
                        </span>
                        <span>{t.servicio?.nombre ?? "Servicio"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No hay turnos próximos hoy.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ============================
              CLIENTE
          ============================ */}
          {user.role === "cliente" && (
            <div className="w-full max-w-5xl">
              {/* Acciones del cliente */}
              <div className="flex flex-wrap gap-4 mb-10">
                <button
                  onClick={handleNuevoTurno}
                  className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                >
                  <Calendar className="w-5 h-5" /> Reservar nuevo turno
                </button>

                {ultimoTurno && (
                  <button
                    onClick={handleRepetirUltimoTurno}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    <Repeat className="w-5 h-5" /> Repetir último turno
                  </button>
                )}
              </div>

              {/* Próximos turnos */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-10 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-pink-500" /> Próximos turnos
                </h2>

                {turnosFuturos.length > 0 ? (
                  <ul className="space-y-3 text-gray-700">
                    {turnosFuturos.map((t) => (
                      <li
                        key={t.id}
                        className="flex justify-between items-center border-b pb-2 text-sm"
                      >
                        <div>
                          <p>
                            {new Date(t.fechaHora).toLocaleDateString("es-AR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}{" "}
                            {new Date(t.fechaHora).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            — <strong>{t.servicio?.nombre}</strong>
                          </p>
                          <p className="text-gray-500">
                            {t.empleado?.nombre || "Empleado sin asignar"}
                          </p>
                        </div>

                        <button
                          onClick={() => handleCancelarTurno(t.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                        >
                          Cancelar
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No tienes turnos próximos agendados.
                  </p>
                )}
              </div>

              {/* Historial */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-pink-500" /> Historial de
                  turnos
                </h2>

                {turnosPasados.length > 0 ? (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {turnosPasados.slice(0, 10).map((t) => (
                      <li
                        key={t.id}
                        className="py-3 flex justify-between items-center"
                      >
                        <div>
                          <p>
                            {new Date(t.fechaHora).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            — {t.servicio?.nombre}
                          </p>
                          <p className="text-gray-500">
                            {t.empleado?.nombre || "Empleado desconocido"}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs rounded-full ${
                            t.estado === "completado"
                              ? "bg-green-100 text-green-700"
                              : t.estado === "cancelado"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {t.estado}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    Aún no tienes historial.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
