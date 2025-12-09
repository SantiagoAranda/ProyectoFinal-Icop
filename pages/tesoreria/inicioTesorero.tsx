import React, { useState, useEffect } from "react";
import { useUser } from "../../src/context/UserContext";
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
import { MessageSquare } from "lucide-react";
import { toast } from "react-toastify";

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

/* ==============================
   Modal de sugerencias (tesorero)
============================== */
const SugerenciasModalTesorero: React.FC<{ onClose: () => void }> = ({
    onClose,
}) => {
    const [mensaje, setMensaje] = useState("");

    const handleEnviar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mensaje.trim()) {
            toast.error("El mensaje no puede estar vacío");
            return;
        }

        let nuevas = JSON.parse(localStorage.getItem("sugerencias") || "[]");

        const nueva = {
            id: Date.now(),
            remitente: "Tesorero",
            mensaje,
            estado: "pendiente",
            fecha: new Date().toLocaleDateString("es-AR"),
        };

        nuevas.push(nueva);
        if (nuevas.length > 20) nuevas = nuevas.slice(-20);

        localStorage.setItem("sugerencias", JSON.stringify(nuevas));
        setMensaje("");

        toast.success("Sugerencia enviada correctamente");
        onClose();
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
            </div>
        </div>
    );
};

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
const InicioTesorero: React.FC = () => {
    const { user } = useUser();
    const hoy = new Date();

    const [resumen, setResumen] = useState<ResumenTesoreria | null>(null);
    const [detalle, setDetalle] = useState<any | null>(null);
    const [clientesFrecuentes, setClientesFrecuentes] = useState<any[]>([]);
    const [productosMasVendidos, setProductosMasVendidos] = useState<any[]>([]);
    const [egresosFijos, setEgresosFijos] = useState<any[]>([]);
    const [ingresosMensuales, setIngresosMensuales] = useState<DatosMensuales[]>(
        []
    );
    const [resumenEgresos, setResumenEgresos] = useState<ResumenEgresos | null>(
        null
    );

    const [mesSeleccionado, setMesSeleccionado] = useState<number>(
        hoy.getMonth() + 1
    );
    const [anioSeleccionado, setAnioSeleccionado] = useState<number>(
        hoy.getFullYear()
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showEgresosModal, setShowEgresosModal] = useState(false);
    const [showHistorialPanel, setShowHistorialPanel] = useState(false);
    const [showSugerencias, setShowSugerencias] = useState(false);

    const COLORS = [
        "#ec4899",
        "#f87171",
        "#4ade80",
        "#60a5fa",
        "#facc15",
        "#c084fc",
    ];

    const formatMoney = (n: number) =>
        n.toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        });

    // 🔒 Solo tesoreros
    if (!user || user.role !== "tesorero") {
        return (
            <div className="text-center p-10 text-gray-700">
                <h1 className="text-2xl font-semibold">Acceso restringido</h1>
                <p className="text-gray-600 mt-2">
                    Esta sección es solo para tesoreros.
                </p>
            </div>
        );
    }

    /* ============================================================
       FETCH GENERAL
    ============================================================ */
    const fetchData = async () => {
        try {
            const paramsPeriodo = {
                params: { mes: mesSeleccionado, anio: anioSeleccionado },
            };

            const [
                resumenRes,
                detalleRes,
                clientesRes,
                productosRes,
                egresosRes,
                mensualesRes,
                resumenEgresosRes,
            ] = await Promise.all([
                api.get("/tesoreria/resumen", paramsPeriodo),
                api.get("/tesoreria/detalle", paramsPeriodo),
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
            setIngresosMensuales(
                Array.isArray(mensualesRes.data) ? mensualesRes.data : []
            );
            setResumenEgresos(resumenEgresosRes.data ?? null);
        } catch (err) {
            console.error("Error al obtener datos de tesorería:", err);
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
       CÁLCULOS GENERALES
    ============================================================ */
    const ingresosPorDia = detalle?.ingresosPorDia ?? [];
    const ingresosPorEmpleado = detalle?.ingresosPorEmpleado ?? [];
    const ingresosPorEspecialidad = detalle?.ingresosPorEspecialidad ?? [];

    const resumenCategorias =
        (resumenEgresos?.porCategoria ?? []) as ResumenEgresoCategoria[];

    const etiquetaEgreso = (e: any) => {
        if (e?.categoria === "Servicios" && e?.subcategoria) return e.subcategoria;
        if (e?.categoria === "Otros" && e?.nota) return e.nota;
        return e?.categoria ?? "-";
    };

    // Datos mensuales con ganancia neta
    const datosMensualesConNeta = ingresosMensuales.map((m) => ({
        ...m,
        gananciaNeta: m.ingresos - m.egresos,
    }));

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

    /* ============================================================
       ESTADOS DE UI
    ============================================================ */
    if (loading)
        return <p className="text-center text-gray-600 p-10">Cargando datos...</p>;
    if (error) return <p className="text-center text-red-600 p-10">{error}</p>;
    if (!resumen)
        return <p className="text-center text-gray-500 p-10">No hay datos</p>;

    /* ============================================================
       RENDER
    ============================================================ */
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
                <SugerenciasModalTesorero onClose={() => setShowSugerencias(false)} />
            )}

            {/* Dashboard de Tesorería */}
            <div className="max-w-7xl w-full">
                {/* Header */}
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Dashboard de Tesorería
                </h2>

                {/* Resumen Global Histórico */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="text-2xl">📊</span> Resumen Histórico Total
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Ingresos Totales Históricos */}
                        <div className="bg-white rounded-xl border-2 border-green-200 p-6 shadow-md hover:shadow-lg transition">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-600">Ingresos Totales</h4>
                            </div>
                            <p className="text-3xl font-bold text-green-600">
                                {formatMoney(ingresosMensuales.reduce((sum: number, item: any) => sum + (item.ingresos || 0), 0))}
                            </p>
                        </div>

                        {/* Egresos Totales Históricos */}
                        <div className="bg-white rounded-xl border-2 border-red-200 p-6 shadow-md hover:shadow-lg transition">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-600">Egresos Totales</h4>
                            </div>
                            <p className="text-3xl font-bold text-red-600">
                                {formatMoney(ingresosMensuales.reduce((sum: number, item: any) => sum + (item.egresos || 0), 0))}
                            </p>
                        </div>

                        {/* Ganancia Neta Histórica */}
                        <div className={`bg-white rounded-xl border-2 p-6 shadow-md hover:shadow-lg transition ${(ingresosMensuales.reduce((sum: number, item: any) => sum + (item.ingresos || 0), 0) -
                            ingresosMensuales.reduce((sum: number, item: any) => sum + (item.egresos || 0), 0)) >= 0
                            ? "border-blue-200"
                            : "border-red-200"
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-600">Ganancia Neta</h4>
                            </div>
                            <p className={`text-3xl font-bold ${(ingresosMensuales.reduce((sum: number, item: any) => sum + (item.ingresos || 0), 0) -
                                ingresosMensuales.reduce((sum: number, item: any) => sum + (item.egresos || 0), 0)) >= 0
                                ? "text-blue-600"
                                : "text-red-600"
                                }`}>
                                {formatMoney(
                                    ingresosMensuales.reduce((sum: number, item: any) => sum + (item.ingresos || 0), 0) -
                                    ingresosMensuales.reduce((sum: number, item: any) => sum + (item.egresos || 0), 0)
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header + Botones (filtros mensuales) */}
                <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Dashboard de Tesorería
                    </h2>

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
                                        {new Date(0, i).toLocaleString("es-AR", {
                                            month: "long",
                                        })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Año</label>
                            <input
                                type="number"
                                min={2020}
                                max={3000}
                                value={anioSeleccionado}
                                onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                                className="border border-gray-300 rounded-lg p-2 w-24 focus:ring-2 focus:ring-pink-400"
                            />
                        </div>

                        <button
                            onClick={() => setShowHistorialPanel(true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                        >
                            Ver historial de ventas físicas
                        </button>

                        <button
                            onClick={() => setShowEgresosModal(true)}
                            className="px-4 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition"
                        >
                            Administrar Egresos Mensuales
                        </button>
                    </div>
                </div>

                {/* TARJETAS RESUMEN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="p-6 bg-green-100 border border-green-200 rounded-xl text-center shadow-sm">
                        <h2 className="text-lg text-green-700 font-semibold">
                            Ingresos Totales (mes)
                        </h2>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                            {formatMoney(resumen.ingresosTotales)}
                        </p>
                    </div>

                    <div className="p-6 bg-red-100 border border-red-200 rounded-xl text-center shadow-sm">
                        <h2 className="text-lg text-red-700 font-semibold">
                            Egresos Totales (mes)
                        </h2>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                            {formatMoney(resumen.egresosTotales)}
                        </p>
                    </div>

                    <div className="p-6 bg-pink-100 border border-pink-200 rounded-xl text-center shadow-sm">
                        <h2 className="text-lg text-pink-700 font-semibold">
                            Ganancia Neta (mes)
                        </h2>
                        <p className="text-2xl font-bold text-pink-600 mt-2">
                            {formatMoney(resumen.gananciaNeta)}
                        </p>
                    </div>
                </div>

                {/* INGRESOS, EGRESOS (OTROS) Y GANANCIA NETA (DIARIO) */}
                <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Ingresos, Egresos (Otros) y Ganancia Neta (por día)
                    </h2>

                    {ingresosPorDia.length === 0 ? (
                        <p className="text-center text-gray-500">Sin datos disponibles</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={ingresosPorDia.map((dia: any) => ({
                                    ...dia,
                                    gananciaNeta: dia.ingresos - dia.egresos,
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="dia" />
                                <YAxis />
                                <Tooltip formatter={(v: any) => formatMoney(v)} />
                                <Legend />
                                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                                <Bar dataKey="egresos" fill="#ef4444" name="Egresos (Otros)" />
                                <Bar
                                    dataKey="gananciaNeta"
                                    fill="#ec4899"
                                    name="Ganancia Neta"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* INGRESOS POR EMPLEADO */}
                <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Ingresos por empleado
                    </h2>

                    {ingresosPorEmpleado.length === 0 ? (
                        <p className="text-center text-gray-500">Sin datos disponibles</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={ingresosPorEmpleado.map((emp: any) => ({
                                    ...emp,
                                    nombreCompleto: `${emp.nombre} (${emp.especialidad || "Sin especialidad"
                                        })`,
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="nombreCompleto"
                                    angle={-15}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis />
                                <Tooltip
                                    formatter={(v: any) => formatMoney(v)}
                                    labelFormatter={(label: string) => label}
                                />
                                <Bar dataKey="total" fill="#60a5fa" name="Ingresos" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* INGRESOS POR ESPECIALIDAD */}
                <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Ingresos por especialidad
                    </h2>

                    {ingresosPorEspecialidad.length === 0 ? (
                        <p className="text-center text-gray-500">Sin datos disponibles</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ingresosPorEspecialidad}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="nombre" />
                                <YAxis />
                                <Tooltip formatter={(v: any) => formatMoney(v)} />
                                <Legend />
                                <Bar dataKey="total" fill="#ec4899" name="Ingresos" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* CLIENTES FRECUENTES */}
                <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Clientes frecuentes
                    </h2>

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

                {/* PRODUCTOS MÁS VENDIDOS */}
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

                {/* TENDENCIA MENSUAL DE GANANCIA NETA */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100 mb-10">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Tendencia mensual de ganancia neta
                    </h2>

                    {datosMensualesConNeta.length === 0 ? (
                        <p className="text-center text-gray-500">Sin datos</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={datosMensualesConNeta}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mes" />
                                <YAxis />
                                <Tooltip formatter={(v: any) => formatMoney(v)} />
                                <Line
                                    type="monotone"
                                    dataKey="gananciaNeta"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    name="Ganancia neta"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* GRÁFICO DE EGRESOS POR CATEGORÍA */}
                <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Gráfico de egresos por categoría
                        </h2>
                        <span className="text-sm text-gray-500">
                            Total egresos: {formatMoney(resumenEgresos?.totalPeriodo ?? 0)}
                        </span>
                    </div>

                    {resumenCategorias.length === 0 ? (
                        <p className="text-center text-gray-500">
                            Sin egresos registrados en el período
                        </p>
                    ) : (
                        <div className="w-full h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={resumenCategorias as any}
                                        dataKey="total"
                                        nameKey="categoria"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={110}
                                        label={(entry: any) => entry.categoria}
                                    >
                                        {resumenCategorias.map((_, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => formatMoney(v)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* EGRESOS DETALLADOS DEL PERÍODO */}
                <div className="bg-white p-6 rounded-xl shadow mb-10 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Egresos detallados
                    </h2>

                    {egresosFijos.length === 0 ? (
                        <p className="text-center text-gray-500">Sin egresos registrados</p>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 text-left">
                                    <th className="p-2">Categoría</th>
                                    <th className="p-2">Detalle</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-right">Última modificación</th>
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
                                                ? new Date(e.updatedAt).toLocaleString("es-AR", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODALES */}
                {showEgresosModal && (
                    <EgresosMensualesModal
                        onClose={() => {
                            setShowEgresosModal(false);
                            fetchData();
                        }}
                    />
                )}

                {showHistorialPanel && (
                    <HistorialVentasFisicasPanel
                        onClose={() => setShowHistorialPanel(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default InicioTesorero;
