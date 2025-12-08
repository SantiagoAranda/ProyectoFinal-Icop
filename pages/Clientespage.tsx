import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

interface ClienteResumen {
  id: number;
  nombre: string;
  email: string;
  fechaAlta: string | null;
  turnosCompletados: number;
  totalGastado: number;
}

interface TurnoClienteDetalle {
  id: number;
  fecha: string;
  estado: string;
  servicioNombre: string | null;
  empleadoNombre: string | null;
  totalPagado: number;
}

const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detalleTurnos, setDetalleTurnos] = useState<TurnoClienteDetalle[]>([]);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteResumen | null>(null);

  const formatMoney = (n: number) =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /* ============================================================
   *  FETCH CLIENTES (con token)
   * ============================================================ */
  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("No hay token de autenticación. Volvé a iniciar sesión.");
        setClientes([]);
        return;
      }

      const res = await api.get<ClienteResumen[]>("/clientes/resumen", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setClientes(res.data || []);
    } catch (err) {
      console.error("Error cargando clientes:", err);
      setError("Error al obtener el resumen de clientes");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
   *  ABRIR MODAL DETALLE (con token)
   * ============================================================ */
  const abrirDetalleCliente = async (cliente: ClienteResumen) => {
    setClienteSeleccionado(cliente);
    setDetalleTurnos([]);
    setDetalleError(null);
    setDetalleLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setDetalleError(
          "No hay token de autenticación. Volvé a iniciar sesión."
        );
        setDetalleTurnos([]);
        return;
      }

      const res = await api.get<TurnoClienteDetalle[]>(
        `/clientes/${cliente.id}/detalle`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDetalleTurnos(res.data || []);
    } catch (err) {
      console.error("Error obteniendo detalle de cliente:", err);
      setDetalleError("Error al obtener el historial de turnos del cliente");
    } finally {
      setDetalleLoading(false);
    }
  };

  const cerrarModalDetalle = () => {
    setClienteSeleccionado(null);
    setDetalleTurnos([]);
    setDetalleError(null);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const stats = useMemo(() => {
    const totalClientes = clientes.length;
    const totalTurnos = clientes.reduce(
      (acc, c) => acc + c.turnosCompletados,
      0
    );
    const totalGastado = clientes.reduce(
      (acc, c) => acc + (c.totalGastado || 0),
      0
    );
    return { totalClientes, totalTurnos, totalGastado };
  }, [clientes]);

  // === ESTADOS BASE ===
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-center text-gray-600">Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-center text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Usuarios</p>
          <h1 className="text-3xl font-bold text-pink-600">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Listado de clientes con turnos completados y su actividad económica.
          </p>
        </div>
      </div>

      {/* STATS RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-pink-100 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-pink-500 font-semibold">
            Clientes
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {stats.totalClientes}
          </p>
        </div>

        <div className="bg-white border border-pink-100 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-pink-500 font-semibold">
            Turnos completados
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {stats.totalTurnos}
          </p>
        </div>

        <div className="bg-white border border-pink-100 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-pink-500 font-semibold">
            Total gastado
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatMoney(stats.totalGastado)}
          </p>
        </div>
      </div>

      {/* LISTA / TABLA */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {clientes.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Aún no hay clientes con turnos completados.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Fecha de alta</th>
                <th className="px-4 py-3 text-center">Turnos completados</th>
                <th className="px-4 py-3 text-right">Total gastado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((cli) => (
                <tr
                  key={cli.id}
                  className="hover:bg-pink-50/60 transition-colors"
                >
                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {cli.nombre}
                      </span>
                      <span className="text-xs text-gray-500">
                        {cli.email || "Sin email"}
                      </span>
                    </div>
                  </td>

                  {/* Fecha alta */}
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(cli.fechaAlta)}
                  </td>

                  {/* Turnos completados */}
                  <td className="px-4 py-3 text-center text-gray-700">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-semibold">
                      {cli.turnosCompletados}
                    </span>
                  </td>

                  {/* Total gastado */}
                  <td className="px-4 py-3 text-right text-gray-800 font-semibold">
                    {formatMoney(cli.totalGastado || 0)}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-pink-600 text-xs font-semibold hover:underline hover:text-pink-700"
                      onClick={() => abrirDetalleCliente(cli)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DETALLE CLIENTE */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Historial de turnos
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Cliente:{" "}
                  <span className="font-medium text-gray-800">
                    {clienteSeleccionado.nombre}
                  </span>{" "}
                  ({clienteSeleccionado.email || "sin email"})
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalDetalle}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Cerrar ✕
              </button>
            </div>

            {detalleLoading ? (
              <p className="text-center text-gray-600 py-6">
                Cargando historial...
              </p>
            ) : detalleError ? (
              <p className="text-center text-red-600 py-6">{detalleError}</p>
            ) : detalleTurnos.length === 0 ? (
              <p className="text-center text-gray-500 py-6">
                Este cliente aún no tiene turnos completados registrados.
              </p>
            ) : (
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Servicio</th>
                      <th className="px-3 py-2">Empleado</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                      <th className="px-3 py-2 text-right">Total pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detalleTurnos.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {formatDate(t.fecha ?? null)}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {t.servicioNombre || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {t.empleadoNombre || "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              t.estado === "completado"
                                ? "bg-green-50 text-green-700"
                                : t.estado === "cancelado"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {t.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          {formatMoney(t.totalPagado || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPage;
