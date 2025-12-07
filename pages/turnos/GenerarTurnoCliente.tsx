import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useUser } from "../../src/context/UserContext.tsx";

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
  servicio?: { id: number; duracion?: number };
  estado?: string;
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

const validarFechaObject = (fecha: Date) => {
  if (isNaN(fecha.getTime())) return { ok: false, msg: "Fecha inválida." };
  if (fecha.getMinutes() !== 0) return { ok: false, msg: "Sólo horas en punto." };
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

  const minAllowed = getMinNextAllowed();
  const date = new Date(dateStr + "T00:00:00");
  const minDateStr = formatDateInput(minAllowed);

  const hours: number[] = [];
  for (let h = HOURS_MIN; h <= HOURS_MAX; h++) hours.push(h);

  // Si es hoy → limitar horas previas
  if (dateStr === minDateStr) {
    return hours.filter((h) => h >= minAllowed.getHours());
  }

  // Evitar días anteriores al permitido
  if (date < new Date(minDateStr + "T00:00:00")) return [];

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
// ejemplo: "Peluquero", "Peluqueria", "peluquería unisex" → "pelu"
//          "Masajista", "Masajes" → "masajes"
const getEspKey = (raw?: string | null): string => {
  if (!raw) return "";
  const t = normalizeText(raw);

  if (t.includes("pelu")) return "pelu";
  if (t.includes("una")) return "unas"; // uñas
  if (t.includes("masaj") || t.includes("masaje")) return "masajes";
  if (t.includes("depil")) return "depil";

  return t; // fallback: texto completo
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

  /* === Estados principales === */
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState("");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [empleadoId, setEmpleadoId] = useState<number>();
  const [servicioId, setServicioId] = useState<number>();
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState<number>();
  const [productSelect, setProductSelect] = useState<number | "">("");

  const [busyHours, setBusyHours] = useState<number[]>([]);
  const [ocupacionPorEmpleado, setOcupacionPorEmpleado] = useState<Record<number, number>>({});
  const minDateInput = getMinDateInput();

  /* ================================
     FETCH INICIAL
  ================================= */
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

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
     Filtrados
  ================================= */
  // servicios según la especialidad elegida (mapeada por getEspKey)
  const serviciosFiltrados = useMemo(() => {
    if (!especialidadSeleccionada) return [];

    const targetKey = getEspKey(especialidadSeleccionada);

    return servicios.filter((s) => getEspKey(s.especialidad) === targetKey);
  }, [especialidadSeleccionada, servicios]);

  // empleados según la especialidad del servicio elegido
  const empleadosFiltrados = useMemo(() => {
    const serv = servicios.find((s) => s.id === servicioId);
    const servKey = getEspKey(serv?.especialidad);

    if (!servKey) return [];

    return empleados.filter((e) => getEspKey(e.especialidad) === servKey);
  }, [servicioId, empleados, servicios]);

  /* ================================
     Horas disponibles + ocupación
  ================================= */
  useEffect(() => {
    if (!selectedDate) return;

    const loadBusy = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const turnos = await api.get<TurnoBackend[]>("/turnos", { headers });

        const hoursSet = new Set<number>();
        const mapSlots: Record<number, number> = {};

        turnos.data.forEach((t) => {
          if (t.estado?.toLowerCase() === "cancelado") return;

          const d = new Date(t.fechaHora);
          if (formatDateInput(d) !== selectedDate) return;

          const dur = t.servicio?.duracion ?? 1;
          const base = d.getHours();

          if (empleadoId && t.empleadoId === empleadoId) {
            for (let i = 0; i < dur; i++) hoursSet.add(base + i);
          }

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

    if (!servicioId)
      return toast.error("Seleccione un servicio");

    if (!empleadoId)
      return toast.error("Seleccione un empleado");

    if (!selectedDate)
      return toast.error("Seleccione una fecha");

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
          productos: Object.entries(selectedProducts).map(([pid, qty]) => ({
            productoId: Number(pid),
            cantidad: Number(qty),
          })),
        },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      toast.success("Turno reservado con éxito 🎉");

      // reset
      setEspecialidadSeleccionada("");
      setServicioId(undefined);
      setEmpleadoId(undefined);
      setSelectedDate("");
      setSelectedHour(undefined);
      setSelectedProducts({});
      setBusyHours([]);
    } catch {
      toast.error("Error al reservar turno");
    }
  };

  /* ================================
     RENDER
  ================================= */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-card border border-border rounded-lg shadow-md mt-10 text-gray-800">
      <h2 className="text-2xl font-semibold text-primary mb-4">Reservar nuevo turno</h2>

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
            onChange={(e) => setEmpleadoId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          >
            <option value="">
              {servicioId
                ? "Seleccione un empleado"
                : especialidadSeleccionada
                ? "Seleccione un servicio primero"
                : "Seleccione una especialidad primero"}
            </option>

            {empleadosFiltrados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} ({emp.especialidad}) —{" "}
                {toPercent(ocupacionPorEmpleado[emp.id] ?? 0)}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha */}
        <div>
          <FieldLabel>Fecha</FieldLabel>
          <input
            type="date"
            value={selectedDate}
            min={minDateInput}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedHour(undefined);
            }}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          />
        </div>

        {/* Hora */}
        <div>
          <FieldLabel>Hora</FieldLabel>
          <select
            value={selectedHour ?? ""}
            disabled={!selectedDate}
            onChange={(e) => setSelectedHour(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border px-3 py-2 rounded-md bg-background text-gray-800"
          >
            <option value="">
              {!selectedDate
                ? "Seleccione una fecha primero"
                : "Seleccione una hora"}
            </option>

            {getAvailableHoursFor(selectedDate).map((h) => (
              <option key={h} value={h} disabled={busyHours.includes(h)}>
                {h}:00 {busyHours.includes(h) ? "(ocupado)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Productos */}
        <div>
          <FieldLabel>Productos (opcional)</FieldLabel>

          <div className="flex gap-2">
            <select
              value={productSelect}
              onChange={(e) =>
                setProductSelect(e.target.value ? Number(e.target.value) : "")
              }
              className="flex-1 border px-3 py-2 rounded-md bg-background text-gray-800"
            >
              <option value="">Seleccione un producto</option>

              {productos
                .filter((p) => p.stockDisponible > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — ${p.precio} (Disp: {p.stockDisponible})
                  </option>
                ))}
            </select>

            <button
              type="button"
              disabled={productSelect === ""}
              onClick={() => {
                if (productSelect) {
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
                      <div className="text-sm font-medium">{prod.nombre}</div>
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
        <div className="p-3 border rounded-md space-y-2">
          <div className="flex justify-between">
            <span>Servicio</span>
            <span>{servicios.find((s) => s.id === servicioId)?.nombre ?? "-"}</span>
          </div>

          <div className="flex justify-between">
            <span>Precio servicio</span>
            <span>
              $
              {servicios.find((s) => s.id === servicioId)?.precio?.toLocaleString() ??
                "0"}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Productos</span>
            <span>
              $
              {Object.entries(selectedProducts)
                .reduce((sum, [id, qty]) => {
                  const prod = productos.find((p) => p.id === Number(id));
                  return sum + (prod ? prod.precio * qty : 0);
                }, 0)
                .toLocaleString()}
            </span>
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
