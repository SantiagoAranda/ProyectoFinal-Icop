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
      } else if (v.length < 6) {
        msg = "El nombre debe tener al menos 6 caracteres.";
      }
    }

    if (name === "telefono") {
      if (!v) {
        msg = "El teléfono es obligatorio.";
      } else {
        // No permitir letras
        if (/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v)) {
          msg =
            "El teléfono no puede contener letras, solo números y los caracteres +, -, espacio.";
        } else {
          const soloDigitos = v.replace(/\D/g, "");
          if (soloDigitos.length < 12) {
            msg = "El teléfono debe tener al menos 12 dígitos.";
          }
        }
      }
    }

    if (name === "email") {
      if (!v) {
        msg = "El email es obligatorio.";
      } else {
        const tieneArroba = v.includes("@");
        const terminaEnCom = v.toLowerCase().endsWith(".com");
        if (!tieneArroba || !terminaEnCom) {
          msg = "El email debe ser válido y terminar en .com.";
        }
      }
    }

    if (name === "direccion") {
      if (!v) {
        msg = "La dirección es obligatoria.";
      } else if (v.length < 3) {
        msg = "La dirección debe tener al menos 3 caracteres.";
      }
    }

    setFormErrors((prev) => ({ ...prev, [name]: msg }));
    return msg;
  };

  const validarFormulario = () => {
    const nuevosErrores: Partial<Record<keyof ProveedorFormValues, string>> = {};

    nuevosErrores.nombre = validarCampo("nombre", form.nombre ?? "");
    nuevosErrores.telefono = validarCampo("telefono", form.telefono ?? "");
    nuevosErrores.email = validarCampo("email", form.email ?? "");
    nuevosErrores.direccion = validarCampo("direccion", form.direccion ?? "");

    const hayErrores = Object.values(nuevosErrores).some(
      (m) => m && m.length > 0
    );
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
        telefono,
        email,
        direccion,
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
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40 ${
                formErrors.nombre ? "border-red-400" : "border-gray-200"
              }`}
              placeholder="Ej: Productos de Belleza López"
            />
            {formErrors.nombre && (
              <p className="text-sm text-red-600 mt-1">{formErrors.nombre}</p>
            )}
          </div>

          {/* TELÉFONO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
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
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40 ${
                formErrors.telefono ? "border-red-400" : "border-gray-200"
              }`}
              placeholder="Ej: +54 342 456789012"
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
              Email *
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, email: value }));
                validarCampo("email", value);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40 ${
                formErrors.email ? "border-red-400" : "border-gray-200"
              }`}
              placeholder="Ej: proveedor@mail.com"
            />
            {formErrors.email && (
              <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
            )}
          </div>

          {/* DIRECCIÓN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección *
            </label>
            <input
              type="text"
              value={form.direccion ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, direccion: value }));
                validarCampo("direccion", value);
              }}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/40 ${
                formErrors.direccion ? "border-red-400" : "border-gray-200"
              }`}
              placeholder="Ej: San Martín 1234, Santa Fe"
            />
            {formErrors.direccion && (
              <p className="text-sm text-red-600 mt-1">
                {formErrors.direccion}
              </p>
            )}
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
