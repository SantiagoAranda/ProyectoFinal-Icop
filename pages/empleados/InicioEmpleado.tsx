import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '../../src/context/UserContext';
import api from '@/lib/api';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// === Configuración de localización ===
const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// === Tipado ===
interface Turno {
  id: number;
  fechaHora: string;
  estado: string;
  servicio?: { nombre: string; precio: number; duracion?: number };
  cliente?: { nombre?: string };
  empleadoId?: number;
}

const InicioEmpleado: React.FC = () => {
  const { user } = useUser();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔒 Solo empleados
  if (!user || user.role !== 'empleado') {
    return (
      <div className="text-center p-10 text-gray-700">
        <h1 className="text-2xl font-semibold">Acceso restringido</h1>
        <p className="text-gray-600 mt-2">Esta sección es solo para empleados.</p>
      </div>
    );
  }

  // === Cargar turnos del empleado ===
  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await api.get(`/turnos`, { headers });
      const allTurnos = res.data as Turno[];
      const turnosEmpleado = allTurnos.filter(
        (t) => t.empleadoId === user.id && new Date(t.fechaHora) >= new Date()
      );
      setTurnos(turnosEmpleado);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
  }, []);

  // === Estadísticas resumidas ===
  const completados = turnos.filter((t) => t.estado === 'completado').length;
  const cancelados = turnos.filter((t) => t.estado === 'cancelado').length;
  const futuros = turnos.filter((t) => t.estado === 'reservado').length;
  const ingresos = turnos
    .filter((t) => t.estado === 'completado')
    .reduce((acc, t) => acc + (t.servicio?.precio || 0), 0);

  const resumen = [
    { label: 'Turnos futuros', valor: futuros, color: 'bg-blue-100 text-blue-700' },
    { label: 'Completados', valor: completados, color: 'bg-green-100 text-green-700' },
    { label: 'Cancelados', valor: cancelados, color: 'bg-red-100 text-red-700' },
    { label: 'Ingresos estimados', valor: `$${ingresos}`, color: 'bg-yellow-100 text-yellow-800' },
  ];

  // === Datos para el calendario ===
  const events = useMemo(
    () =>
      turnos.map((t) => ({
        id: t.id,
        title: `${t.servicio?.nombre ?? 'Servicio'} - ${t.cliente?.nombre ?? 'Cliente'}`,
        start: new Date(t.fechaHora),
        end: new Date(
          new Date(t.fechaHora).getTime() +
            ((t.servicio?.duracion ?? 1) * 60 * 60 * 1000)
        ),
        estado: t.estado,
      })),
    [turnos]
  );

  // === Colores según estado ===
  const eventPropGetter = (event: any) => {
    let bg = '#facc15'; // amarillo = reservado
    if (event.estado === 'completado') bg = '#4ade80'; // verde
    if (event.estado === 'cancelado') bg = '#f87171'; // rojo
    return {
      style: {
        backgroundColor: bg,
        color: '#111827',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 600,
      },
    };
  };

  // ✅ Configuración estable de vistas (evita recreaciones en cada render)
  const allViews = useMemo(
    () => ({
      month: true,
      week: true,
      day: true,
    }),
    []
  );

  // ✅ Estado controlado de la vista actual
  const [currentView, setCurrentView] = useState(Views.WEEK);

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

          {/* === Calendario de turnos === */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Tus próximos turnos</h2>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={currentView} // vista actual controlada
              onView={(view) => setCurrentView(view)} // cambia la vista
              defaultView={Views.WEEK}
              views={allViews}
              culture="es-AR"
              style={{ height: 600 }}
              messages={{
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                today: 'Hoy',
                previous: '←',
                next: '→',
              }}
              eventPropGetter={eventPropGetter}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default InicioEmpleado;
