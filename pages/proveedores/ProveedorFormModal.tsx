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

  // Errores por campo
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ProveedorFormValues, string>>
  >({});

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
    setFormErrors({});
    setSubmitting(false);
  }, [initialData, open]);

  if (!open) return null;

  // =========================
  // VALIDACIONES DE CAMPOS
  // =========================
  const validarCampo = (name: keyof ProveedorFormValues, value: string) => {
    let msg = "";

    const v = (value ?? "").trim();

    if (name === "nombre") {
      if (!v) {
        msg = "El nombre es obligatorio.";
      } else if (v.length < 2) {
        msg = "El nombre debe tener al menos 2 caracteres.";
      }
    }

    if (name === "telefono") {
      if (!v) {
        msg = "";
      } else {
        // No permitir letras
        if (/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v)) {
          msg =
            "El teléfono no puede contener letras, solo números y los caracteres +, -, espacio.";
        } else {
          const soloDigitos = v.replace(/\D/g, "");
          if (soloDigitos.length < 6) {
            msg = "El teléfono debe tener al menos 6 dígitos.";
          }
        }
      }
    }

    // Email lo dejamos como opcional sin validación estricta aquí
    // (los requerimientos que mencionaste eran solo para nombre y teléfono)

    setFormErrors((prev) => ({ ...prev, [name]: msg }));
    return msg;
  };

  const validarFormulario = () => {
    const nuevosErrores: Partial<Record<keyof ProveedorFormValues, string>> = {};
    nuevosErrores.nombre = validarCampo("nombre", form.nombre ?? "");
    nuevosErrores.telefono = validarCampo("telefono", form.telefono ?? "");

    // si hay algún mensaje no vacío, el form es inválido
    const hayErrores = Object.values(nuevosErrores).some((m) => m && m.length);
    setFormErrors(nuevosErrores);
    return !hayErrores;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      setError("Corrige los errores del formulario antes de continuar.");
      return;
    }

    const nombre = form.nombre?.trim();
    const telefono = form.telefono?.trim() || "";
    const email = form.email?.trim() || "";
    const direccion = form.direccion?.trim() || "";
    const notas = form.notas?.trim() || "";

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        nombre,
        telefono: telefono || undefined,
        email: email || undefined,
        direccion: direccion || undefined,
        notas: notas || undefined,
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
          {/* NOMBRE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={form.nombre ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, nombre: value }));
                validarCampo("nombre", value);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40"
              placeholder="Ej: Productos de Belleza López"
            />
            {formErrors.nombre && (
              <p className="text-sm text-red-600 mt-1">{formErrors.nombre}</p>
            )}
          </div>

          {/* TELÉFONO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              inputMode="tel"
              value={form.telefono ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, telefono: value }));
                validarCampo("telefono", value);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40"
              placeholder="Ej: 342 4567890"
            />
            {formErrors.telefono && (
              <p className="text-sm text-red-600 mt-1">
                {formErrors.telefono}
              </p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40"
              placeholder="Ej: proveedor@mail.com"
            />
          </div>

          {/* DIRECCIÓN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={form.direccion ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, direccion: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40"
              placeholder="Ej: San Martín 1234, Santa Fe"
            />
          </div>

          {/* NOTAS */}
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
