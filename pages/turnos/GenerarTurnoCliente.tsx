import React from 'react';
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
  duracion?: number;
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

const pad = (n: number) => n.toString().padStart(2, '0');

const getMinNextAllowed = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);

  if (next.getHours() < 9) {
    const today9 = new Date(next);
    today9.setHours(9, 0, 0, 0);
    return today9;
  }
  if (next.getHours() >= 19) {
    const tomorrow9 = new Date(next);
    tomorrow9.setDate(tomorrow9.getDate() + 1);
    tomorrow9.setHours(9, 0, 0, 0);
    return tomorrow9;
  }
  return next;
};

const formatDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getMinDateInput = () => formatDateInput(getMinNextAllowed());

const getAvailableHoursFor = (dateStr: string) => {
  if (!dateStr) return [];
  const minAllowed = getMinNextAllowed();
  const date = new Date(dateStr + 'T00:00:00');
  const minDateStr = formatDateInput(minAllowed);
  const HOURS_MIN = 9;
  const HOURS_MAX = 19;
  const hours: number[] = [];
  for (let h = HOURS_MIN; h <= HOURS_MAX; h++) hours.push(h);

  if (dateStr === minDateStr) {
    return hours.filter((h) => h >= minAllowed.getHours());
  }
  if (date < new Date(minDateStr + 'T00:00:00')) return [];
  return hours;
};

const validarFechaObject = (fecha: Date) => {
  if (isNaN(fecha.getTime())) return { ok: false, msg: 'Fecha inválida.' };
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
  const [productos, setProductos] = useState<Producto[]>([]);

  const [empleadoId, setEmpleadoId] = useState<number | undefined>(undefined);
  const [servicioId, setServicioId] = useState<number | undefined>(undefined);

  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number | undefined>(undefined);

  // select control para elegir producto desde el dropdown
  const [productSelect, setProductSelect] = useState<number | ''>('');

  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [busyHours, setBusyHours] = useState<number[]>([]);

  const minDateInput = getMinDateInput();

  const empleadosFiltrados = useMemo(() => {
    const servicioSel = servicios.find((s) => s.id === servicioId);
    if (!servicioSel?.especialidad) return empleados;
    return empleados.filter((e) => e.especialidad === servicioSel.especialidad);
  }, [empleados, servicios, servicioId]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!selectedDate || !empleadoId) {
      setBusyHours([]);
      return;
    }

    let cancelled = false;
    const loadBusy = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get<TurnoBackend[]>('http://localhost:3001/api/turnos', { headers });
        if (cancelled) return;

        const minDateStr = selectedDate;
        const HOURS_MIN = 9;
        const HOURS_MAX = 19;
        const hoursSet = new Set<number>();

        res.data.forEach((t) => {
          if (t.empleadoId !== empleadoId) return;
          if (t.estado && t.estado.toLowerCase() === 'cancelado') return;

          const d = new Date(t.fechaHora);
          const turnoDateStr = formatDateInput(d);
          if (turnoDateStr !== minDateStr) return;

          const baseHour = d.getHours();
          const dur = t.servicio?.duracion ?? 1;
          for (let i = 0; i < dur; i++) {
            const h = baseHour + i;
            if (h >= HOURS_MIN && h <= HOURS_MAX) hoursSet.add(h);
          }
        });

        const unique = Array.from(hoursSet).sort((a, b) => a - b);
        setBusyHours(unique);

        if (selectedHour !== undefined && unique.includes(selectedHour)) {
          setSelectedHour(undefined);
        }
      } catch (err) {
        console.error('Error loading busy hours', err);
        setBusyHours([]);
      }
    };

    loadBusy();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, empleadoId, selectedHour]);

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

    const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    const clienteId = (user as any)?.id ?? storedUser?.id;
    if (!clienteId) {
      setMensaje('No se pudo identificar al cliente. Inicia sesión.');
      return;
    }

    if (busyHours.includes(selectedHour)) {
      setMensaje('La hora seleccionada está ocupada. Elige otra.');
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

  const availableHours = useMemo(() => getAvailableHoursFor(selectedDate), [selectedDate]);

  // servicio seleccionado y totales
  const selectedService = useMemo(() => servicios.find((s) => s.id === servicioId) ?? null, [servicios, servicioId]);
  const productsTotal = useMemo(
    () =>
      Object.entries(selectedProducts).reduce((sum, [pid, qty]) => {
        const prod = productos.find((p) => p.id === Number(pid));
        return sum + (prod ? prod.precio * Number(qty) : 0);
      }, 0),
    [selectedProducts, productos]
  );
  const totalAmount = useMemo(() => (selectedService ? Number(selectedService.precio) : 0) + productsTotal, [selectedService, productsTotal]);
  const formatMoney = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  return (
    <div className="max-w-xl mx-auto p-6 bg-card border border-border rounded-lg shadow-md mt-10 text-gray-800">
      <h2 className="text-2xl font-semibold text-primary mb-4">Reservar nuevo turno</h2>

      {mensaje && <p className="mb-4 text-sm text-center text-gray-700">{mensaje}</p>}

      {loading ? (
        <p className="text-center mb-4 text-gray-700">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Servicio</label>
            <select
              value={servicioId ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                setServicioId(v);
                setEmpleadoId(undefined);
              }}
              className="w-full border border-border px-3 py-2 rounded-md bg-background text-gray-800"
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
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Empleado</label>
            <select
              value={empleadoId ?? ''}
              onChange={(e) => setEmpleadoId(e.target.value === '' ? undefined : Number(e.target.value))}
              disabled={!servicioId}
              className="w-full border border-border px-3 py-2 rounded-md bg-background disabled:opacity-60 text-gray-800"
            >
              <option value="">{servicioId ? 'Seleccione un empleado' : 'Seleccione un servicio primero'}</option>
              {empleadosFiltrados.length === 0 ? (
                <option value="" disabled>
                  No hay empleados disponibles
                </option>
              ) : (
                empleadosFiltrados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.especialidad ? `(${emp.especialidad})` : ''}
                  </option>
                ))
              )}
            </select>
            {servicioId && empleadosFiltrados.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">No hay empleados con la especialidad de ese servicio.</p>
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
                setSelectedHour(undefined);
                setMensaje('');
              }}
              className="w-full border border-border px-3 py-2 rounded-md bg-background text-gray-800"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Hora</label>
            <select
              value={selectedHour ?? ''}
              onChange={(e) => setSelectedHour(e.target.value === '' ? undefined : Number(e.target.value))}
              disabled={!selectedDate || availableHours.length === 0}
              className="w-full border border-border px-3 py-2 rounded-md bg-background text-gray-800"
            >
              <option value="">
                {!selectedDate ? 'Seleccione una fecha primero' : availableHours.length === 0 ? 'No hay horas disponibles' : 'Seleccione una hora'}
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
              <p className="text-xs text-gray-600 mt-1">Las horas marcadas como "ocupado" no pueden seleccionarse.</p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Productos (opcional)</label>
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
            <p className="text-xs text-gray-600 mt-1">Los productos se agregarán al turno (opcional).</p>
          </div>

          {/* sección NUEVA: resumen de precios */}
          <div className="p-3 border border-border rounded-md bg-background space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">Servicio</div>
              <div className="text-sm font-medium text-gray-900">{selectedService ? selectedService.nombre : '-'}</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">Precio servicio</div>
              <div className="text-sm font-medium text-gray-900">{selectedService ? formatMoney(Number(selectedService.precio)) : formatMoney(0)}</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">Productos</div>
              <div className="text-sm font-medium text-gray-900">{formatMoney(productsTotal)}</div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm text-gray-800">Total a pagar</div>
              <div className="text-lg font-semibold text-gray-900">{formatMoney(totalAmount)}</div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-60">
            {submitting ? 'Enviando...' : 'Confirmar Turno'}
          </button>
        </form>
      )}
    </div>
  );
};

export default GenerarTurnoCliente;
