import React, { useEffect, useState } from "react";
import { useUser } from "../../src/context/UserContext";
import api from "../../src/lib/api";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-toastify";
import { MessageSquare } from "lucide-react";

// === Tipado ===
interface Turno {
  id: number;
  fechaHora: string;
  estado: string;
  servicio?: { nombre: string; precio: number; duracion?: number | null };
  cliente?: { nombre?: string | null };
  empleadoId?: number | null;
}

/* ==============================
   Modal de sugerencias (empleado)
============================== */
const SugerenciasModalEmpleado: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      setError("Debes escribir algo antes de enviar");
      return;
    }

    let nuevas = JSON.parse(localStorage.getItem("sugerencias") || "[]");

    const nueva = {
      id: Date.now(),
      remitente: "Empleado",
      mensaje,
      estado: "pendiente",
      fecha: new Date().toLocaleDateString("es-AR"),
    };

    nuevas.push(nueva);
    if (nuevas.length > 20) nuevas = nuevas.slice(-20);

    localStorage.setItem("sugerencias", JSON.stringify(nuevas));
    setMensaje("");
    setError("");

    toast.success("Sugerencia enviada correctamente");

    // ✅ Cerrar automáticamente después de 1 segundo
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
          Enviar sugerencia
        </h2>
        <form onSubmit={handleEnviar} className="flex flex-col gap-4">
          <textarea
            className={`border rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-pink-400 ${error ? "border-red-500" : ""
              }`}
            placeholder="Escribí tu sugerencia..."
            value={mensaje}
            onChange={(e) => {
              setMensaje(e.target.value);
              if (error) setError("");
            }}
          />
          {error && (
            <p className="text-red-600 text-sm -mt-2">{error}</p>
          )}
          <button
            type="submit"
            className="bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 transition"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

const InicioEmpleado: React.FC = () => {
  const { user } = useUser();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showSugerencias, setShowSugerencias] = useState(false);

  // 🔒 Solo empleados
  if (!user || user.role !== "empleado") {
    return (
      <div className="text-center p-10 text-gray-700">
        <h1 className="text-2xl font-semibold">Acceso restringido</h1>
        <p className="text-gray-600 mt-2">
          Esta sección es solo para empleados.
        </p>
      </div>
    );
  }

  /* ============================
     Cargar turnos del empleado
  ============================ */
  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const res = await api.get("/turnos", { headers });
      const allTurnos = (res.data || []) as Turno[];

      const turnosEmpleado = allTurnos.filter((t) => t.empleadoId === user.id);
      setTurnos(turnosEmpleado);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los turnos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ahora = new Date();

  /* ============================
     Estadísticas
  ============================ */
  const completados = turnos.filter((t) => t.estado === "completado").length;
  const cancelados = turnos.filter((t) => t.estado === "cancelado").length;
  const futuros = turnos.filter(
    (t) =>
      new Date(t.fechaHora) >= ahora &&
      t.estado !== "cancelado" &&
      t.estado !== "completado"
  ).length;

  const resumen = [
    {
      label: "Turnos futuros",
      valor: futuros,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Completados",
      valor: completados,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Cancelados",
      valor: cancelados,
      color: "bg-red-100 text-red-700",
    },
  ];

  // Solo futuros para la tabla
  const turnosFuturos = turnos.filter(
    (t) => new Date(t.fechaHora) >= ahora
  );
  const turnosOrdenados = [...turnosFuturos].sort(
    (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
  );

  // Días del mes con turnos (cualquier estado)
  const diasConTurnos = turnos.map((t) => new Date(t.fechaHora));

  /* ============================
     Confirmación con toastify
  ============================ */
  const askConfirm = (message: string, onConfirm: () => void) => {
    toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold">{message}</span>
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={closeToast}
              className="px-3 py-1 bg-gray-300 text-gray-800 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                closeToast();
                onConfirm();
              }}
              className="px-3 py-1 bg-pink-500 text-white rounded-lg text-xs hover:bg-pink-600"
            >
              Confirmar
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false }
    );
  };

  const handleChangeEstado = (
    id: number,
    nuevoEstado: "completado" | "cancelado"
  ) => {
    const texto =
      nuevoEstado === "completado"
        ? "¿Marcar este turno como COMPLETADO?"
        : "¿Cancelar este turno?";

    askConfirm(texto, async () => {
      try {
        setUpdatingId(id);

        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        await api.patch(
          `/turnos/${id}/estado`,
          { estado: nuevoEstado },
          { headers }
        );

        toast.success("Estado del turno actualizado.");

        setTurnos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t))
        );
      } catch (err: any) {
        console.error("Error actualizando estado del turno:", err);
        const msg =
          err?.response?.data?.message ||
          "Error al actualizar el estado del turno.";
        toast.error(msg);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  /* ============================
     Saludo + fecha
  ============================ */
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-pink-50 to-white flex flex-col items-center">
      {/* Header con saludo y sugerencias */}
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold mb-1 text-center">
          {saludo}, {user.nombre}
        </h1>
        <p className="text-gray-500 text-sm mb-6 text-center capitalize">
          {fecha}
        </p>

        <button
          onClick={() => setShowSugerencias(true)}
          className="flex items-center gap-2 px-5 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
        >
          <MessageSquare className="w-5 h-5" />
          Enviar sugerencia
        </button>
      </div>

      {showSugerencias && (
        <SugerenciasModalEmpleado onClose={() => setShowSugerencias(false)} />
      )}

      <div className="w-full max-w-6xl">
        {loading ? (
          <p className="text-gray-700">Cargando turnos...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {resumen.map((card) => (
                <div
                  key={card.label}
                  className={`p-5 rounded-lg shadow border border-gray-200 flex flex-col justify-center items-center ${card.color}`}
                >
                  <div className="text-lg font-semibold">{card.label}</div>
                  <div className="text-2xl font-bold mt-2">{card.valor}</div>
                </div>
              ))}
            </div>

            {/* Grid: Calendario + tabla */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Mini calendario */}
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    ←
                  </button>
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: es })}
                  </h3>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    →
                  </button>
                </div>

                {/* Días semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map((dia, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-semibold text-gray-600"
                    >
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const inicio = startOfMonth(currentMonth);
                    const fin = endOfMonth(currentMonth);
                    const dias = eachDayOfInterval({ start: inicio, end: fin });

                    const primerDiaSemana = getDay(inicio); // 0=Dom, 1=Lun...
                    const diasEnBlanco =
                      primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

                    return (
                      <>
                        {Array.from({ length: diasEnBlanco }).map((_, i) => (
                          <div key={`blank-${i}`} />
                        ))}
                        {dias.map((dia) => {
                          const tieneTurno = diasConTurnos.some((d) =>
                            isSameDay(d, dia)
                          );
                          const esHoy = isSameDay(dia, new Date());
                          const esDelMesActual = isSameMonth(
                            dia,
                            currentMonth
                          );

                          return (
                            <div
                              key={dia.toISOString()}
                              className={`
                                aspect-square flex items-center justify-center text-sm rounded-full
                                ${esDelMesActual
                                  ? "text-gray-800"
                                  : "text-gray-300"
                                }
                                ${esHoy
                                  ? "bg-blue-500 text-white font-bold"
                                  : ""
                                }
                                ${tieneTurno && !esHoy
                                  ? "bg-green-100 text-green-800 font-semibold"
                                  : ""
                                }
                              `}
                            >
                              {format(dia, "d")}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                {/* Leyenda */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Hoy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-100 border border-green-300"></div>
                    <span className="text-gray-600">Días con turnos</span>
                  </div>
                </div>
              </div>

              {/* Tabla de turnos */}
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Tus próximos turnos
                </h2>

                {turnosOrdenados.length === 0 ? (
                  <p className="text-gray-500 text-center py-10">
                    No tienes turnos programados
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Día
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Horario
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Cliente
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">
                            Servicio
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">
                            Estado
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {turnosOrdenados.map((turno, index) => {
                          const fechaTurno = new Date(turno.fechaHora);
                          const dia = format(
                            fechaTurno,
                            "EEEE, d 'de' MMMM",
                            { locale: es }
                          );
                          const horario = format(fechaTurno, "HH:mm", {
                            locale: es,
                          });

                          let estadoColor =
                            "bg-yellow-100 text-yellow-800"; // reservado
                          if (turno.estado === "completado")
                            estadoColor = "bg-green-100 text-green-800";
                          if (turno.estado === "cancelado")
                            estadoColor = "bg-red-100 text-red-800";

                          const esReservado = turno.estado === "reservado";

                          return (
                            <tr
                              key={turno.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                            >
                              <td className="py-3 px-4 text-gray-800 capitalize">
                                {dia}
                              </td>
                              <td className="py-3 px-4 text-gray-800 font-semibold">
                                {horario}
                              </td>
                              <td className="py-3 px-4 text-gray-800">
                                {turno.cliente?.nombre || "Sin asignar"}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {turno.servicio?.nombre || "Servicio"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${estadoColor}`}
                                >
                                  {turno.estado}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {esReservado ? (
                                  <div className="inline-flex gap-2">
                                    <button
                                      disabled={updatingId === turno.id}
                                      onClick={() =>
                                        handleChangeEstado(
                                          turno.id,
                                          "completado"
                                        )
                                      }
                                      className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                                    >
                                      Completar
                                    </button>
                                    <button
                                      disabled={updatingId === turno.id}
                                      onClick={() =>
                                        handleChangeEstado(
                                          turno.id,
                                          "cancelado"
                                        )
                                      }
                                      className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InicioEmpleado;