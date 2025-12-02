import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../src/lib/api";
import {
  ProveedorDetalle,
  ProductoProveedor,
  ProductoListado,
} from "./types";

interface Props {
  proveedorId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const ProveedorProductosPanel: React.FC<Props> = ({
  proveedorId,
  onClose,
  onUpdated,
}) => {
  const [detalle, setDetalle] = useState<ProveedorDetalle | null>(null);
  const [productos, setProductos] = useState<ProductoListado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seleccionProductoId, setSeleccionProductoId] = useState<number | "">(
    ""
  );
  const [costoNuevo, setCostoNuevo] = useState<string>("");
  const [costosEdicion, setCostosEdicion] = useState<Record<number, string>>(
    {}
  );

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [proveedorRes, productosRes] = await Promise.all([
        api.get(`/proveedores/${proveedorId}`),
        api.get("/productos"),
      ]);
      setDetalle(proveedorRes.data);
      setProductos(productosRes.data);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Error al obtener los productos del proveedor"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [proveedorId]);

  const productosDelProveedor = useMemo(
    () => detalle?.productos ?? [],
    [detalle]
  );

  const productosOpciones = useMemo(() => {
    return productos
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((p) => ({
        ...p,
        etiqueta: `${p.nombre} — $${p.precio.toLocaleString("es-AR")} ${
          p.proveedor
            ? `(Proveedor: ${p.proveedor.nombre})`
            : "(Sin proveedor)"
        }`,
      }));
  }, [productos]);

  const margenDeProducto = (p: ProductoProveedor) => {
    if (!p.costoCompra || p.costoCompra <= 0 || !p.precio) return null;
    const margen = ((p.precio - p.costoCompra) / p.precio) * 100;
    return Number.isFinite(margen) ? margen : null;
  };

  const refrescar = async () => {
    await cargarDatos();
    onUpdated();
  };

  const asignarProducto = async () => {
    if (!seleccionProductoId) {
      toast.error("Selecciona un producto");
      return;
    }
    const costo = Number(costoNuevo);
    if (!Number.isFinite(costo) || costo <= 0) {
      toast.error("Ingresa un costo de compra válido");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/productos/${seleccionProductoId}/proveedor`, {
        proveedorId,
        costoCompra: costo,
      });
      toast.success("Producto asignado al proveedor");
      setSeleccionProductoId("");
      setCostoNuevo("");
      refrescar();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || "Error al asignar producto";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const actualizarCosto = async (productoId: number) => {
    const costo = Number(costosEdicion[productoId] ?? "");
    if (!Number.isFinite(costo) || costo <= 0) {
      toast.error("Ingresa un costo de compra válido");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/productos/${productoId}/proveedor`, {
        proveedorId,
        costoCompra: costo,
      });
      toast.success("Costo actualizado");
      setCostosEdicion((prev) => ({ ...prev, [productoId]: "" }));
      refrescar();
    } catch (error: any) {
      console.error(error);
      const msg =
        error?.response?.data?.message || "Error al actualizar el costo";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const quitarProveedor = async (productoId: number) => {
    setSaving(true);
    try {
      await api.put(`/productos/${productoId}/quitar-proveedor`);
      toast.success("Proveedor quitado del producto");
      refrescar();
    } catch (error: any) {
      console.error(error);
      const msg =
        error?.response?.data?.message || "Error al quitar proveedor";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-white">
        Cargando productos del proveedor...
      </div>
    );
  }

  if (!detalle) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">Proveedor</p>
            <h3 className="text-2xl font-semibold text-primary">
              {detalle.nombre}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-primary/80">Productos asignados</p>
            <p className="text-2xl font-bold text-primary">
              {productosDelProveedor.length}
            </p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium text-gray-800">
              {detalle.email || "—"}
            </p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-sm text-gray-500">Teléfono</p>
            <p className="text-base font-medium text-gray-800">
              {detalle.telefono || "—"}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">
            Asignar producto al proveedor
          </h4>
          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7">
              <label className="text-sm text-gray-600 mb-1 block">
                Producto
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={seleccionProductoId}
                onChange={(e) =>
                  setSeleccionProductoId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              >
                <option value="">Seleccionar producto</option>
                {productosOpciones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm text-gray-600 mb-1 block">
                Costo compra
              </label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2"
                value={costoNuevo}
                onChange={(e) => setCostoNuevo(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex">
              <button
                onClick={asignarProducto}
                disabled={saving}
                className="w-full h-[42px] bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
              >
                Asignar
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Puedes reasignar productos aunque ya tengan otro proveedor; se
            actualizará la relación y el costo de compra.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-gray-800">
              Productos del proveedor
            </h4>
            <span className="text-sm text-gray-500">
              Actualiza el costo o quita la relación
            </span>
          </div>

          {productosDelProveedor.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Este proveedor todavía no tiene productos asignados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600">
                    <th className="p-2">Producto</th>
                    <th className="p-2">Precio venta</th>
                    <th className="p-2">Costo compra</th>
                    <th className="p-2">Margen</th>
                    <th className="p-2 w-48">Actualizar costo</th>
                    <th className="p-2 w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productosDelProveedor.map((p) => {
                    const margen = margenDeProducto(p);
                    const costoActual = costosEdicion[p.id] ?? p.costoCompra ?? "";
                    return (
                      <tr key={p.id} className="align-middle">
                        <td className="p-2 font-medium text-gray-800">
                          {p.nombre}
                        </td>
                        <td className="p-2">${p.precio.toLocaleString("es-AR")}</td>
                        <td className="p-2">
                          {p.costoCompra
                            ? `$${p.costoCompra.toLocaleString("es-AR")}`
                            : "—"}
                        </td>
                        <td className="p-2">
                          {margen !== null ? `${margen.toFixed(1)}%` : "—"}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              className="w-28 border rounded px-2 py-1"
                              value={costoActual}
                              onChange={(e) =>
                                setCostosEdicion((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              onClick={() => actualizarCosto(p.id)}
                              disabled={saving}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                            >
                              Guardar
                            </button>
                          </div>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => quitarProveedor(p.id)}
                            disabled={saving}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProveedorProductosPanel;
