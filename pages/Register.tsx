import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/lib/api";

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !nombre || !password || !confirmPassword) {
      toast.error("Por favor, completa todos los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    try {
      await api.post("/auth/register", {
        email: email.toLowerCase(),
        password,
        nombre,
        role: "cliente",
      });

      toast.success("Usuario registrado exitosamente 💫");
      navigate("/login");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Error al registrar. Intenta nuevamente.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-primary text-center mb-2">Registrarse</h1>
        <p className="text-muted-foreground text-center mb-4">Crea tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full border border-border rounded-md px-3 py-2 bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="nombre" className="block text-sm font-medium mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              className="w-full border border-border rounded-md px-3 py-2 bg-background"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full border border-border rounded-md px-3 py-2 bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full border border-border rounded-md px-3 py-2 bg-background"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Registrarse
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
