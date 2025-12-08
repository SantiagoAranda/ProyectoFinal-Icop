import React, { useEffect, useState } from "react";
import { useUser } from "../../src/context/UserContext";
import api from "@/lib/api";
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

// === Tipado ===
interface Turno {
  id: number;
  fechaHora: string;
  estado: string;
  servicio?: { nombre: string; precio: number; duracion?: number | null };
  cliente?: { nombre?: string | null };
  empleadoId?: number | null;
}

const InicioEmpleado: React.FC = () => {
  const { user } = useUser();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔒 Solo empleados (en tu frontend los roles son en minúsculas)
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

  // === Cargar turnos del empleado ===
  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      const res = await api.get("/turnos", { headers });
      const allTurnos = (res.data || []) as Turno[];

      const ahora = new Date();

      const turnosEmpleado = allTurnos.filter(
        (t) =>
          t.empleadoId === user.id &&
          new Date(t.fechaHora) >= ahora
      );

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

  // === Estadísticas resumidas ===
  const completados = turnos.filter((t) => t.estado === "completado").length;
  const cancelados = turnos.filter((t) => t.estado === "cancelado").length;
  const futuros = turnos.filter((t) => t.estado === "reservado").length;

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

  // === Datos ordenados para la tabla ===
  const turnosOrdenados = [...turnos].sort(
    (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
  );

  // === Mini calendario ===
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Días del mes actual con turnos
  const diasConTurnos = turnos.map((t) => new Date(t.fechaHora));

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">
        Bienvenido, {user.nombre}
      </h1>

      {loading ? (
        <p className="text-gray-700">Cargando turnos...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {/* === Tarjetas de resumen === */}
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

          {/* === Grid: Mini Calendario + Tabla de turnos === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mini Calendario */}
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

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["L", "M", "M", "J", "V", "S", "D"].map((dia, i) => (
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

                  // Días en blanco al inicio (ajustando para que la semana empiece en lunes)
                  const primerDiaSemana = getDay(inicio); // 0=Dom, 1=Lun,...
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
                        const esDelMesActual = isSameMonth(dia, currentMonth);

                        return (
                          <div
                            key={dia.toISOString()}
                            className={`
                              aspect-square flex items-center justify-center text-sm rounded-full
                              ${
                                esDelMesActual
                                  ? "text-gray-800"
                                  : "text-gray-300"
                              }
                              ${
                                esHoy
                                  ? "bg-blue-500 text-white font-bold"
                                  : ""
                              }
                              ${
                                tieneTurno && !esHoy
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
                      </tr>
                    </thead>
                    <tbody>
                      {turnosOrdenados.map((turno, index) => {
                        const fecha = new Date(turno.fechaHora);
                        const dia = format(
                          fecha,
                          "EEEE, d 'de' MMMM",
                          { locale: es }
                        );
                        const horario = format(fecha, "HH:mm", { locale: es });

                        let estadoColor =
                          "bg-yellow-100 text-yellow-800"; // reservado
                        if (turno.estado === "completado")
                          estadoColor = "bg-green-100 text-green-800";
                        if (turno.estado === "cancelado")
                          estadoColor = "bg-red-100 text-red-800";

                        return (
                          <tr
                            key={turno.id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
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
  );
};

export default InicioEmpleado;
