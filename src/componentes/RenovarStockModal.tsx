import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";

interface Producto {
  id: number;
  nombre: string;
  stock: number;
  costoCompra: number | null;
}

interface Proveedor {
  id: number;
  nombre: string;
}

interface Props {
  onClose: () => void;
  onCompraRealizada: () => void; // para refrescar lista en el dashboard
}

// Helper para armar headers con token
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

const RenovarStockModal: React.FC<Props> = ({ onClose, onCompraRealizada }) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState<number | "">("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  // Cargar proveedores (con token)
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await api.get("/proveedores", { headers });
        setProveedores(res.data);
      } catch {
        toast.error("Error al cargar proveedores");
      }
    };

    cargarProveedores();
  }, []);

  // Cargar productos del proveedor seleccionado (con token)
  useEffect(() => {
    setProductos([]);
    setCantidades({});

    if (!proveedorId) return;

    const cargarProductos = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await api.get(`/compras/proveedor/${proveedorId}`, {
          headers,
        });
        setProductos(res.data);
      } catch {
        toast.error("Error al cargar productos del proveedor");
      }
    };

    cargarProductos();
  }, [proveedorId]);

  const handleCantidad = (id: number, value: string) => {
    const n = Math.max(0, parseInt(value || "0", 10));
    setCantidades((prev) => ({ ...prev, [id]: n }));
  };

  const filas = useMemo(
    () =>
      productos.map((p) => {
        const cant = cantidades[p.id] || 0;
        const costo = p.costoCompra ?? 0;
        const subtotal = cant * costo;
        return { ...p, cant, costo, subtotal };
      }),
    [productos, cantidades]
  );

  const total = useMemo(
    () => filas.reduce((acc, f) => acc + f.subtotal, 0),
    [filas]
  );

  const haySeleccion = useMemo(
    () => filas.some((f) => f.cant > 0),
    [filas]
  );

  const guardar = async () => {
    if (!proveedorId) {
      toast.error("Seleccioná un proveedor");
      return;
    }

    const payload = filas
      .filter((f) => f.cant > 0)
      .map((f) => ({ productoId: f.id, cantidad: f.cant }));

    if (payload.length === 0) {
      toast.error("Seleccioná cantidades mayores a 0");
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      await api.post(
        "/compras",
        {
          proveedorId: Number(proveedorId),
          productos: payload,
        },
        { headers }
      );

      toast.success("Compra registrada correctamente ✅");
      onCompraRealizada();
      onClose();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || "Error al registrar la compra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[95%] max-w-3xl shadow-xl animate-fadeZoomIn">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
          Renovar stock
        </h2>

        {/* Proveedor */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Proveedor
          </label>
          <select
            className="border rounded-md p-2 w-full"
            value={proveedorId}
            onChange={(e) =>
              setProveedorId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Seleccionar proveedor…</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Lista */}
        {proveedorId ? (
          productos.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                <div className="col-span-5">Producto</div>
                <div className="col-span-2 text-right">Stock</div>
                <div className="col-span-2 text-right">Costo</div>
                <div className="col-span-1 text-right">Cant.</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y">
                {filas.map((f) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-12 items-center px-3 py-2 text-sm"
                  >
                    <div className="col-span-5 truncate">{f.nombre}</div>
                    <div className="col-span-2 text-right">{f.stock}</div>
                    <div className="col-span-2 text-right">
                      ${f.costo.toLocaleString()}
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        min={0}
                        className="w-16 border rounded-md p-1 text-right"
                        value={cantidades[f.id] || ""}
                        onChange={(e) => handleCantidad(f.id, e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      ${f.subtotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end items-center gap-4 px-3 py-3 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {haySeleccion
                    ? "Total de la compra:"
                    : "Seleccioná cantidades para calcular total"}
                </div>
                <div className="text-lg font-semibold">
                  ${total.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Este proveedor no tiene productos asignados.
            </p>
          )
        ) : (
          <p className="text-center text-gray-400">
            Seleccioná un proveedor para ver sus productos.
          </p>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 transition"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading || !haySeleccion}
            className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 transition"
          >
            {loading ? "Procesando..." : "Confirmar compra"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeZoomIn { 
          0% { opacity:0; transform:scale(.95); } 
          100% { opacity:1; transform:scale(1); } 
        }
        .animate-fadeZoomIn { animation: fadeZoomIn .2s ease-out; }
      `}</style>
    </div>
  );
};

export default RenovarStockModal;
