import React, { useEffect, useState } from "react";
import api from "../../src/lib/api";

interface ClienteResumen {
  id: number;
  nombre: string;
  email: string;
  fechaAlta: string;
  turnosCompletados: number;
  totalGastado: number;
}

const DashboardClientes: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get<ClienteResumen[]>("/clientes/resumen");
      setClientes(res.data || []);
    } catch (err) {
      console.error("Error cargando clientes:", err);
      setError("No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <p className="text-center text-gray-600">Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <p className="text-center text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Administración</p>
          <h1 className="text-3xl font-bold text-primary">Gestión de clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Listado de clientes registrados y su actividad en turnos.
          </p>
        </div>
      </div>

      {/* Lista / tabla */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {clientes.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay clientes registrados.
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
                  className="hover:bg-gray-50 transition-colors"
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
                    {cli.turnosCompletados}
                  </td>

                  {/* Total gastado */}
                  <td className="px-4 py-3 text-right text-gray-800 font-semibold">
                    {formatMoney(cli.totalGastado || 0)}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-primary text-xs font-semibold hover:underline"
                      // A futuro: abrir modal con historial de turnos del cliente
                      onClick={() => {
                        // Por ahora solo un console.log para que no rompa nada
                        console.log("Ver detalle cliente", cli.id);
                      }}
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
    </div>
  );
};

export default DashboardClientes;
