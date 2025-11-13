import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import EgresosMensualesModal from "@/componentes/EgresosMensualesModal";

/* ============================================================
   TIPOS
============================================================ */
interface ResumenTesoreria {
  ingresosTotales: number;
  egresosTotales: number;
  gananciaNeta: number;
  completados: number;
  cancelaciones: number;
  totalTurnos: number;
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
const DashboardTesoreria: React.FC = () => {
  /* ------------------------------
     Estados
  ------------------------------ */
  const [resumen, setResumen] = useState<ResumenTesoreria | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [clientesFrecuentes, setClientesFrecuentes] = useState<any[]>([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState<any[]>([]);
  const [egresosVariables, setEgresosVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEgresosModal, setShowEgresosModal] = useState(false);

  /* ------------------------------
     Constantes
  ------------------------------ */
  const COLORS = ["#ec4899", "#f87171", "#4ade80", "#60a5fa", "#facc15", "#c084fc"];

  const formatMoney = (n: number) =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  /* ============================================================
     FETCH GENERAL
  ============================================================ */
  const fetchData = async () => {
    try {
      const [resumenRes, detalleRes, clientesRes, productosRes, egresosRes] =
        await Promise.all([
          axios.get("http://localhost:3001/api/tesoreria/resumen"),
          axios.get("http://localhost:3001/api/tesoreria/detalle"),
          axios.get("http://localhost:3001/api/tesoreria/clientes"),
          axios.get("http://localhost:3001/api/tesoreria/productos"),
          axios.get("http://localhost:3001/api/egresos"),
        ]);

      setResumen(resumenRes.data);
      setDetalle(detalleRes.data ?? {});

      setClientesFrecuentes(
        Array.isArray(clientesRes.data) ? clientesRes.data : clientesRes.data?.clientes ?? []
      );

      setProductosMasVendidos(
        Array.isArray(productosRes.data) ? productosRes.data : productosRes.data?.items ?? []
      );

      setEgresosVariables(Array.isArray(egresosRes.data) ? egresosRes.data : []);
    } catch (error) {
      console.error("Error al obtener datos de tesorería:", error);
      setError("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ============================================================
     CALCULOS (cuando detalle no incluye estadisticas)
  ============================================================ */
  const [ingresosTotales, egresosTotales, gananciaNeta] = (() => {
    if (!detalle?.estadisticas) {
      const r = resumen;
      return [r?.ingresosTotales ?? 0, r?.egresosTotales ?? 0, r?.gananciaNeta ?? 0];
    }

    const ingresos = detalle.estadisticas.filter((e: any) => e.total > 0);
    const egresos = detalle.estadisticas.filter((e: any) => e.total < 0);

    const totalIngresos = ingresos.reduce((acc: number, e: any) => acc + e.total, 0);
    const totalEgresos = egresos.reduce((acc: number, e: any) => acc + Math.abs(e.total), 0);

    return [totalIngresos, totalEgresos, totalIngresos - totalEgresos];
  })();

  const ingresosPorDia = detalle?.ingresosPorDia ?? [];
  const ingresosPorEmpleado = detalle?.ingresosPorEmpleado ?? [];
  const ingresosPorEspecialidad = detalle?.ingresosPorEspecialidad ?? [];

  /* ============================================================
     ESTADOS DE UI
  ============================================================ */
  if (loading) return <p className="text-center text-gray-600">Cargando datos...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;
  if (!resumen) return <p className="text-center text-gray-500">No hay datos</p>;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="max-w-7xl mx-auto p-8">

      {/* ---------------------------------------
         Header + Botón modal
      --------------------------------------- */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de Tesorería</h1>

        <button
          onClick={() => setShowEgresosModal(true)}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition"
        >
          Administrar Egresos Mensuales
        </button>
      </div>

      {/* ---------------------------------------
         TARJETAS RESUMEN
      --------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-green-100 border border-green-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-green-700 font-semibold">Ingresos Totales</h2>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatMoney(ingresosTotales)}
          </p>
        </div>

        <div className="p-6 bg-red-100 border border-red-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-red-700 font-semibold">Egresos Totales</h2>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatMoney(egresosTotales)}</p>
        </div>

        <div className="p-6 bg-pink-100 border border-pink-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-pink-700 font-semibold">Ganancia Neta</h2>
          <p className="text-2xl font-bold text-pink-600 mt-2">{formatMoney(gananciaNeta)}</p>
        </div>
      </div>

      {/* ---------------------------------------
         INGRESOS vs EGRESOS
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos vs Egresos</h2>
        {ingresosPorDia.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ingresosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="ingresos" fill="#ec4899" />
              <Bar dataKey="egresos" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         INGRESOS POR EMPLEADO
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos por empleado</h2>
        {ingresosPorEmpleado.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ingresosPorEmpleado}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatMoney(v)} />
              <Bar dataKey="total" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         INGRESOS POR ESPECIALIDAD
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Ingresos por especialidad
        </h2>

        {ingresosPorEspecialidad.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ingresosPorEspecialidad}
                dataKey="total"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => entry.nombre}
              >
                {ingresosPorEspecialidad.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatMoney(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         CLIENTES FRECUENTES
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Clientes frecuentes</h2>

        {clientesFrecuentes.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientesFrecuentes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="turnos" fill="#facc15" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         PRODUCTOS MÁS VENDIDOS
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Productos más vendidos
        </h2>

        {productosMasVendidos.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productosMasVendidos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#c084fc" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         TENDENCIA GANANCIA NETA
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100 mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Tendencia de ganancia neta
        </h2>

        {ingresosPorDia.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ingresosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatMoney(v)} />
              <Line type="monotone" dataKey="ingresos" stroke="#ec4899" />
              <Line type="monotone" dataKey="egresos" stroke="#f87171" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         EGRESOS VARIABLES
      --------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Egresos variables mensuales
        </h2>

        {egresosVariables.length === 0 ? (
          <p className="text-center text-gray-500">Sin egresos registrados</p>
        ) : (
          <>
            <table className="w-full border-collapse mb-8">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-left">
                  <th className="p-2">Categoría</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-right">Última modificación</th>
                </tr>
              </thead>
              <tbody>
                {egresosVariables.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{e.categoria}</td>
                    <td className="p-2 text-right">{formatMoney(e.monto)}</td>
                    <td className="p-2 text-right">
                      {e.updatedAt
                        ? new Date(e.updatedAt).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={egresosVariables}
                    dataKey="monto"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ categoria }) => categoria}
                  >
                    {egresosVariables.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------
         MODAL
      --------------------------------------- */}
      {showEgresosModal && (
        <EgresosMensualesModal
          onClose={() => {
            setShowEgresosModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default DashboardTesoreria;
