import React, { useEffect, useState } from "react";
import { Proveedor, ProveedorFormValues } from "./types";

interface Props {
  open: boolean;
  initialData?: Proveedor | null;
  onClose: () => void;
  onSubmit: (values: ProveedorFormValues) => Promise<void>;
}

const emptyForm: ProveedorFormValues = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  notas: "",
};

const ProveedorFormModal: React.FC<Props> = ({
  open,
  initialData,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<ProveedorFormValues>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre ?? "",
        telefono: initialData.telefono ?? "",
        email: initialData.email ?? "",
        direccion: initialData.direccion ?? "",
        notas: initialData.notas ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
    setSubmitting(false);
  }, [initialData, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = form.nombre?.trim();

    if (!nombre) {
      setError("El nombre es obligatorio");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        nombre,
        telefono: form.telefono?.trim() || undefined,
        email: form.email?.trim() || undefined,
        direccion: form.direccion?.trim() || undefined,
        notas: form.notas?.trim() || undefined,
      });
    } catch {
      // el error se maneja en el padre via toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary">
            {initialData ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "nombre", label: "Nombre *", type: "text" },
            { name: "telefono", label: "Teléfono", type: "text" },
            { name: "email", label: "Email", type: "email" },
            { name: "direccion", label: "Dirección", type: "text" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type={field.type}
                value={(form as any)[field.name] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={form.notas ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notas: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40"
              rows={3}
              placeholder="Información adicional, condiciones comerciales, etc."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProveedorFormModal;
