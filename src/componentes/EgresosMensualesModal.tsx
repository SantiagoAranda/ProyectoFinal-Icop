SACAR 01 EN ADMINISTRAR EGRESOS MENSUALES 

ARCHIVO MODIFICADO EGRESOSMENSUALESMODAL

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";

interface EgresoFijo {
  id?: number;
  categoria: string;
  monto: number;
  mes: number;
  anio: number;
  subcategoria?: string | null;
  nota?: string | null;
}

interface ServicioLinea {
  subcategoria: string;
  monto: number | "";
  nota?: string;
}

interface Props {
  onClose: () => void;
}

const CATEGORIAS = ["Servicios", "Alquiler", "Sueldos", "Administrativo", "Otros"];

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const hoy = new Date();

// Normalizador para comparar subcategorías (sin tildes, minúsculas, sin espacios extra)
const normalizeSubcat = (txt: string) =>
  txt
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// ✅ Persistencia local de catálogo de subcategorías (solo servicios)
const LS_SERVICIOS_SUBCATS = "egresos_servicios_subcats_v1";
const DEFAULT_SERVICIOS_SUBCATS = ["Agua", "Luz", "Gas", "Internet", "Alquiler"];

const EgresosMensualesModal: React.FC<Props> = ({ onClose }) => {
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1);
  const [anio, setAnio] = useState<number>(hoy.getFullYear());
  const [categoria, setCategoria] = useState<string>("Servicios");

  const [monto, setMonto] = useState<number | "">("");
  const [nota, setNota] = useState<string>("");

  const [lineasServicios, setLineasServicios] = useState<ServicioLinea[]>([
    { subcategoria: "", monto: "", nota: "" },
  ]);

  const [egresosPeriodo, setEgresosPeriodo] = useState<EgresoFijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const categoriasOptions = useMemo(() => CATEGORIAS, []);

  // ✅ Catálogo administrable de subcategorías (para el select)
  const [subcatsCatalogo, setSubcatsCatalogo] = useState<string[]>(
    DEFAULT_SERVICIOS_SUBCATS
  );

  // UI: “admin” del catálogo
  const [showAdminSubcats, setShowAdminSubcats] = useState(false);
  const [nuevaSubcat, setNuevaSubcat] = useState("");

  // ✅ Cache por subcategoría: recuerda monto/nota al cambiar el select
  const [cacheServicios, setCacheServicios] = useState<
    Record<string, { monto: number | ""; nota: string }>
  >({});

  // 🔹 Subcategorías sugeridas en base a lo que ya existe en la base (SERVICIOS)
  const subcatsSugeridas = useMemo(() => {
    const set = new Set<string>();
    egresosPeriodo.forEach((e) => {
      if (
        e.categoria.toLowerCase() === "servicios" &&
        e.subcategoria &&
        e.subcategoria.trim()
      ) {
        set.add(e.subcategoria.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [egresosPeriodo]);

  // ✅ Cargar catálogo desde localStorage + merge con DB (sin duplicados)
  useEffect(() => {
    let subs = [...DEFAULT_SERVICIOS_SUBCATS];

    const raw = localStorage.getItem(LS_SERVICIOS_SUBCATS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) subs = [...subs, ...parsed];
      } catch { }
    }

    subs = [...subs, ...subcatsSugeridas];

    const uniq = Array.from(
      new Map(subs.map((x) => [normalizeSubcat(x), x.trim()])).values()
    ).sort((a, b) => a.localeCompare(b, "es"));

    setSubcatsCatalogo(uniq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcatsSugeridas.length]);

  const persistSubcats = (next: string[]) => {
    const customs = next.filter(
      (x) =>
        !DEFAULT_SERVICIOS_SUBCATS.some(
          (d) => normalizeSubcat(d) === normalizeSubcat(x)
        )
    );
    localStorage.setItem(LS_SERVICIOS_SUBCATS, JSON.stringify(customs));
  };

  const cargarEgresos = async (m: number, a: number) => {
    setLoading(true);
    try {
      const res = await api.get("/egresos", { params: { mes: m, anio: a } });
      const data = Array.isArray(res.data) ? res.data : [];
      setEgresosPeriodo(data);
      prefijarFormulario(categoria, data, m, a);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los egresos actuales");
    } finally {
      setLoading(false);
    }
  };

  const prefijarFormulario = (
    cat: string,
    data: EgresoFijo[] = egresosPeriodo,
    m: number = mes,
    a: number = anio
  ) => {
    setMes(m);
    setAnio(a);
    setCategoria(cat);

    if (cat === "Servicios") {
      const existentes = data.filter(
        (e) =>
          e.categoria.toLowerCase() === "servicios" && e.mes === m && e.anio === a
      );

      if (existentes.length) {
        const lineas: ServicioLinea[] = existentes.map((e) => ({
          subcategoria: e.subcategoria ?? "",
          monto: typeof e.monto === "number" ? e.monto : "",
          nota: e.nota ?? "",
        }));

        setLineasServicios(lineas);

        // ✅ cache inicial por subcategoría
        const nextCache: Record<string, { monto: number | ""; nota: string }> =
          {};
        lineas.forEach((l) => {
          const key = normalizeSubcat(l.subcategoria || "");
          if (!key) return;
          nextCache[key] = { monto: l.monto, nota: l.nota ?? "" };
        });
        setCacheServicios(nextCache);
      } else {
        setLineasServicios([{ subcategoria: "", monto: "", nota: "" }]);
        setCacheServicios({});
      }

      setMonto("");
      setNota("");
      return;
    }

    const match = data.find(
      (e) =>
        e.categoria.toLowerCase() === cat.toLowerCase() &&
        e.mes === m &&
        e.anio === a
    );

    setMonto(match ? match.monto : "");
    setNota(match?.nota ?? "");
  };

  useEffect(() => {
    cargarEgresos(mes, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    prefijarFormulario(categoria, egresosPeriodo, mes, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  useEffect(() => {
    cargarEgresos(mes, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio]);

  const agregarLinea = () => {
    setLineasServicios((prev) => [
      ...prev,
      { subcategoria: "", monto: "", nota: "" },
    ]);
  };

  const eliminarLinea = (index: number) => {
    setLineasServicios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSubcat = () => {
    const clean = nuevaSubcat.replace(/\s+/g, " ").trim();
    if (!clean) return toast.error("Ingrese una subcategoría.");

    const key = normalizeSubcat(clean);
    const exists = subcatsCatalogo.some((x) => normalizeSubcat(x) === key);
    if (exists) return toast.error("Esa subcategoría ya existe.");

    const next = [...subcatsCatalogo, clean].sort((a, b) =>
      a.localeCompare(b, "es")
    );
    setSubcatsCatalogo(next);
    persistSubcats(next);

    setNuevaSubcat("");
    toast.success("Subcategoría agregada.");
  };

  const handleRemoveSubcat = (name: string) => {
    const used = lineasServicios.some(
      (l) => normalizeSubcat(l.subcategoria) === normalizeSubcat(name)
    );
    if (used) {
      toast.error("No podés eliminar una subcategoría que está usada en una línea.");
      return;
    }

    const next = subcatsCatalogo.filter(
      (x) => normalizeSubcat(x) !== normalizeSubcat(name)
    );
    setSubcatsCatalogo(next);
    persistSubcats(next);
    toast.success("Subcategoría eliminada.");
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
        toast.error("El mes debe estar entre 1 y 12");
        return;
      }
      if (!Number.isInteger(anio) || anio < 2020 || anio > 3000) {
        toast.error("El año es inválido");
        return;
      }

      if (categoria === "Servicios") {
        if (!lineasServicios.length) {
          toast.error("Agregá al menos una subcategoría de Servicios");
          return;
        }

        const items: { subcategoria: string; monto: number; nota?: string }[] =
          [];
        const vistos = new Set<string>();

        lineasServicios.forEach((linea) => {
          const subcatRaw = linea.subcategoria ?? "";
          const subcategoria = subcatRaw.trim();

          if (linea.monto === "") throw new Error("El monto debe ser mayor a 0");

          const montoLinea = Number(linea.monto);
          const notaLinea = linea.nota?.trim();

          if (!subcategoria) throw new Error("La subcategoría es obligatoria");
          if (!Number.isFinite(montoLinea) || montoLinea <= 0)
            throw new Error("El monto debe ser mayor a 0");

          const key = normalizeSubcat(subcategoria);
          if (vistos.has(key)) {
            throw new Error(
              No puede haber dos líneas con la misma subcategoría ("${subcategoria}")
            );
          }
          vistos.add(key);

          items.push({
            subcategoria,
            monto: montoLinea,
            nota: notaLinea || undefined,
          });
        });

        await api.post("/egresos", { categoria, mes, anio, items });
        toast.success("Egresos de servicios actualizados");
        onClose();
        return;
      }

      if (monto === "") {
        toast.error("El monto debe ser mayor a 0");
        return;
      }

      const montoNumero = Number(monto);
      if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
        toast.error("El monto debe ser mayor a 0");
        return;
      }

      const notaTexto = nota?.trim() ?? "";
      if (categoria === "Otros" && !notaTexto) {
        toast.error("La nota es obligatoria para la categoría Otros");
        return;
      }

      await api.post("/egresos", {
        categoria,
        mes,
        anio,
        monto: montoNumero,
        nota: notaTexto || undefined,
      });

      toast.success(
        categoria === "Otros"
          ? "Gasto agregado en Otros"
          : "Egreso actualizado correctamente"
      );
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Error al actualizar los egresos");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <p className="text-gray-600">Cargando egresos...</p>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl relative">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
          Egresos Mensuales
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Administrá los egresos fijos por categoría, mes y año.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
              >
                {categoriasOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                type="number"
                min={2020}
                max={3000}
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>

          {categoria === "Servicios" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Subcategorías de Servicios
                </h3>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminSubcats((v) => !v)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Administrar
                  </button>
                  <button
                    type="button"
                    onClick={agregarLinea}
                    className="px-3 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition"
                  >
                    Agregar línea
                  </button>
                </div>
              </div>

              {showAdminSubcats && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">
                      Administrar subcategorías
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminSubcats(false);
                        setNuevaSubcat("");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaSubcat}
                      onChange={(e) => setNuevaSubcat(e.target.value)}
                      className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                      placeholder="Nueva subcategoría (ej: Seguro, Limpieza...)"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubcat}
                      className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {subcatsCatalogo.map((s) => {
                      const used = lineasServicios.some(
                        (l) =>
                          normalizeSubcat(l.subcategoria) === normalizeSubcat(s)
                      );

                      return (
                        <div
                          key={normalizeSubcat(s)}
                          className="flex items-center gap-2 px-3 py-1 rounded-full border text-sm"
                        >
                          <span className="text-gray-700">{s}</span>
                          <button
                            type="button"
                            disabled={used}
                            onClick={() => handleRemoveSubcat(s)}
                            title={
                              used
                                ? "No se puede eliminar porque está en uso"
                                : "Eliminar"
                            }
                            className={`text-xs px-2 py-0.5 rounded-full transition ${used
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                              }`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gray-500">
                    * No se puede eliminar una subcategoría si está usada en alguna línea.
                  </p>
                </div>
              )}

              {lineasServicios.map((linea, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-gray-200 p-4 rounded-xl"
                >
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategoría
                    </label>

                    {/* ✅ FIX: al cambiar de subcat, guarda/recupera monto+nota por subcategoría */}
                    <select
                      value={linea.subcategoria}
                      onChange={(e) => {
                        const nueva = e.target.value;

                        setLineasServicios((prev) => {
                          const copy = [...prev];
                          const actual = copy[index];

                          const prevKey = normalizeSubcat(
                            actual.subcategoria || ""
                          );
                          const newKey = normalizeSubcat(nueva || "");

                          setCacheServicios((old) => {
                            const next = { ...old };

                            // guardar lo actual en cache (si había previa)
                            if (prevKey) {
                              next[prevKey] = {
                                monto: actual.monto,
                                nota: actual.nota ?? "",
                              };
                            }

                            // cargar lo guardado de la nueva
                            const cached = newKey ? next[newKey] : undefined;

                            copy[index] = {
                              ...actual,
                              subcategoria: nueva,
                              monto: cached?.monto ?? "",
                              nota: cached?.nota ?? "",
                            };

                            return next;
                          });

                          return copy;
                        });
                      }}
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400 bg-white"
                    >
                      <option value="">Seleccione...</option>
                      {subcatsCatalogo.map((s) => (
                        <option key={normalizeSubcat(s)} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto
                    </label>

                    {/* ✅ FIX: borrar -> "" (no 0) */}
                    <input
                      type="number"
                      min={0}
                      value={linea.monto}
                      onInput={(e) => {
                        const input = e.target as HTMLInputElement;
                        let v = input.value;
                        // Remover ceros al inicio excepto si es "0" solo o decimal
                        if (v.length > 1 && v.startsWith("0") && v[1] !== ".") {
                          v = v.replace(/^0+/, '') || "0";
                          input.value = v; // Forzar actualización del input
                        }
                        setLineasServicios((prev) =>
                          prev.map((p, i) =>
                            i === index
                              ? { ...p, monto: v === "" ? "" : Number(v) }
                              : p
                          )
                        );
                      }}
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nota (opcional)
                    </label>
                    <input
                      type="text"
                      value={linea.nota ?? ""}
                      onChange={(e) =>
                        setLineasServicios((prev) =>
                          prev.map((p, i) =>
                            i === index
                              ? { ...p, nota: e.target.value }
                              : p
                          )
                        )
                      }
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                      placeholder="Detalle adicional"
                    />
                  </div>

                  {lineasServicios.length > 1 && (
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => eliminarLinea(index)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>

                {/* ✅ FIX: borrar -> "" (no 0) */}
                <input
                  type="number"
                  min={0}
                  value={monto}
                  onInput={(e) => {
                    const input = e.target as HTMLInputElement;
                    let v = input.value;
                    // Remover ceros al inicio excepto si es "0" solo o decimal
                    if (v.length > 1 && v.startsWith("0") && v[1] !== ".") {
                      v = v.replace(/^0+/, '') || "0";
                      input.value = v; // Forzar actualización del input
                    }
                    setMonto(v === "" ? "" : Number(v));
                  }}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota{" "}
                  {categoria === "Otros" && (
                    <span className="text-pink-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                  placeholder={
                    categoria === "Otros"
                      ? "Descripción del gasto imprevisto"
                      : "Opcional"
                  }
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-white shadow ${saving
                ? "bg-pink-300 cursor-not-allowed"
                : "bg-pink-500 hover:bg-pink-600"
                } transition`}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EgresosMensualesModal;