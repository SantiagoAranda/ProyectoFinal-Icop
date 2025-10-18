import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Calendar, TrendingUp, Users, Package, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useUser } from "@/context/UserContext";

// === Componente Widget ===
const Widget = ({ icon: Icon, title, value, sub, color, to }: any) => (
  <Link
    to={to}
    className="p-5 bg-white rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer flex flex-col gap-2 border border-gray-100 hover:-translate-y-1"
  >
    <div className={`text-${color}-500 text-3xl`}>
      <Icon />
    </div>
    <h3 className="text-gray-700 font-semibold">{title}</h3>
    <p className="text-3xl font-bold text-gray-800">{value}</p>
    {sub && <p className="text-sm text-gray-500">{sub}</p>}
  </Link>
);

export default function Home() {
  const { user } = useUser();
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [proximoTurno, setProximoTurno] = useState<string | null>(null);
  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [eficienciaPromedio, setEficienciaPromedio] = useState(0);
  const [serviciosActivos, setServiciosActivos] = useState(0);
  const [productosBajoStock, setProductosBajoStock] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [turnosDia, setTurnosDia] = useState<any[]>([]);

  // Datos simulados para Recharts
  const [graficoData, setGraficoData] = useState([
    { dia: "Lun", ingresos: 12000 },
    { dia: "Mar", ingresos: 16500 },
    { dia: "Mié", ingresos: 9800 },
    { dia: "Jue", ingresos: 21000 },
    { dia: "Vie", ingresos: 17500 },
  ]);

  // Saludo dinámico
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  // Fecha formateada
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const turnosRes = await axios.get("http://localhost:3001/api/turnos", { headers });
        const turnos = Array.isArray(turnosRes.data) ? turnosRes.data : [];

        const hoy = new Date().toISOString().split("T")[0];
        const turnosHoyArr = turnos.filter((t) => t.fechaHora.startsWith(hoy));
        setTurnosHoy(turnosHoyArr.length);
        setTurnosDia(turnosHoyArr.slice(0, 3));

        const proximos = turnosHoyArr.sort(
          (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
        );
        setProximoTurno(
          proximos[0]
            ? new Date(proximos[0].fechaHora).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null
        );

        const empleadosRes = await axios.get("http://localhost:3001/api/empleados", { headers });
        const empleados = Array.isArray(empleadosRes.data) ? empleadosRes.data : [];
        setEmpleadosActivos(empleados.length);
        const eficiencias = empleados.map((e) => e.eficiencia ?? 0);
        const prom = eficiencias.reduce((a, b) => a + b, 0) / (eficiencias.length || 1);
        setEficienciaPromedio(Math.round(prom));

        const serviciosRes = await axios.get("http://localhost:3001/api/servicios", { headers });
        const servicios = Array.isArray(serviciosRes.data) ? serviciosRes.data : [];
        setServiciosActivos(servicios.length);

        const productosRes = await axios.get("http://localhost:3001/api/productos", { headers });
        const productos = Array.isArray(productosRes.data) ? productosRes.data : [];
        const bajos = productos.filter((p) => p.stock <= 5).length;
        setProductosBajoStock(bajos);

        // Simulación balance
        setBalance(152400);

        // Alertas
        const alertasTemp = [];
        if (bajos > 0) alertasTemp.push(`${bajos} productos con stock bajo`);
        if (turnosHoyArr.length === 0) alertasTemp.push("No hay turnos programados hoy");
        if (eficienciaPromedio < 30) alertasTemp.push("Eficiencia de empleados baja esta semana");
        setAlertas(alertasTemp);
      } catch (err) {
        console.error("Error cargando datos para el dashboard:", err);
      }
    };

    if (user?.role === "admin") fetchData();
  }, [user]);

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
          {/* Encabezado dinámico */}
          <h1 className="text-4xl font-bold mb-1 text-center">
            {saludo}, {user.nombre}
          </h1>
          <p className="text-gray-500 text-sm mb-8 text-center capitalize">{fecha}</p>

          {user.role === "admin" && (
            <>
              {/* Widgets */}
              <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Widget
                  icon={Calendar}
                  title="Turnos de hoy"
                  value={turnosHoy}
                  sub={proximoTurno ? `Próximo: ${proximoTurno}` : "Sin próximos"}
                  color="pink"
                  to="/turnos"
                />
                <Widget
                  icon={TrendingUp}
                  title="Tesorería"
                  value={balance ? `$${balance.toLocaleString("es-AR")}` : "—"}
                  sub="Balance semanal"
                  color="green"
                  to="/tesoreria"
                />
                <Widget
                  icon={Users}
                  title="Empleados activos"
                  value={empleadosActivos}
                  sub={`Eficiencia promedio: ${eficienciaPromedio}%`}
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

              {/* Alertas */}
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

              {/* Gráfico semanal */}
              <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-6xl mb-10">
                <h2 className="text-lg font-semibold mb-4">Ingresos semanales</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={graficoData}>
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="ingresos" stroke="#ec4899" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Próximos turnos */}
              <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-6xl">
                <h2 className="text-lg font-semibold mb-4">Próximos turnos del día</h2>
                {turnosDia.length > 0 ? (
                  <ul className="space-y-2 text-gray-700 text-sm">
                    {turnosDia.map((t) => (
                      <li key={t.id} className="flex justify-between border-b pb-1">
                        <span>
                          {new Date(t.fechaHora).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          — <strong>{t.cliente?.nombre ?? "Cliente"}</strong>
                        </span>
                        <span>{t.servicio?.nombre ?? "Servicio"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No hay turnos próximos hoy.</p>
                )}
              </div>
            </>
          )}

          {user.role === "cliente" && (
            <Link
              to="/turnos/nuevo"
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              Reservar turno
            </Link>
          )}
        </>
      )}
    </div>
  );
}
