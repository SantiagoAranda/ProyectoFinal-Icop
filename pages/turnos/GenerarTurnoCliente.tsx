import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../../src/context/UserContext.tsx';

/**
 * Tipos del dominio
 */
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
  duracion?: number; // horas de duración (entero)
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock?: number | null;
}

interface TurnoBackend {
  id: number;
  fechaHora: string;
  empleadoId: number;
  servicioId: number;
  servicio?: { id: number; duracion?: number };
  estado?: string;
}

/**
 * Helpers
 */
const pad = (n: number) => n.toString().padStart(2, '0');

const HOURS_MIN = 9;
const HOURS_MAX = 19; // tope exclusivo para validaciones (en selects incluimos 19 para mostrar 19:00 como opción si quisieras)
const SLOTS_PER_DAY = HOURS_MAX - HOURS_MIN; // 10 slots (9..18)

const getMinNextAllowed = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);

  if (next.getHours() < HOURS_MIN) {
    const today9 = new Date(next);
    today9.setHours(HOURS_MIN, 0, 0, 0);
    return today9;
  }
  if (next.getHours() >= HOURS_MAX) {
    const tomorrow9 = new Date(next);
    tomorrow9.setDate(tomorrow9.getDate() + 1);
    tomorrow9.setHours(HOURS_MIN, 0, 0, 0);
    return tomorrow9;
  }
  return next;
};

const formatDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getMinDateInput = () => formatDateInput(getMinNextAllowed());

/**
 * Retorna la lista de horas posibles (enteros) para una fecha dada respetando:
 * - Rango laboral (9 a 19)
 * - La hora mínima si la fecha es hoy (no permite pasado)
 */
const getAvailableHoursFor = (dateStr: string) => {
  if (!dateStr) return [];
  const minAllowed = getMinNextAllowed();
  const date = new Date(dateStr + 'T00:00:00');
  const minDateStr = formatDateInput(minAllowed);

  const hours: number[] = [];
  for (let h = HOURS_MIN; h <= HOURS_MAX; h++) hours.push(h);

  if (dateStr === minDateStr) {
    return hours.filter((h) => h >= minAllowed.getHours());
  }
  if (date < new Date(minDateStr + 'T00:00:00')) return [];
  return hours;
};

/**
 * Validación de fecha/hora final
 */
const validarFechaObject = (fecha: Date) => {
  if (isNaN(fecha.getTime())) return { ok: false, msg: 'Fecha inválida.' };
  if (fecha.getMinutes() !== 0 || fecha.getSeconds() !== 0 || fecha.getMilliseconds() !== 0) {
    return { ok: false, msg: 'Sólo horas en punto.' };
  }
  const hora = fecha.getHours();
  if (hora < HOURS_MIN || hora > HOURS_MAX) {
    return { ok: false, msg: 'Hora fuera de rango.' };
  }
  const ahora = new Date();
  if (fecha.getTime() <= ahora.getTime()) {
    return { ok: false, msg: 'No se pueden reservar fechas pasadas.' };
  }
  return { ok: true };
};

/**
 * Cálculo de color de ocupación según porcentaje:
 * - verde < 20%
 * - naranja 21% a 60%
 * - rojo > 60%
 */
const getOcupacionColor = (ratio: number) => {
  if (ratio <= 0.2) return 'bg-green-500 text-white';
  if (ratio <= 0.6) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
};

const toPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

const rounded = (n: number, decimals = 0) => {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
};

/**
 * UI pequeña para badge de ocupación
 */
const OcupacionBadge: React.FC<{ ratio: number; title?: string }> = ({ ratio, title }) => {
  const color = getOcupacionColor(ratio);
  return (
    <span
      title={title || 'Ocupación estimada en la fecha elegida'}
      className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
      aria-label={`Ocupación ${toPercent(ratio)}`}
    >
      {toPercent(ratio)}
    </span>
  );
};

const InputHelp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-gray-500 mt-1">{children}</p>
);

const FieldLabel: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block mb-1 text-sm font-medium">
    {children}
  </label>
);

/**
 * Componente principal
 */
const GenerarTurnoCliente: React.FC = () => {
  const { user } = useUser();

  // Datos base
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Selecciones
  const [empleadoId, setEmpleadoId] = useState<number | undefined>(undefined);
  const [servicioId, setServicioId] = useState<number | undefined>(undefined);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number | undefined>(undefined);

  // Dropdown de productos (opcional)
  const [productSelect, setProductSelect] = useState<number | ''>('');

  // Estado UI
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Ocupación/horarios ocupados
  const [busyHours, setBusyHours] = useState<number[]>([]);
  const [ocupacionPorEmpleado, setOcupacionPorEmpleado] = useState<Record<number, number>>({}); // ratio por empleado en la fecha seleccionada

  // Validaciones visuales
  const [touched, setTouched] = useState<{ servicio?: boolean; empleado?: boolean; fecha?: boolean; hora?: boolean }>({});
  const firstLoadRef = useRef(true);

  const minDateInput = getMinDateInput();

  /**
   * Empleados filtrados por especialidad del servicio seleccionado
   */
  const empleadosFiltrados = useMemo(() => {
    const servicioSel = servicios.find((s) => s.id === servicioId);
    if (!servicioSel?.especialidad) return empleados;
    return empleados.filter((e) => e.especialidad === servicioSel.especialidad);
  }, [empleados, servicios, servicioId]);

  /**
   * Fetch inicial de empleados/servicios/productos
   */
  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const [empleadosRes, serviciosRes, productosRes] = await Promise.all([
          axios.get('http://localhost:3001/api/empleados', { headers }),
          axios.get('http://localhost:3001/api/servicios', { headers }),
          axios.get('http://localhost:3001/api/productos', { headers }).catch(() => ({ data: [] })),
        ]);

        if (cancel) return;

        const empleadosData: Empleado[] = Array.isArray(empleadosRes.data)
          ? empleadosRes.data
          : empleadosRes.data?.empleados ?? [];

        const serviciosData: Servicio[] = Array.isArray(serviciosRes.data)
          ? serviciosRes.data
          : serviciosRes.data?.servicios ?? [];

        const productosData: Producto[] = Array.isArray(productosRes.data)
          ? productosRes.data
          : productosRes.data?.productos ?? [];

        setEmpleados(empleadosData);
        setServicios(serviciosData);
        setProductos(productosData);
        setMensaje('');
      } catch (err: any) {
        console.error('Error fetching empleados/servicios/productos', err);
        setMensaje('No se pudieron cargar empleados, servicios o productos. Revisa la consola y CORS/backend.');
        setEmpleados([]);
        setServicios([]);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancel = true;
    };
  }, []);

  /**
   * Carga y cálculo de horarios ocupados + ocupación por empleado para la fecha elegida
   */
  useEffect(() => {
    if (!selectedDate) {
      setBusyHours([]);
      setOcupacionPorEmpleado({});
      return;
    }

    let cancelled = false;
    const loadBusyAndOcupacion = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get<TurnoBackend[]>('http://localhost:3001/api/turnos', { headers });
        if (cancelled) return;

        const hoursSetForSelectedEmp = new Set<number>();
        const mapSlotsPorEmpleado: Record<number, number> = {};

        res.data.forEach((t) => {
          if (t.estado && t.estado.toLowerCase() === 'cancelado') return;

          const d = new Date(t.fechaHora);
          const turnoDateStr = formatDateInput(d);
          if (turnoDateStr !== selectedDate) return;

          const baseHour = d.getHours();
          const dur = t.servicio?.duracion ?? 1;

          // Marcar horas ocupadas del empleado seleccionado
          if (empleadoId && t.empleadoId === empleadoId) {
            for (let i = 0; i < dur; i++) {
              const h = baseHour + i;
              if (h >= HOURS_MIN && h <= HOURS_MAX) hoursSetForSelectedEmp.add(h);
            }
          }

          // Contabilizar slots por empleado (para el badge de ocupación)
          let slots = 0;
          for (let i = 0; i < dur; i++) {
            const h = baseHour + i;
            if (h >= HOURS_MIN && h <= HOURS_MAX) slots++;
          }
          if (slots > 0) {
            mapSlotsPorEmpleado[t.empleadoId] = (mapSlotsPorEmpleado[t.empleadoId] || 0) + slots;
          }
        });

        setBusyHours(Array.from(hoursSetForSelectedEmp).sort((a, b) => a - b));

        // Calcular ratio ocupación por empleado (= slotsOcupados / SLOTS_PER_DAY)
        const ratios: Record<number, number> = {};
        Object.entries(mapSlotsPorEmpleado).forEach(([empId, used]) => {
          const ratio = Math.max(0, Math.min(1, (used as number) / SLOTS_PER_DAY));
          ratios[Number(empId)] = ratio;
        });
        setOcupacionPorEmpleado(ratios);
      } catch (err) {
        console.error('Error loading busy hours/ocupación', err);
        setBusyHours([]);
        setOcupacionPorEmpleado({});
      }
    };

    loadBusyAndOcupacion();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, empleadoId]);

  /**
   * Restricción lunes-viernes en selección de fecha
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setSelectedDate('');
      setSelectedHour(undefined);
      return;
    }
    const date = new Date(value + 'T00:00:00');
    const day = date.getDay(); // 0 Domingo, 6 Sábado
    if (day === 0 || day === 6) {
      // feedback visual no intrusivo
      setMensaje('Solo se pueden reservar turnos de lunes a viernes.');
      // No persistimos la fecha inválida
      return;
    }
    setSelectedDate(value);
    setSelectedHour(undefined);
    setMensaje('');
  };

  /**
   * Gestores de productos
   */
  const toggleProduct = (productoId: number) => {
    setSelectedProducts((prev) => {
      const copy = { ...prev };
      if (copy[productoId]) {
        delete copy[productoId];
      } else {
        copy[productoId] = 1;
      }
      return copy;
    });
  };

  const setProductQty = (productoId: number, qty: number) => {
    setSelectedProducts((prev) => {
      const copy = { ...prev };
      if (!qty || qty <= 0) {
        delete copy[productoId];
      } else {
        copy[productoId] = Math.floor(qty);
      }
      return copy;
    });
  };

  const addSelectedProduct = (productoId: number) => {
    setSelectedProducts((prev) => {
      if (prev[productoId]) return prev;
      return { ...prev, [productoId]: 1 };
    });
  };

  const removeSelectedProduct = (productoId: number) => {
    setSelectedProducts((prev) => {
      const copy = { ...prev };
      delete copy[productoId];
      return copy;
    });
  };

  /**
   * Disparadores de "touched" para visual
   */
  const markTouched = (field: 'servicio' | 'empleado' | 'fecha' | 'hora') => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  /**
   * Horas disponibles memoizadas
   */
  const availableHours = useMemo(() => getAvailableHoursFor(selectedDate), [selectedDate]);

  /**
   * Totales + descuento por cantidad de productos
   */
  const selectedService = useMemo(() => servicios.find((s) => s.id === servicioId) ?? null, [servicios, servicioId]);

  const productsTotal = useMemo(
    () =>
      Object.entries(selectedProducts).reduce((sum, [pid, qty]) => {
        const prod = productos.find((p) => p.id === Number(pid));
        return sum + (prod ? prod.precio * Number(qty) : 0);
      }, 0),
    [selectedProducts, productos]
  );

  const cantidadProductos = Object.keys(selectedProducts).length;
  const descuento =
    cantidadProductos === 1 ? 0.05 :
    cantidadProductos === 2 ? 0.10 :
    cantidadProductos >= 3 ? 0.15 : 0;

  const subtotal = (selectedService ? Number(selectedService.precio) : 0) + productsTotal;
  const totalAmount = subtotal - subtotal * descuento;

  const formatMoney = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  /**
   * SUBMIT
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');

    // Validaciones mínimas
    if (!servicioId) {
      setMensaje('Seleccione un servicio.');
      markTouched('servicio');
      return;
    }
    if (!empleadoId) {
      setMensaje('Seleccione un empleado.');
      markTouched('empleado');
      return;
    }
    if (!selectedDate) {
      setMensaje('Seleccione una fecha.');
      markTouched('fecha');
      return;
    }
    if (selectedHour === undefined) {
      setMensaje('Seleccione una hora.');
      markTouched('hora');
      return;
    }

    // No permitir hora ocupada
    if (busyHours.includes(selectedHour)) {
      setMensaje('La hora seleccionada está ocupada. Elige otra.');
      markTouched('hora');
      return;
    }

    const fecha = new Date(`${selectedDate}T${pad(selectedHour)}:00:00`);
    const valid = validarFechaObject(fecha);
    if (!valid.ok) {
      setMensaje(valid.msg);
      return;
    }

    const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    const clienteId = (user as any)?.id ?? storedUser?.id;
    if (!clienteId) {
      setMensaje('No se pudo identificar al cliente. Inicia sesión.');
      return;
    }

    try {
      setSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const productsPayload = Object.entries(selectedProducts).map(([pid, qty]) => ({
        productoId: Number(pid),
        cantidad: Number(qty),
      }));

      await axios.post(
        'http://localhost:3001/api/turnos',
        {
          empleadoId: Number(empleadoId),
          servicioId: Number(servicioId),
          fechaHora: fecha.toISOString(),
          clienteId: Number(clienteId),
          productos: productsPayload.length ? productsPayload : undefined,
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
      setBusyHours([]);
      setSelectedProducts({});
      setTouched({});
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

  /**
   * Efecto para no mostrar "mensaje" residual en primer render
   */
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setMensaje('');
    }
  }, []);

  /**
   * Render
   */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-card border border-border rounded-lg shadow-md mt-10 text-gray-800">
      <h2 className="text-2xl font-semibold text-primary mb-4">Reservar nuevo turno</h2>

      {mensaje && (
        <div className="mb-4 p-3 rounded-md border border-border bg-amber-50 text-amber-800 text-sm">
          {mensaje}
        </div>
      )}

      {loading ? (
        <p className="text-center mb-4 text-gray-700">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Servicio */}
          <div>
            <FieldLabel>Servicio</FieldLabel>
            <select
              value={servicioId ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                setServicioId(v);
                setEmpleadoId(undefined);
                setTouched((t) => ({ ...t, servicio: true }));
              }}
              className={`w-full border px-3 py-2 rounded-md bg-background text-gray-800 ${
                touched.servicio && !servicioId ? 'border-red-400 focus:ring-red-200' : 'border-border'
              }`}
            >
              <option value="">Seleccione un servicio</option>
              {servicios.length === 0 ? (
                <option value="" disabled>
                  No hay servicios disponibles
                </option>
              ) : (
                servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.especialidad ? `(${s.especialidad})` : ''} - ${s.precio}
                  </option>
                ))
              )}
            </select>
            <InputHelp>
              Los empleados disponibles se filtran automáticamente por la especialidad del servicio.
            </InputHelp>
          </div>

          {/* Empleado */}
          <div>
            <FieldLabel>Empleado</FieldLabel>
            <select
              value={empleadoId ?? ''}
              onChange={(e) => {
                setEmpleadoId(e.target.value === '' ? undefined : Number(e.target.value));
                setTouched((t) => ({ ...t, empleado: true }));
              }}
              disabled={!servicioId}
              className={`w-full border px-3 py-2 rounded-md bg-background disabled:opacity-60 text-gray-800 ${
                touched.empleado && !empleadoId ? 'border-red-400 focus:ring-red-200' : 'border-border'
              }`}
            >
              <option value="">{servicioId ? 'Seleccione un empleado' : 'Seleccione un servicio primero'}</option>
              {empleadosFiltrados.length === 0 ? (
                <option value="" disabled>
                  No hay empleados disponibles
                </option>
              ) : (
                empleadosFiltrados.map((emp) => {
                  const ratio = ocupacionPorEmpleado[emp.id] ?? 0;
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.especialidad ? `(${emp.especialidad})` : ''} — Ocupación {toPercent(ratio)}
                    </option>
                  );
                })
              )}
            </select>
            {servicioId && empleadosFiltrados.length === 0 && (
              <InputHelp>No hay empleados con la especialidad de ese servicio.</InputHelp>
            )}
            {/* Pista visual de ocupación para el empleado seleccionado */}
            {empleadoId && typeof ocupacionPorEmpleado[empleadoId] === 'number' && (
              <div className="mt-2">
                <span className="text-xs text-gray-700">Ocupación estimada en la fecha elegida:</span>
                <OcupacionBadge ratio={ocupacionPorEmpleado[empleadoId]} />
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <FieldLabel>Fecha</FieldLabel>
            <input
              type="date"
              value={selectedDate}
              min={minDateInput}
              onChange={(e) => {
                handleDateChange(e);
                setTouched((t) => ({ ...t, fecha: true }));
              }}
              className={`w-full border px-3 py-2 rounded-md bg-background text-gray-800 ${
                touched.fecha && !selectedDate ? 'border-red-400 focus:ring-red-200' : 'border-border'
              }`}
            />
            <InputHelp>Solo se permiten reservas de lunes a viernes.</InputHelp>
          </div>

          {/* Hora */}
          <div>
            <FieldLabel>Hora</FieldLabel>
            <select
              value={selectedHour ?? ''}
              onChange={(e) => {
                setSelectedHour(e.target.value === '' ? undefined : Number(e.target.value));
                setTouched((t) => ({ ...t, hora: true }));
              }}
              disabled={!selectedDate || availableHours.length === 0}
              className={`w-full border px-3 py-2 rounded-md bg-background text-gray-800 ${
                touched.hora && selectedHour === undefined ? 'border-red-400 focus:ring-red-200' : 'border-border'
              }`}
            >
              <option value="">
                {!selectedDate
                  ? 'Seleccione una fecha primero'
                  : availableHours.length === 0
                  ? 'No hay horas disponibles'
                  : 'Seleccione una hora'}
              </option>
              {availableHours.map((h) => {
                const isBusy = busyHours.includes(h);
                return (
                  <option key={h} value={h} disabled={isBusy}>
                    {h}:00{isBusy ? ' (ocupado)' : ''}
                  </option>
                );
              })}
            </select>
            {busyHours.length > 0 && (
              <InputHelp>Las horas marcadas como “ocupado” no pueden seleccionarse.</InputHelp>
            )}
          </div>

          {/* Productos (opcional) con selector + lista editable */}
          <div>
            <FieldLabel>Productos (opcional)</FieldLabel>
            {productos.length === 0 ? (
              <p className="text-sm text-gray-600">No hay productos disponibles</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={productSelect}
                    onChange={(e) => setProductSelect(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 border border-border px-3 py-2 rounded-md bg-background text-gray-800"
                    aria-label="Seleccionar producto"
                  >
                    <option value="">Seleccione un producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (productSelect !== '') {
                        addSelectedProduct(Number(productSelect));
                        setProductSelect('');
                      }
                    }}
                    disabled={productSelect === ''}
                    className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-60"
                  >
                    Agregar
                  </button>
                </div>

                {Object.keys(selectedProducts).length === 0 ? (
                  <p className="text-sm text-gray-600">No has agregado productos</p>
                ) : (
                  <div className="grid gap-2">
                    {Object.entries(selectedProducts).map(([pid, qty]) => {
                      const prod = productos.find((p) => p.id === Number(pid));
                      if (!prod) return null;
                      return (
                        <div key={pid} className="flex items-center justify-between gap-3 px-3 py-2 border border-border rounded-md">
                          <div>
                            <div className="text-sm font-medium">{prod.nombre}</div>
                            <div className="text-xs text-gray-600">${prod.precio}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) => setProductQty(prod.id, Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-border rounded-md text-gray-800"
                              aria-label={`Cantidad ${prod.nombre}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeSelectedProduct(prod.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-md"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <InputHelp>
              Descuento automático según cantidad de productos: 1 = 5%, 2 = 10%, 3 o más = 15%.
            </InputHelp>
          </div>

          {/* Resumen de precios */}
          <div className="p-3 border border-border rounded-md bg-background space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">Servicio</div>
              <div className="text-sm font-medium text-gray-900">{selectedService ? selectedService.nombre : '-'}</div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">Precio servicio</div>
              <div className="text-sm font-medium text-gray-900">
                {selectedService ? formatMoney(Number(selectedService.precio)) : formatMoney(0)}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">Productos</div>
              <div className="text-sm font-medium text-gray-900">{formatMoney(productsTotal)}</div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm text-gray-800">Subtotal</div>
              <div className="text-sm font-semibold text-gray-900">{formatMoney(subtotal)}</div>
            </div>

            {descuento > 0 && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-green-700">Descuento</div>
                <div className="text-sm font-semibold text-green-700">-{(descuento * 100).toFixed(0)}%</div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm text-gray-800">Total a pagar</div>
              <div className="text-lg font-semibold text-gray-900">{formatMoney(totalAmount)}</div>
            </div>
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
