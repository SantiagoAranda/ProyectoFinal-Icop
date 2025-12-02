import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";

interface Egreso {
  id?: number;
  categoria: string;
  monto: number;
}

interface Props {
  onClose: () => void;
}

const EgresosMensualesModal: React.FC<Props> = ({ onClose }) => {
  const [egresos, setEgresos] = useState<Egreso[]>([
    { categoria: "Alquiler", monto: 0 },
    { categoria: "Sueldos", monto: 0 },
    { categoria: "Administrativo", monto: 0 },
    { categoria: "Gastos varios", monto: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // === Cargar datos actuales ===
  useEffect(() => {
    api
      .get("/egresos")
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setEgresos((prev) =>
            prev.map((e) => {
              const found = data.find(
                (d: any) =>
                  d.categoria.toLowerCase() === e.categoria.toLowerCase()
              );
              return found ? { ...e, id: found.id, monto: found.monto } : e;
            })
          );
        }
      })
      .catch(() => toast.error("Error al cargar los egresos actuales"))
      .finally(() => setLoading(false));
  }, []);

  // === Guardar cambios ===
  const handleSave = async () => {
    try {
      setSaving(true);
      for (const egreso of egresos) {
        await api.post("/egresos", {
          categoria: egreso.categoria,
          monto: egreso.monto,
        });
      }
      toast.success("Egresos actualizados correctamente");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar los egresos");
    } finally {
      setSaving(false);
    }
  };

  // === Render ===
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
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
          Egresos Mensuales
        </h2>

        <p className="text-gray-500 text-center mb-6">
          Modificá los montos mensuales según corresponda.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4"
        >
          {egresos.map((egreso, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {egreso.categoria}
              </label>
              <input
                type="number"
                min={0}
                value={egreso.monto}
                onChange={(e) => {
                  const nuevoValor = Number(e.target.value);
                  setEgresos((prev) =>
                    prev.map((p, i) =>
                      i === index ? { ...p, monto: nuevoValor } : p
                    )
                  );
                }}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-pink-400"
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
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
