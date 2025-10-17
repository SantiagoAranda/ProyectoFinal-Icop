import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useUser } from '../../src/context/UserContext.tsx';

interface Empleado {
  id: number;
  nombre: string;
  especialidad?: string | null;
}

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  especialidad?: string | null;
}

// helpers
const pad = (n: number) => n.toString().padStart(2, '0');
const toDatetimeLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// devuelve la próxima hora válida mínima (respeta 09:00-19:00 y evita pasado)
const getMinNextAllowed = () => {
  const now = new Date();
  // avanzar al siguiente entero de hora para exigir futuro
  const next = new Date(now);
  if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    next.setHours(now.getHours() + 1, 0, 0, 0);
  } else {
    next.setHours(now.getHours() + 1, 0, 0, 0);
  }

  // si next está antes de 09:00 => usar hoy 09:00
  if (next.getHours() < 9) {
    const today9 = new Date(next);
    today9.setHours(9, 0, 0, 0);
    return today9;
  }

  // si next está fuera del rango (>=19) => usar siguiente día 09:00
  if (next.getHours() >= 19) {
    const tomorrow9 = new Date(next);
    tomorrow9.setDate(tomorrow9.getDate() + 1);
    tomorrow9.setHours(9, 0, 0, 0);
    return tomorrow9;
  }

  // next está entre 9 y 18/19 => válido
  return next;
};

const formatDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getMinDateInput = () => formatDateInput(getMinNextAllowed());

// devuelve lista de horas redondas permitidas (9..19) para una fecha dada (yyyy-mm-dd)
const getAvailableHoursFor = (dateStr: string) => {
  if (!dateStr) return [];
  const minAllowed = getMinNextAllowed();
  const date = new Date(dateStr + 'T00:00:00');
  const minDateStr = formatDateInput(minAllowed);

  const HOURS_MIN = 9;
  const HOURS_MAX = 19; // inclusive

  const hours = [];
  for (let h = HOURS_MIN; h <= HOURS_MAX; h++) hours.push(h);

  if (dateStr === minDateStr) {
    // si es el mismo día que la mínima permitida, filtrar horas anteriores a la hora mínima
    return hours.filter((h) => h >= minAllowed.getHours());
  }

  // si la fecha es antes de la mínima permitida, devolver vacío
  if (date < new Date(minDateStr + 'T00:00:00')) return [];

  return hours;
};

const validarFechaObject = (fecha: Date) => {
  if (isNaN(fecha.getTime())) return { ok: false, msg: 'Fecha inválida.' };

  // minutos y segundos deben ser 0 (horas redondas)
  if (fecha.getMinutes() !== 0 || fecha.getSeconds() !== 0 || fecha.getMilliseconds() !== 0) {
    return { ok: false, msg: 'Sólo horas en punto.' };
  }

  const hora = fecha.getHours();
  if (hora < 9 || hora > 19) {
    return { ok: false, msg: 'Hora fuera de rango.' };
  }

  const ahora = new Date();
  if (fecha.getTime() <= ahora.getTime()) {
    return { ok: false, msg: 'No se pueden reservar fechas pasadas.' };
  }

  return { ok: true };
};

const GenerarTurnoCliente = () => {
  const { user } = useUser();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleadoId, setEmpleadoId] = useState<number | undefined>(undefined);
  const [servicioId, setServicioId] = useState<number | undefined>(undefined);

  // ahora separo fecha y hora (hora es número, fecha es yyyy-mm-dd)
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number | undefined>(undefined);

  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const minDateInput = getMinDateInput();

  // empleados filtrados según el servicio seleccionado (por especialidad)
  const empleadosFiltrados = useMemo(() => {
    const servicioSel = servicios.find((s) => s.id === servicioId);
    if (!servicioSel?.especialidad) return empleados;
    return empleados.filter((e) => e.especialidad === servicioSel.especialidad);
  }, [empleados, servicios, servicioId]);

  // obtener empleados y servicios al cargar el componente
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const [empleadosRes, serviciosRes] = await Promise.all([
          axios.get('http://localhost:3001/api/empleados', { headers }),
          axios.get('http://localhost:3001/api/servicios', { headers }),
        ]);

        const empleadosData: Empleado[] = Array.isArray(empleadosRes.data) ? empleadosRes.data : empleadosRes.data?.empleados ?? [];
        const serviciosData: Servicio[] = Array.isArray(serviciosRes.data) ? serviciosRes.data : serviciosRes.data?.servicios ?? [];

        setEmpleados(empleadosData);
        setServicios(serviciosData);
        setMensaje('');
      } catch (err: any) {
        console.error('Error fetching empleados/servicios', err);
        setMensaje('No se pudieron cargar empleados o servicios. Revisa la consola y CORS/backend.');
        setEmpleados([]);
        setServicios([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');

    if (!servicioId) {
      setMensaje('Seleccione un servicio.');
      return;
    }
    if (!empleadoId) {
      setMensaje('Seleccione un empleado.');
      return;
    }
    if (!selectedDate || selectedHour === undefined) {
      setMensaje('Seleccione fecha y hora.');
      return;
    }

    const fecha = new Date(`${selectedDate}T${pad(selectedHour)}:00:00`);
    const valid = validarFechaObject(fecha);
    if (!valid.ok) {
      setMensaje(valid.msg);
      return;
    }

    // obtener clienteId (context o fallback a localStorage)
    const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    const clienteId = (user as any)?.id ?? storedUser?.id;
    if (!clienteId) {
      setMensaje('No se pudo identificar al cliente. Inicia sesión.');
      return;
    }

    try {
      setSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      await axios.post(
        'http://localhost:3001/api/turnos',
        {
          empleadoId: Number(empleadoId),
          servicioId: Number(servicioId),
          fechaHora: fecha.toISOString(),
          clienteId: Number(clienteId),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      setMensaje('Turno generado exitosamente ✅');
      setEmpleadoId(undefined);
      setServicioId(undefined);
      setSelectedDate('');
      setSelectedHour(undefined);
    } catch (error) {
      console.error('Error al generar turno', error);
      const status = (error as any)?.response?.status;
      if (status === 400) setMensaje((error as any)?.response?.data?.message ?? 'Datos inválidos');
      else if (status === 401 || status === 403) setMensaje('No autorizado. Inicia sesión.');
      else setMensaje('Error al generar el turno ❌');
    } finally {
      setSubmitting(false);
    }
  };

  // horas disponibles según la fecha elegida
  const availableHours = useMemo(() => getAvailableHoursFor(selectedDate), [selectedDate]);

  return (
    <div className="max-w-xl mx-auto p-6 bg-card border border-border rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-semibold text-primary mb-4">Reservar nuevo turno</h2>

      {mensaje && <p className="mb-4 text-sm text-center">{mensaje}</p>}

      {loading ? (
        <p className="text-center mb-4">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Servicio</label>
            <select
              value={servicioId ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                setServicioId(v);
                setEmpleadoId(undefined); // resetear empleado al cambiar servicio
              }}
              className="w-full border border-border px-3 py-2 rounded-md bg-background"
            >
              <option value="">Seleccione un servicio</option>
              {servicios.length === 0 ? (
                <option value="" disabled>No hay servicios disponibles</option>
              ) : (
                servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.especialidad ? `(${s.especialidad})` : ''} - ${s.precio}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Empleado</label>
            <select
              value={empleadoId ?? ''}
              onChange={(e) => setEmpleadoId(e.target.value === '' ? undefined : Number(e.target.value))}
              disabled={!servicioId}
              className="w-full border border-border px-3 py-2 rounded-md bg-background disabled:opacity-60"
            >
              <option value="">{servicioId ? 'Seleccione un empleado' : 'Seleccione un servicio primero'}</option>
              {empleadosFiltrados.length === 0 ? (
                <option value="" disabled>No hay empleados disponibles</option>
              ) : (
                empleadosFiltrados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.especialidad ? `(${emp.especialidad})` : ''}
                  </option>
                ))
              )}
            </select>
            {servicioId && empleadosFiltrados.length === 0 && (
              <p className="text-xs text-muted mt-1">No hay empleados con la especialidad de ese servicio.</p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              min={minDateInput}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedHour(undefined); // reset hora al cambiar fecha
                setMensaje('');
              }}
              className="w-full border border-border px-3 py-2 rounded-md bg-background"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Hora</label>
            <select
              value={selectedHour ?? ''}
              onChange={(e) => setSelectedHour(e.target.value === '' ? undefined : Number(e.target.value))}
              disabled={!selectedDate || availableHours.length === 0}
              className="w-full border border-border px-3 py-2 rounded-md bg-background"
            >
              <option value="">{!selectedDate ? 'Seleccione una fecha primero' : availableHours.length === 0 ? 'No hay horas disponibles' : 'Seleccione una hora'}</option>
              {availableHours.map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-60"
          >
            {submitting ? 'Enviando...' : 'Confirmar Turno'}
          </button>
        </form>
      )}
    </div>
  );
};

export default GenerarTurnoCliente;
