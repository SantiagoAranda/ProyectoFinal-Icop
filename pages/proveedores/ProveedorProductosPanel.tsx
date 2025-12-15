import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../src/lib/api";

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
  proveedor?: {
    id: number;
    nombre: string;
  };
}

interface Props {
  proveedor: Proveedor;
  onClose: () => void;
}

/* ============================================================
   🔔 CONFIRMACIÓN CON TOASTIFY (sin alert, sin confirm)
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
              className="px-3 py-1 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition"
              onClick={() => {
                resolve(true);
                closeToast();
              }}
            >
              Reasignar
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

const ProveedorProductosPanel: React.FC<Props> = ({ proveedor, onClose }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);

  const [productoIdSeleccionado, setProductoIdSeleccionado] = useState<number | "">("");
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

  const productosParaSelect = useMemo(() => productos, [productos]);

  /* ============================================================
     Asignar producto al proveedor
  ============================================================ */
  const handleAsignarProducto = async () => {
    if (!productoIdSeleccionado) {
      toast.error("Selecciona un producto.");
      return;
    }

    const productoSeleccionado = productos.find(
      (p) => p.id === productoIdSeleccionado
    );

    if (!productoSeleccionado) {
      toast.error("No se encontró el producto seleccionado.");
      return;
    }

    /* ============================================================
       🚨 Confirmación si el producto YA tiene proveedor distinto
    ============================================================ */
    if (
      productoSeleccionado.proveedorId &&
      productoSeleccionado.proveedorId !== proveedor.id
    ) {
      const nombreProvActual =
        productoSeleccionado.proveedor?.nombre || "otro proveedor";

      const continuar = await toastConfirm(
        `Este producto ya está asignado al proveedor "${nombreProvActual}". 
Si continuás, será reasignado al proveedor "${proveedor.nombre}".`
      );

      if (!continuar) return;
    }

    const costoNumber = Number(costoCompra);
    if (isNaN(costoNumber) || costoNumber <= 0) {
      toast.error("Ingresa un costo de compra válido.");
      return;
    }

    try {
      setAsignando(true);

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
      console.error("Error asignando producto:", err);
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
          <div>
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

        <div className="px-6 py-5 overflow-y-auto space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-pink-50 rounded-2xl p-4 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wide text-pink-500 font-semibold">
                Productos asignados
              </p>
              <p className="text-3xl font-semibold text-pink-600">
                {cantidadProductosAsignados}
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="font-medium text-sm">Email</p>
              <p className="text-sm text-gray-700">{proveedor.email || "—"}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="font-medium text-sm">Teléfono</p>
              <p className="text-sm text-gray-700">{proveedor.telefono || "—"}</p>
            </div>
          </div>

          {/* Asignar producto */}
          <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-800">
              Asignar producto al proveedor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-center">
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
                  className="w-full rounded-xl border-gray-300 px-3 py-2 text-sm focus:ring-pink-400 focus:border-pink-400"
                >
                  <option value="">Seleccionar producto</option>
                  {productosParaSelect.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre} {prod.marca ? `(${prod.marca})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo compra
                </label>
                <input
                  type="number"
                  value={costoCompra}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remover ceros al inicio
                    if (value.length > 1 && value.startsWith("0") && value[1] !== ".") {
                      value = value.replace(/^0+/, '');
                    }
                    setCostoCompra(value);
                  }}
                  className="w-full rounded-xl border-gray-300 px-3 py-2 text-sm focus:ring-pink-400 focus:border-pink-400"
                  placeholder="Ej: 15000"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAsignarProducto}
                  disabled={asignando}
                  className="px-6 py-2.5 bg-pink-500 text-white rounded-full text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 transition"
                >
                  {asignando ? "Asignando..." : "Asignar"}
                </button>
              </div>
            </div>
          </section>

          {/* Listado */}
          <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-gray-800">
              Productos del proveedor
            </h3>

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
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Producto</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Marca</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Costo compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosDelProveedor.map((prod) => (
                      <tr key={prod.id} className="border-t border-gray-200">
                        <td className="px-3 py-2">{prod.nombre}</td>
                        <td className="px-3 py-2 text-gray-600">{prod.marca || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {prod.costoCompra
                            ? `$${prod.costoCompra.toLocaleString("es-AR")}`
                            : "—"}
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