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

const EgresosMensualesModal: React.FC<Props> = ({ onClose }) => {
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1);
  const [anio, setAnio] = useState<number>(hoy.getFullYear());
  const [categoria, setCategoria] = useState<string>("Servicios");

  const [monto, setMonto] = useState<number | "">("");
  const [nota, setNota] = useState<string>("");
  const [lineasServicios, setLineasServicios] = useState<ServicioLinea[]>([
    { subcategoria: "", monto: 0, nota: "" },
  ]);

  const [egresosPeriodo, setEgresosPeriodo] = useState<EgresoFijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const categoriasOptions = useMemo(() => CATEGORIAS, []);

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
          e.categoria.toLowerCase() === "servicios" &&
          e.mes === m &&
          e.anio === a
      );
      if (existentes.length) {
        setLineasServicios(
          existentes.map((e) => ({
            subcategoria: e.subcategoria ?? "",
            monto: e.monto,
            nota: e.nota ?? "",
          }))
        );
      } else {
        setLineasServicios([{ subcategoria: "", monto: 0, nota: "" }]);
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
    setMonto(match?.monto ?? 0);
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
    setLineasServicios((prev) => [...prev, { subcategoria: "", monto: 0, nota: "" }]);
  };

  const eliminarLinea = (index: number) => {
    setLineasServicios((prev) => prev.filter((_, i) => i !== index));
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

        const items = lineasServicios.map((linea, index) => {
          const subcategoria = linea.subcategoria?.trim();
          const montoLinea = Number(linea.monto);
          const notaLinea = linea.nota?.trim();
          if (!subcategoria) {
            throw new Error(`La subcategoría es obligatoria (fila ${index + 1})`);
          }
          if (!Number.isFinite(montoLinea) || montoLinea <= 0) {
            throw new Error(`El monto debe ser mayor a 0 en "${subcategoria}"`);
          }
          return { subcategoria, monto: montoLinea, nota: notaLinea || undefined };
        });

        await api.post("/egresos", { categoria, mes, anio, items });
        toast.success("Egresos de servicios actualizados");
        onClose();
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
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
                <button
                  type="button"
                  onClick={agregarLinea}
                  className="px-3 py-2 bg-pink-500 text-white rounded-lg shadow hover:bg-pink-600 transition"
                >
                  Agregar línea
                </button>
              </div>

              {lineasServicios.map((linea, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-gray-200 p-4 rounded-xl"
                >
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategoría
                    </label>
                    <input
                      type="text"
                      value={linea.subcategoria}
                      onChange={(e) =>
                        setLineasServicios((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, subcategoria: e.target.value } : p
                          )
                        )
                      }
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                      placeholder="Luz, Agua, Internet..."
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={linea.monto}
                      onChange={(e) =>
                        setLineasServicios((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, monto: Number(e.target.value) } : p
                          )
                        )
                      }
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
                            i === index ? { ...p, nota: e.target.value } : p
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
                <input
                  type="number"
                  min={0}
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota {categoria === "Otros" && <span className="text-pink-500">*</span>}
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
              className={`px-4 py-2 rounded-lg text-white shadow ${
                saving
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
