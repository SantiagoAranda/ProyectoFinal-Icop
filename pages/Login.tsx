import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../src/context/UserContext";
import { toast } from "react-toastify";
import api from "@/lib/api";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    try {
      const response = await api.post("/auth/login", {
        email: email.toLowerCase(),
        password,
      });

      const data = response.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      toast.success("Inicio de sesión exitoso 💖");

      // 👇 Redirección según rol
      const role = data.user?.role;
      if (role === "empleado") {
        navigate("/inicio-empleado");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Error al iniciar sesión";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-primary text-center mb-2">
          Inicia Sesión
        </h1>
        <p className="text-muted-foreground text-center mb-4">
          Ingresa tus datos
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@email.com"
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition"
          >
            Iniciar Sesión
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
