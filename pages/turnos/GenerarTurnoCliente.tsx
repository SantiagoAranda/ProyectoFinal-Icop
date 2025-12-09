import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import api from "../../src/lib/api";
import { useUser } from "../../src/context/UserContext";

/* ================================
   TIPOS
================================ */
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
  stock: number;
  stockPendiente: number;
  stockDisponible: number;
}

interface TurnoBackend {
  id: number;
  fechaHora: string;
  empleadoId: number;
  servicioId: number;
  servicio?: { id: number; duracion?: number; especialidad?: string | null };
  estado?: string;
  productos?: { productoId: number; cantidad: number }[];
}

/* ================================
   CONSTANTES
================================ */
const ESPECIALIDADES = ["Peluquería", "Uñas", "Masajes", "Depilación"];

const pad = (n: number) => n.toString().padStart(2, "0");

const HOURS_MIN = 9;
const HOURS_MAX = 19;
const SLOTS_PER_DAY = HOURS_MAX - HOURS_MIN;

/* ================================
   FECHAS
================================ */
const getMinNextAllowed = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);

  if (next.getHours() < HOURS_MIN) {
    next.setHours(HOURS_MIN, 0, 0, 0);
  } else if (next.getHours() >= HOURS_MAX) {
    next.setDate(next.getDate() + 1);
    next.setHours(HOURS_MIN, 0, 0, 0);
  }
  return next;
};

const formatDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getMinDateInput = () => formatDateInput(getMinNextAllowed());

// Para reconstruir una fecha local sin que se vaya al día anterior
const parseLocalDate = (value: string): Date | null => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  // hora al mediodía para evitar problemas de huso horario
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

const validarFechaObject = (fecha: Date) => {
  if (isNaN(fecha.getTime())) return { ok: false, msg: "Fecha inválida." };
  if (fecha.getMinutes() !== 0)
    return { ok: false, msg: "Sólo horas en punto." };
  if (fecha.getHours() < HOURS_MIN || fecha.getHours() > HOURS_MAX)
    return { ok: false, msg: "Hora fuera de rango." };
  if (fecha.getTime() <= new Date().getTime())
    return { ok: false, msg: "No se pueden reservar fechas pasadas." };

  return { ok: true };
};

/* ================================
   HORAS DISPONIBLES PARA UN DÍA
================================ */
const getAvailableHoursFor = (dateStr: string) => {
  if (!dateStr) return [];

  const today = new Date();
  const todayStr = formatDateInput(today);
  const selectedDate = new Date(dateStr + "T00:00:00");

  const hours: number[] = [];
  for (let h = HOURS_MIN; h <= HOURS_MAX; h++) hours.push(h);

  // Si es hoy → no permitir horas pasadas
  if (dateStr === todayStr) {
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    return hours.filter((h) => h * 60 > currentMinutes);
  }

  // Evitar días anteriores a hoy
  if (selectedDate < new Date(todayStr + "T00:00:00")) return [];

  return hours;
};

/* ================================
   NORMALIZAR ESPECIALIDADES
================================ */
// quita tildes, pasa a minúsculas
const normalizeText = (txt: string) =>
  txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// mapea cualquier variante a un "grupo" lógico
const getEspKey = (raw?: string | null): string => {
  if (!raw) return "";
  const t = normalizeText(raw);

  if (t.includes("pelu")) return "pelu";
  if (t.includes("una")) return "unas"; // uñas
  if (t.includes("masaj") || t.includes("masaje")) return "masajes";
  if (t.includes("depil")) return "depil";

  return t; // fallback
};

/* ================================
   COLORES OCUPACIÓN
================================ */
const getOcupacionColor = (ratio: number) => {
  if (ratio <= 0.2) return "bg-green-500 text-white";
  if (ratio <= 0.6) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
};

const toPercent = (r: number) => `${Math.round(r * 100)}%`;

const OcupacionBadge: React.FC<{ ratio: number }> = ({ ratio }) => {
  const color = getOcupacionColor(ratio);
  return (
    <span
      className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      {toPercent(ratio)}
    </span>
  );
};

/* ================================
   UI helpers
================================ */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block mb-1 text-sm font-medium">{children}</label>
);

/* ================================
   COMPONENTE PRINCIPAL
================================ */
const GenerarTurnoCliente: React.FC = () => {
  const { user } = useUser();
  const location = useLocation();

  /* === Estados principales === */
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState("");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [empleadoId, setEmpleadoId] = useState<number>();
  const [servicioId, setServicioId] = useState<number>();
  const [selectedProducts, setSelectedProducts] = useState<
    Record<number, number>
  >({});

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState<number>();
  const [productSelect, setProductSelect] = useState<number | "">("");

  const [busyHours, setBusyHours] = useState<number[]>([]);
  const [ocupacionPorEmpleado, setOcupacionPorEmpleado] = useState<
    Record<number, number>
  >({});

  const minDateInput = getMinDateInput();

  /* ================================
     FETCH INICIAL
  ================================= */
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined;

        const [empRes, servRes, prodRes] = await Promise.all([
          api.get("/empleados", { headers }),
          api.get("/servicios", { headers }),
          api.get("/productos", { headers }),
        ]);

        setEmpleados(empRes.data);
        setServicios(servRes.data);
        setProductos(prodRes.data);
      } catch {
        toast.error("Error cargando datos");
      }
    };

    load();
  }, []);

  /* ================================
     Prefill si viene desde “repetir turno”
  ================================= */
  useEffect(() => {
    const state = location.state as { turnoParaRepetir?: TurnoBackend } | null;
    let turno: any = state?.turnoParaRepetir ?? null;

    if (!turno) {
      const rawLs =
        localStorage.getItem("ultimoTurnoData") ||
        localStorage.getItem("ultimoTurno");

      if (rawLs) {
        try {
          const parsed = JSON.parse(rawLs);
          turno = parsed;
        } catch (e) {
          console.error("Error parseando ultimoTurno desde localStorage:", e);
        }
      }
    }

    if (!turno) return;
    if (!servicios.length || !empleados.length) return;

    const servicio = servicios.find((s) => s.id === turno.servicioId);
    if (servicio?.especialidad) {
      setEspecialidadSeleccionada(servicio.especialidad);
    }

    if (turno.servicioId) setServicioId(turno.servicioId);
    if (turno.empleadoId) setEmpleadoId(turno.empleadoId);

    if (Array.isArray(turno.productos) && turno.productos.length > 0) {
      const map: Record<number, number> = {};
      turno.productos.forEach((p: { productoId: number; cantidad: number }) => {
        map[p.productoId] = (map[p.productoId] || 0) + p.cantidad;
      });
      setSelectedProducts(map);
    }
    // no pre-cargamos fecha/hora
  }, [location.state, servicios, empleados]);

  /* ================================
     Filtrados
  ================================= */
  const serviciosFiltrados = useMemo(() => {
    if (!especialidadSeleccionada) return [];

    const targetKey = getEspKey(especialidadSeleccionada);
    return servicios.filter((s) => getEspKey(s.especialidad) === targetKey);
  }, [especialidadSeleccionada, servicios]);

  const empleadosFiltrados = useMemo(() => {
    const serv = servicios.find((s) => s.id === servicioId);
    const servKey = getEspKey(serv?.especialidad);
    if (!servKey) return [];

    return empleados.filter((e) => getEspKey(e.especialidad) === servKey);
  }, [servicioId, empleados, servicios]);

  /* ================================
     Horas ocupadas + ocupación por empleado
  ================================= */
  useEffect(() => {
    if (!selectedDate || !empleadoId) {
      setBusyHours([]);
      return;
    }

    const loadBusy = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined;

        const turnos = await api.get<TurnoBackend[]>("/turnos", { headers });

        const hoursSet = new Set<number>();
        const mapSlots: Record<number, number> = {};

        turnos.data.forEach((t) => {
          if (t.estado?.toLowerCase() === "cancelado") return;

          const d = new Date(t.fechaHora);
          if (formatDateInput(d) !== selectedDate) return;

          const dur = t.servicio?.duracion ?? 1;
          const base = d.getHours();

          // bloquear horas SOLO del empleado elegido
          if (t.empleadoId === empleadoId) {
            for (let i = 0; i < dur; i++) {
              hoursSet.add(base + i);
            }
          }

          // ocupación general por empleado (para badge)
          mapSlots[t.empleadoId] = (mapSlots[t.empleadoId] || 0) + dur;
        });

        setBusyHours([...hoursSet]);
        setOcupacionPorEmpleado(
          Object.fromEntries(
            Object.entries(mapSlots).map(([id, used]) => [
              Number(id),
              Math.min(used / SLOTS_PER_DAY, 1),
            ])
          )
        );
      } catch {
        // fail silently
      }
    };

    loadBusy();
  }, [selectedDate, empleadoId]);

  /* ================================
     ENVIAR FORMULARIO
  ================================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!especialidadSeleccionada)
      return toast.error("Seleccione una especialidad");
    if (!servicioId) return toast.error("Seleccione un servicio");
    if (!empleadoId) return toast.error("Seleccione un empleado");
    if (!selectedDate) return toast.error("Seleccione una fecha");
    if (selectedHour === undefined)
      return toast.error("Seleccione una hora");
    if (busyHours.includes(selectedHour))
      return toast.error("Ese horario está ocupado");

    const fecha = new Date(`${selectedDate}T${pad(selectedHour)}:00:00`);
    const valid = validarFechaObject(fecha);
    if (!valid.ok) return toast.error(valid.msg);

    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const clienteId = (user as any)?.id ?? storedUser?.id;
    if (!clienteId) return toast.error("No se identificó el cliente");

    try {
      const token = localStorage.getItem("token");

      await api.post(
        "/turnos",
        {
          empleadoId,
          servicioId,
          fechaHora: fecha.toISOString(),
          clienteId,
          productos: Object.entries(selectedProducts).map(
            ([pid, qty]) => ({
              productoId: Number(pid),
              cantidad: Number(qty),
            })
          ),
        },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      toast.success("Turno reservado con éxito 🎉");

      setEspecialidadSeleccionada("");
      setServicioId(undefined);
      setEmpleadoId(undefined);
      setSelectedDate("");
      setSelectedHour(undefined);
      setSelectedProducts({});
      setBusyHours([]);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Error al reservar turno"
      );
    }
  };

  /* ================================
     CÁLCULOS DE TOTALES Y DESCUENTOS
  ================================= */
  const servicioSeleccionado = servicios.find((s) => s.id === servicioId);

  const productosSeleccionados = Object.entries(selectedProducts);

  const productosTotal = productosSeleccionados.reduce(
    (sum, [id, qty]) => {
      const prod = productos.find((p) => p.id === Number(id));
      return sum + (prod ? prod.precio * Number(qty) : 0);
    },
    0
  );

  const cantidadTotalUnidades = productosSeleccionados.reduce(
    (sum, [, qty]) => sum + Number(qty),
    0
  );

  let descuentoPorcentaje = 0;
  if (cantidadTotalUnidades === 1) descuentoPorcentaje = 5;
  else if (cantidadTotalUnidades === 2) descuentoPorcentaje = 10;
  else if (cantidadTotalUnidades >= 3) descuentoPorcentaje = 15;

  const descuentoMonto = (productosTotal * descuentoPorcentaje) / 100;
  const subtotal = (servicioSeleccionado?.precio ?? 0) + productosTotal;
  const totalConDescuento = subtotal - descuentoMonto;

  /* ================================
     RENDER
  ================================= */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-card border border-border rounded-lg shadow-md mt-10 text-gray-800">
      <h2 className="text-2xl font-semibold text-primary mb-4">
        Reservar nuevo turno
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Especialidad */}
        <div>
          <FieldLabel>Especialidad</FieldLabel>
          <select
            value={especialidadSeleccionada}
            onChange={(e) => {
              setEspecialidadSeleccionada(e.target.value);
              setServicioId(undefined);
              setEmpleadoId(undefined);
              setSelectedDate("");
              setSelectedHour(undefined);
              setBusyHours([]);
            }}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          >
            <option value="">Seleccione una especialidad</option>
            {ESPECIALIDADES.map((esp) => (
              <option key={esp} value={esp}>
                {esp}
              </option>
            ))}
          </select>
        </div>

        {/* Servicio */}
        <div>
          <FieldLabel>Servicio</FieldLabel>
          <select
            value={servicioId ?? ""}
            disabled={!especialidadSeleccionada}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined;
              setServicioId(v);
              setEmpleadoId(undefined);
              setSelectedDate("");
              setSelectedHour(undefined);
              setBusyHours([]);
            }}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          >
            <option value="">
              {especialidadSeleccionada
                ? "Seleccione un servicio"
                : "Seleccione una especialidad primero"}
            </option>

            {serviciosFiltrados.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — ${s.precio}
              </option>
            ))}
          </select>
        </div>

        {/* Empleado */}
        <div>
          <FieldLabel>Empleado</FieldLabel>
          <select
            value={empleadoId ?? ""}
            disabled={!servicioId}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined;
              setEmpleadoId(v);
              setSelectedDate("");
              setSelectedHour(undefined);
              setBusyHours([]);
            }}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          >
            <option value="">
              {!servicioId
                ? especialidadSeleccionada
                  ? "Seleccione un servicio primero"
                  : "Seleccione una especialidad primero"
                : "Seleccione un empleado"}
            </option>

            {empleadosFiltrados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} ({emp.especialidad}) — Ocupación:{" "}
                {toPercent(ocupacionPorEmpleado[emp.id] ?? 0)}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha */}
        <div>
          <FieldLabel>Fecha</FieldLabel>
          <DatePicker
            selected={selectedDate ? parseLocalDate(selectedDate) : null}
            onChange={(date: Date | null) => {
              if (date) {
                setSelectedDate(formatDateInput(date));
              } else {
                setSelectedDate("");
              }
              setSelectedHour(undefined);
              setBusyHours([]);
            }}
            locale={es}
            minDate={getMinNextAllowed()}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccione una fecha"
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
            filterDate={(date: Date) => {
              const day = date.getDay();
              return day !== 0 && day !== 6; // no fines de semana
            }}
          />
        </div>

        {/* Hora */}
        <div>
          <FieldLabel>Hora</FieldLabel>
          <select
            value={selectedHour ?? ""}
            disabled={!selectedDate || !empleadoId}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : undefined;
              setSelectedHour(value);
            }}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          >
            <option value="">
              {!selectedDate
                ? "Seleccione una fecha primero"
                : !empleadoId
                ? "Seleccione un empleado primero"
                : "Seleccione una hora"}
            </option>

            {getAvailableHoursFor(selectedDate).map((h) => {
              const ocupado = busyHours.includes(h);
              return (
                <option key={h} value={h} disabled={ocupado}>
                  {h}:00 {ocupado ? "(ocupado)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Productos */}
        <div>
          <FieldLabel>Productos (opcional)</FieldLabel>

          <div className="flex gap-2">
            <select
              value={productSelect}
              onChange={(e) =>
                setProductSelect(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              className="flex-1 border px-3 py-2 rounded-md bg-background text-gray-800"
            >
              <option value="">Seleccione un producto</option>

              {productos.map((p) => {
                const sinStock = p.stockDisponible <= 0;

                return (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={sinStock}
                    className={sinStock ? "text-gray-400" : ""}
                  >
                    {p.nombre} — ${p.precio} (
                    {sinStock
                      ? "sin stock"
                      : `Disp: ${p.stockDisponible}`}
                    )
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              disabled={productSelect === ""}
              onClick={() => {
                if (productSelect) {
                  const prod = productos.find(
                    (p) => p.id === productSelect
                  );
                  if (!prod || prod.stockDisponible <= 0) {
                    toast.error(
                      "Este producto no tiene stock disponible."
                    );
                    return;
                  }

                  setSelectedProducts((prev) => ({
                    ...prev,
                    [productSelect]: (prev[productSelect] || 0) + 1,
                  }));
                  setProductSelect("");
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-60"
            >
              Agregar
            </button>
          </div>

          {!!Object.keys(selectedProducts).length && (
            <div className="mt-3 space-y-2">
              {Object.entries(selectedProducts).map(([id, qty]) => {
                const prod = productos.find((p) => p.id === Number(id));
                if (!prod) return null;

                return (
                  <div
                    key={id}
                    className="flex justify-between items-center p-2 border rounded-md"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {prod.nombre}
                      </div>
                      <div className="text-xs">${prod.precio}</div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min={1}
                        max={prod.stockDisponible}
                        value={qty}
                        onChange={(e) =>
                          setSelectedProducts((prev) => ({
                            ...prev,
                            [prod.id]: Number(e.target.value),
                          }))
                        }
                        className="w-16 border rounded-md px-2 py-1"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProducts((prev) => {
                            const copy = { ...prev };
                            delete copy[prod.id];
                            return copy;
                          })
                        }
                        className="px-2 py-1 bg-red-500 text-white rounded-md"
                      >
                        X
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="p-3 border rounded-md space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Servicio</span>
            <span>{servicioSeleccionado?.nombre ?? "-"}</span>
          </div>

          <div className="flex justify-between">
            <span>Precio servicio</span>
            <span>
              $
              {servicioSeleccionado?.precio
                ? servicioSeleccionado.precio.toLocaleString()
                : "0"}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Productos</span>
            <span>${productosTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between">
            <span>
              Descuento{" "}
              {descuentoPorcentaje > 0
                ? `(${descuentoPorcentaje}% por ${cantidadTotalUnidades} unidad/es)`
                : ""}
            </span>
            <span>
              {descuentoPorcentaje > 0
                ? `- $${descuentoMonto.toLocaleString()}`
                : "$0"}
            </span>
          </div>

          <div className="border-t pt-2 mt-1 flex justify-between font-semibold">
            <span>Precio total</span>
            <span>${totalConDescuento.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition"
        >
          Confirmar turno
        </button>
      </form>
    </div>
  );
};

export default GenerarTurnoCliente;
