import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../src/lib/api";
import ProveedorFormModal from "./ProveedorFormModal";
import ProveedorProductosPanel from "./ProveedorProductosPanel";
import { Proveedor, ProveedorFormValues } from "./types";

/* ============================================================
   🔔 CONFIRMACIÓN CON TOASTIFY
============================================================ */
const toastConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast(
      ({ closeToast }) => (
        <div className="px-1 py-1">
          <p className="mb-3 text-sm">{message}</p>

          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-300 rounded-lg text-sm hover:bg-gray-400 transition"
              onClick={() => {
                resolve(false);
                closeToast();
              }}
            >
              Cancelar
            </button>

            <button
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
              onClick={() => {
                resolve(true);
                closeToast();
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      ),
      {
        closeOnClick: false,
        autoClose: false,
      }
    );
  });
};

const DashboardProveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(
    null
  );
  const [proveedorEnGestion, setProveedorEnGestion] =
    useState<Proveedor | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      const res = await api.get("/proveedores", {
        headers: getAuthHeaders(),
      });
      setProveedores(res.data);
    } catch (error: any) {
      console.error(error);
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("No estás autorizado para ver proveedores (401/403).");
      } else {
        const msg =
          error?.response?.data?.message ||
          "Error al cargar los proveedores";
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const handleGuardar = async (data: ProveedorFormValues) => {
    try {
      if (proveedorEditando) {
        await api.put(`/proveedores/${proveedorEditando.id}`, data, {
          headers: getAuthHeaders(),
        });
        toast.success("Proveedor actualizado");
      } else {
        await api.post("/proveedores", data, {
          headers: getAuthHeaders(),
        });
        toast.success("Proveedor creado");
      }
      setShowForm(false);
      setProveedorEditando(null);
      cargarProveedores();
    } catch (error: any) {
      console.error(error);
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("No estás autorizado para gestionar proveedores.");
      } else {
        const msg =
          error?.response?.data?.message ||
          "Error al guardar el proveedor";
        toast.error(msg);
      }
      throw error;
    }
  };

  /* ============================================================
       🔥 ELIMINAR PROVEEDOR — AHORA CON TOASTIFY
  ============================================================ */
  const handleEliminar = async (prov: Proveedor) => {
    const confirmado = await toastConfirm(
      `¿Eliminar al proveedor "${prov.nombre}"?
Esta acción puede fallar si tiene productos o compras asociadas.`
    );

    if (!confirmado) return;

    try {
      await api.delete(`/proveedores/${prov.id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Proveedor eliminado");
      cargarProveedores();
    } catch (error: any) {
      console.error(error);
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("No estás autorizado para eliminar proveedores.");
      } else {
        const msg =
          error?.response?.data?.message ||
          "No se pudo eliminar el proveedor. Verifica si tiene productos o compras asociadas.";
        toast.error(msg);
      }
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Cargando proveedores...</p>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Administración</p>
          <h1 className="text-3xl font-bold text-primary">
            Gestión de proveedores
          </h1>
        </div>
        <button
          onClick={() => {
            setProveedorEditando(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark"
        >
          + Nuevo proveedor
        </button>
      </div>

      {proveedores.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-600">
            Aún no hay proveedores cargados. Agrega el primero para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {proveedores.map((prov) => (
            <div
              key={prov.id}
              className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs text-gray-500">Proveedor</p>
                  <h3 className="text-xl font-semibold text-primary">
                    {prov.nombre}
                  </h3>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {prov._count?.productos ?? 0} productos
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-700 mb-3">
                <p>
                  <span className="text-gray-500">Email:</span>{" "}
                  {prov.email || "—"}
                </p>
                <p>
                  <span className="text-gray-500">Teléfono:</span>{" "}
                  {prov.telefono || "—"}
                </p>
                <p>
                  <span className="text-gray-500">Dirección:</span>{" "}
                  {prov.direccion || "—"}
                </p>
                {prov.notas && (
                  <p className="text-gray-600 text-xs bg-gray-50 border rounded-lg p-2">
                    {prov.notas}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setProveedorEditando(prov);
                    setShowForm(true);
                  }}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(prov)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setProveedorEnGestion(prov)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm"
                >
                  Gestionar productos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProveedorFormModal
        open={showForm}
        initialData={proveedorEditando}
        onClose={() => {
          setShowForm(false);
          setProveedorEditando(null);
        }}
        onSubmit={handleGuardar}
      />

      {proveedorEnGestion && (
        <ProveedorProductosPanel
          proveedor={proveedorEnGestion}
          onClose={() => {
            setProveedorEnGestion(null);
            cargarProveedores();
          }}
        />
      )}
    </div>
  );
};

export default DashboardProveedores;
