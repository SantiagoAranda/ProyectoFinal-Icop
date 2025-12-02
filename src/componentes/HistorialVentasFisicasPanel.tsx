import React, { useEffect, useState } from "react";
import api from "@/lib/api";

interface Props {
  onClose: () => void;
}

export default function HistorialVentasFisicasPanel({ onClose }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginado
  const [pagina, setPagina] = useState(1);
  const porPagina = 5;

  const formatMoney = (n: number) =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  const cargarVentas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/ventas-fisicas/historial", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 🔥 Asegurar que productosVendidos sea siempre un array parseado
      const data = res.data.map((v: any) => ({
        ...v,
        productosVendidos: (() => {
          if (Array.isArray(v.productosVendidos)) return v.productosVendidos;

          try {
            const parsed = JSON.parse(v.productosVendidos);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      }));

      setVentas(data);
    } catch (err) {
      console.error("Error al cargar ventas físicas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  // Calcular ventas paginadas
  const inicio = (pagina - 1) * porPagina;
  const ventasPagina = ventas.slice(inicio, inicio + porPagina);
  const totalPaginas = Math.ceil(ventas.length / porPagina);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Panel lateral */}
      <div
        className="relative ml-auto h-full w-[450px] bg-white shadow-xl 
                   transform transition-all duration-300 translate-x-0"
      >
        {/* ENCABEZADO */}
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
          <h2 className="text-xl font-semibold">Historial de Ventas Físicas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-4 overflow-y-auto h-[calc(100%-70px)]">
          {loading ? (
            <p className="text-center text-gray-500">Cargando...</p>
          ) : ventas.length === 0 ? (
            <p className="text-center text-gray-500">
              No hay ventas físicas registradas.
            </p>
          ) : (
            <div className="space-y-4">
              {ventasPagina.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-lg border shadow-sm bg-gray-50"
                >
                  {/* Fecha */}
                  <p className="text-sm text-gray-500">
                    Fecha: {new Date(v.fecha).toLocaleString("es-AR")}
                  </p>

                  {/* Total */}
                  <p className="text-lg font-semibold mt-1 text-gray-700">
                    Total: {formatMoney(v.total)}
                  </p>

                  {/* Productos vendidos */}
                  {v.productosVendidos.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-1">Productos vendidos:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {v.productosVendidos.map((p: any, i: number) => (
                          <li key={i} className="flex justify-between">
                            <span>
                              {p.nombre} × {p.cantidad}
                            </span>
                            <span className="text-gray-500">
                              {formatMoney(p.precioUnitario * p.cantidad)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PAGINADO */}
          {ventas.length > porPagina && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                disabled={pagina === 1}
                onClick={() => setPagina((p) => p - 1)}
                className={`px-3 py-1 rounded border ${
                  pagina === 1 ? "opacity-40" : "hover:bg-gray-100"
                }`}
              >
                Anterior
              </button>

              <span className="text-sm text-gray-600">
                Página {pagina} de {totalPaginas}
              </span>

              <button
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className={`px-3 py-1 rounded border ${
                  pagina === totalPaginas ? "opacity-40" : "hover:bg-gray-100"
                }`}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
