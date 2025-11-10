import React, { useState, useEffect } from "react";

interface Props {
  onClose: () => void;
  role: "cliente" | "admin";
}

const SugerenciasModal: React.FC<Props> = ({ onClose, role }) => {
  const [mensaje, setMensaje] = useState("");
  const [sugerencias, setSugerencias] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("sugerencias") || "[]");
    setSugerencias(data);
  }, []);

  // === Cliente: Enviar sugerencia ===
  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return alert("El mensaje no puede estar vacío");

    let nuevas = JSON.parse(localStorage.getItem("sugerencias") || "[]");

    const nueva = {
      id: Date.now(),
      remitente: "Cliente",
      mensaje,
      estado: "pendiente",
      fecha: new Date().toLocaleDateString("es-AR"),
    };

    nuevas.push(nueva);
    if (nuevas.length > 20) nuevas = nuevas.slice(-20); // mantener máximo 20

    localStorage.setItem("sugerencias", JSON.stringify(nuevas));
    setSugerencias(nuevas);
    setMensaje("");
    alert("Sugerencia enviada correctamente");
  };

  // === Admin: Marcar como leída ===
  const marcarLeida = (id: number) => {
    const actualizadas = sugerencias.map((s) =>
      s.id === id ? { ...s, estado: "leída" } : s
    );
    setSugerencias(actualizadas);
    localStorage.setItem("sugerencias", JSON.stringify(actualizadas));
  };

  // === Admin: Borrar todas las leídas ===
  const borrarLeidas = () => {
    if (
      window.confirm(
        "¿Seguro que deseas borrar todas las sugerencias marcadas como leídas?"
      )
    ) {
      const restantes = sugerencias.filter((s) => s.estado !== "leída");
      setSugerencias(restantes);
      localStorage.setItem("sugerencias", JSON.stringify(restantes));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        {/* === Cliente === */}
        {role === "cliente" ? (
          <>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Enviar sugerencia
            </h2>
            <form onSubmit={handleEnviar} className="flex flex-col gap-4">
              <textarea
                className="border rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-pink-400"
                placeholder="Escribí tu sugerencia..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
              />
              <button
                type="submit"
                className="bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 transition"
              >
                Enviar
              </button>
            </form>
          </>
        ) : (
          /* === Admin === */
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Sugerencias de clientes
              </h2>

              {/* ✅ Botón visible solo si hay sugerencias leídas */}
              {sugerencias.some((s) => s.estado === "leída") && (
                <button
                  onClick={borrarLeidas}
                  className="text-sm px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                >
                  Borrar leídas
                </button>
              )}
            </div>

            {sugerencias.length === 0 ? (
              <p className="text-gray-500 text-center">No hay sugerencias</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Mensaje</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugerencias.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.mensaje}</td>
                        <td className="p-2">{s.fecha}</td>
                        <td className="p-2 text-center">
                          {s.estado === "pendiente" ? (
                            <button
                              onClick={() => marcarLeida(s.id)}
                              className="bg-yellow-400 text-white px-3 py-1 rounded-md hover:bg-yellow-500"
                            >
                              Marcar leída
                            </button>
                          ) : (
                            <span className="text-green-600 font-semibold">
                              Leída
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SugerenciasModal;
