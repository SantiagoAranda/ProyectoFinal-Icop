import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";

interface Proveedor {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion?: string | null;
  notas?: string | null;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  stockPendiente: number;
  stockDisponible: number;
  marca?: string | null;
  costoCompra: number | null;
  proveedorId: number | null;
}

interface Props {
  proveedor: Proveedor;
  onClose: () => void;
}

const ProveedorProductosPanel: React.FC<Props> = ({ proveedor, onClose }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);

  const [productoIdSeleccionado, setProductoIdSeleccionado] = useState<
    number | ""
  >("");
  const [costoCompra, setCostoCompra] = useState<string>("");

  const [asignando, setAsignando] = useState(false);

  /* ============================================================
     Cargar todos los productos
  ============================================================ */
  const cargarProductos = async () => {
    try {
      setLoading(true);
      const res = await api.get<Producto[]>("/productos");
      setProductos(res.data);
    } catch (err: any) {
      console.error("Error cargando productos:", err);
      toast.error("Error cargando productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  /* ============================================================
     Productos del proveedor (filtrados)
  ============================================================ */
  const productosDelProveedor = useMemo(
    () => productos.filter((p) => p.proveedorId === proveedor.id),
    [productos, proveedor.id]
  );

  const cantidadProductosAsignados = productosDelProveedor.length;

  /* ============================================================
     Lista para el select de productos
     (por ahora mostramos todos)
  ============================================================ */
  const productosParaSelect = useMemo(() => productos, [productos]);

  /* ============================================================
     Asignar producto al proveedor
     🔴 Ajustá el endpoint si en tu backend se llama distinto
  ============================================================ */
  const handleAsignarProducto = async () => {
    if (!productoIdSeleccionado) {
      toast.error("Selecciona un producto.");
      return;
    }

    const costoNumber = Number(costoCompra);
    if (isNaN(costoNumber) || costoNumber <= 0) {
      toast.error("Ingresa un costo de compra válido.");
      return;
    }

    try {
      setAsignando(true);

      // ⬇️ Usa el endpoint que ya tengas para asignar producto a proveedor
      await api.post("/productos/asignar-proveedor", {
        productoId: productoIdSeleccionado,
        proveedorId: proveedor.id,
        costoCompra: costoNumber,
      });

      toast.success("Producto asignado correctamente.");
      setCostoCompra("");
      setProductoIdSeleccionado("");

      await cargarProductos();
    } catch (err: any) {
      console.error("Error asignando producto al proveedor:", err);
      const msg =
        err?.response?.data?.message ||
        "Error asignando producto al proveedor.";
      toast.error(msg);
    } finally {
      setAsignando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-pink-500 font-semibold">
              Proveedor
            </p>
            <h2 className="text-xl font-semibold text-gray-800">
              {proveedor.nombre}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="px-6 py-5 overflow-y-auto space-y-6">
          {/* Resumen / datos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-pink-50 rounded-2xl p-4 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wide text-pink-500 font-semibold">
                Productos asignados
              </p>
              <p className="text-3xl font-semibold text-pink-600">
                {cantidadProductosAsignados}
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-1 text-sm text-gray-700">
              <p className="font-medium">Email</p>
              <p>{proveedor.email || "—"}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-1 text-sm text-gray-700">
              <p className="font-medium">Teléfono</p>
              <p>{proveedor.telefono || "—"}</p>
            </div>
          </div>

          {/* Asignar producto */}
          <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-800">
              Asignar producto al proveedor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-center">
              {/* Select producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <select
                  value={productoIdSeleccionado}
                  onChange={(e) =>
                    setProductoIdSeleccionado(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                >
                  <option value="">Seleccionar producto</option>
                  {productosParaSelect.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre} (stock: {prod.stockDisponible})
                    </option>
                  ))}
                </select>
              </div>

              {/* Costo compra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo compra
                </label>
                <input
                  type="number"
                  value={costoCompra}
                  onChange={(e) => setCostoCompra(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                  placeholder="Ej: 15000"
                  min={0}
                />
              </div>

              {/* Botón asignar */}
              <div className="flex items-end">
                <button
                  onClick={handleAsignarProducto}
                  disabled={asignando}
                  className="w-full md:w-auto px-6 py-2.5 rounded-full text-sm font-semibold bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {asignando ? "Asignando..." : "Asignar"}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Puedes reasignar productos aunque ya tengan otro proveedor; se
              actualizará la relación y el costo de compra.
            </p>
          </section>

          {/* Lista de productos del proveedor */}
          <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                Productos del proveedor
              </h3>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Cargando productos...</p>
            ) : productosDelProveedor.length === 0 ? (
              <p className="text-sm text-gray-500">
                Este proveedor todavía no tiene productos asignados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        Producto
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        Marca
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">
                        Costo compra
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">
                        Stock disp.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosDelProveedor.map((prod) => (
                      <tr key={prod.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">
                            {prod.nombre}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {prod.marca || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {prod.costoCompra
                            ? `$${prod.costoCompra.toLocaleString("es-AR")}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {prod.stockDisponible}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProveedorProductosPanel;
