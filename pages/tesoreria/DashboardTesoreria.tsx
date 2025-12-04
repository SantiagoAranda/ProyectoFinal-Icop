import React, { useState, useEffect } from "react";
import api from "../../src/lib/api";
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

import EgresosMensualesModal from "../../src/componentes/EgresosMensualesModal";
import HistorialVentasFisicasPanel from "../../src/componentes/HistorialVentasFisicasPanel";

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

interface DatosMensuales {
  mes: string;
  ingresos: number;
  egresos: number;
}

interface ResumenEgresoDetalle {
  subcategoria?: string | null;
  nota?: string | null;
  total: number;
}

interface ResumenEgresoCategoria {
  categoria: string;
  total: number;
  detalle?: ResumenEgresoDetalle[];
}

interface ResumenEgresos {
  totalPeriodo: number;
  porCategoria: ResumenEgresoCategoria[];
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
const DashboardTesoreria: React.FC = () => {
  const hoy = new Date();

  const [resumen, setResumen] = useState<ResumenTesoreria | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [clientesFrecuentes, setClientesFrecuentes] = useState<any[]>([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState<any[]>([]);
  const [egresosFijos, setEgresosFijos] = useState<any[]>([]);
  const [ingresosMensuales, setIngresosMensuales] = useState<DatosMensuales[]>([]);
  const [resumenEgresos, setResumenEgresos] = useState<ResumenEgresos | null>(null);

  const [mesSeleccionado, setMesSeleccionado] = useState<number>(hoy.getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(hoy.getFullYear());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEgresosModal, setShowEgresosModal] = useState(false);
  const [showHistorialPanel, setShowHistorialPanel] = useState(false);

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
      const paramsPeriodo = { params: { mes: mesSeleccionado, anio: anioSeleccionado } };

      const [
        resumenRes,
        detalleRes,
        clientesRes,
        productosRes,
        egresosRes,
        mensualesRes,
        resumenEgresosRes,
      ] = await Promise.all([
        api.get("/tesoreria/resumen"),
        api.get("/tesoreria/detalle"),
        api.get("/tesoreria/clientes"),
        api.get("/tesoreria/productos"),
        api.get("/egresos", paramsPeriodo),
        api.get("/tesoreria/ingresos-mensuales"),
        api.get("/egresos/resumen", paramsPeriodo),
      ]);

      setResumen(resumenRes.data);
      setDetalle(detalleRes.data ?? []);

      setClientesFrecuentes(
        Array.isArray(clientesRes.data)
          ? clientesRes.data
          : clientesRes.data?.clientes ?? []
      );

      setProductosMasVendidos(
        Array.isArray(productosRes.data)
          ? productosRes.data
          : productosRes.data?.items ?? []
      );

      setEgresosFijos(Array.isArray(egresosRes.data) ? egresosRes.data : []);
      setIngresosMensuales(Array.isArray(mensualesRes.data) ? mensualesRes.data : []);
      setResumenEgresos(resumenEgresosRes.data ?? null);
    } catch (err) {
      console.error("Error al obtener datos de tesorerÃ­a:", err);
      setError("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSeleccionado, anioSeleccionado]);

  /* ============================================================
     CALCULOS GENERALES
  ============================================================ */
  const ingresosPorDia = detalle?.ingresosPorDia ?? [];
  const ingresosPorEmpleado = detalle?.ingresosPorEmpleado ?? [];
  const ingresosPorEspecialidad = detalle?.ingresosPorEspecialidad ?? [];

  const ingresosEspecialidadFiltrados = ingresosPorEspecialidad.filter((e: any) => {
    if (!e?.nombre) return true;

    const nombre = e.nombre
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return !nombre.includes("venta fisica");
  });

  const resumenCategorias = resumenEgresos?.porCategoria ?? [];

  const etiquetaEgreso = (e: any) => {
    if (e?.categoria === "Servicios" && e?.subcategoria) return e.subcategoria;
    if (e?.categoria === "Otros" && e?.nota) return e.nota;
    return e?.categoria ?? "-";
  };

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
         Header + Botones
      ---------------------------------------- */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de TesorerÃ­a</h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-pink-400"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">AÃ±o</label>
            <input
              type="number"
              min={2020}
              max={3000}
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 w-24 focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* Boton de historial oculto */}
          {/* <button
            onClick={() => setShowHistorialPanel(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            Historial de Ventas Fisicas
          </button> */}

          <button
            onClick={() => setShowEgresosModal(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition"
          >
            Administrar Egresos Mensuales
          </button>
        </div>
      </div>

      {/* ---------------------------------------
         TARJETAS RESUMEN
      ---------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-green-100 border border-green-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-green-700 font-semibold">Ingresos Totales</h2>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatMoney(resumen.ingresosTotales)}
          </p>
        </div>

        <div className="p-6 bg-red-100 border border-red-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-red-700 font-semibold">Egresos Totales</h2>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {formatMoney(resumen.egresosTotales)}
          </p>
        </div>

        <div className="p-6 bg-pink-100 border border-pink-200 rounded-xl text-center shadow-sm">
          <h2 className="text-lg text-pink-700 font-semibold">Ganancia Neta</h2>
          <p className="text-2xl font-bold text-pink-600 mt-2">
            {formatMoney(resumen.gananciaNeta)}
          </p>
        </div>
      </div>

      {/* ---------------------------------------
         GRAFICO INGRESOS VS EGRESOS
      ---------------------------------------- */}
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
      ---------------------------------------- */}
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
      ---------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Ingresos por especialidad
        </h2>

        {ingresosEspecialidadFiltrados.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ingresosEspecialidadFiltrados}
                dataKey="total"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => entry.nombre}
              >
                {ingresosEspecialidadFiltrados.map((_: any, i: number) => (
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
      ---------------------------------------- */}
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
         PRODUCTOS MÃS VENDIDOS
      ---------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Productos mÃ¡s vendidos</h2>

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
         TENDENCIA MENSUAL REAL
      ---------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100 mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Tendencia mensual de ganancia neta
        </h2>

        {ingresosMensuales.length === 0 ? (
          <p className="text-center text-gray-500">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ingresosMensuales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v: any) => formatMoney(v)} />

              <Line type="monotone" dataKey="ingresos" stroke="#ec4899" strokeWidth={2} />
              <Line type="monotone" dataKey="egresos" stroke="#f87171" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---------------------------------------
         RESUMEN EGRESOS
      ---------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Resumen de egresos fijos (mes {mesSeleccionado}/{anioSeleccionado})
          </h2>
          <span className="text-sm text-gray-500">
            Total egresos: {formatMoney(resumenEgresos?.totalPeriodo ?? 0)}
          </span>
        </div>

        {resumenCategorias.length === 0 ? (
          <p className="text-center text-gray-500">Sin egresos registrados en el perÃ­odo</p>
        ) : (
          <>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resumenCategorias}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ categoria }) => categoria}
                  >
                    {resumenCategorias.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {resumenCategorias.map((cat) => (
                <div
                  key={cat.categoria}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{cat.categoria}</h3>
                    <span className="text-sm text-gray-700 font-semibold">
                      {formatMoney(cat.total)}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {(cat.detalle ?? [{ total: cat.total } as ResumenEgresoDetalle]).map(
                      (det, idx) => (
                        <li
                          key={`${cat.categoria}-${det.subcategoria ?? det.nota ?? idx}`}
                          className="flex items-center justify-between text-sm text-gray-700"
                        >
                          <span>{det.subcategoria ?? det.nota ?? cat.categoria}</span>
                          <span className="font-semibold">{formatMoney(det.total)}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------
         EGRESOS FIJOS DEL PERÃODO
      ---------------------------------------- */}
      <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Egresos fijos del perÃ­odo
        </h2>

        {egresosFijos.length === 0 ? (
          <p className="text-center text-gray-500">Sin egresos registrados</p>
        ) : (
          <>
            <table className="w-full border-collapse mb-8">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-left">
                  <th className="p-2">CategorÃ­a</th>
                  <th className="p-2">Detalle</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-right">Ãšltima modificaciÃ³n</th>
                </tr>
              </thead>
              <tbody>
                {egresosFijos.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{e.categoria}</td>
                    <td className="p-2">{etiquetaEgreso(e)}</td>
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
                    data={egresosFijos}
                    dataKey="monto"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ categoria, subcategoria }) =>
                      categoria === "Servicios" && subcategoria
                        ? `${categoria} - ${subcategoria}`
                        : categoria
                    }
                  >
                    {egresosFijos.map((_: any, i: number) => (
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
         MODALES
      ---------------------------------------- */}

      {showEgresosModal && (
        <EgresosMensualesModal
          onClose={() => {
            setShowEgresosModal(false);
            fetchData();
          }}
        />
      )}

      {/* Modal de historial oculto */}
      {/* {showHistorialPanel && (
        <HistorialVentasFisicasPanel
          onClose={() => setShowHistorialPanel(false)}
        />
      )} */}
    </div>
  );
};

export default DashboardTesoreria;

