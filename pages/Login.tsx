import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../src/context/UserContext";
import { toast } from "react-toastify";
import api from "../src/lib/api";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const normalizedEmail = useMemo(
    () => email.trim().toLowerCase(),
    [email]
  );

  // ✅ Validaciones mínimas
  const emailOk = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  }, [normalizedEmail]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const showEmailError = touched.email && (!normalizedEmail || !emailOk);
  const showPasswordError = touched.password && !passwordOk;

  const inputBase =
    "w-full px-3 py-2 rounded-md bg-background text-foreground outline-none transition-colors";
  const okBorder =
    "border border-input focus:ring-2 focus:ring-primary focus:border-primary";
  const errorBorder =
    "border border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ email: true, password: true });

    if (!normalizedEmail || !password) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    if (!emailOk) {
      toast.error("Ingresá un email válido.");
      return;
    }

    if (!passwordOk) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      const response = await api.post("/auth/login", {
        email: normalizedEmail,
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
      const msg =
        err?.response?.data?.message || "Error al iniciar sesión";
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
          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() =>
                setTouched((t) => ({ ...t, email: true }))
              }
              placeholder="ejemplo@email.com"
              className={`${inputBase} ${
                showEmailError ? errorBorder : okBorder
              }`}
              required
            />
            {showEmailError && (
              <p className="mt-1 text-xs text-red-500">
                Ingresá un email válido.
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() =>
                setTouched((t) => ({ ...t, password: true }))
              }
              className={`${inputBase} ${
                showPasswordError ? errorBorder : okBorder
              }`}
              required
            />
            {showPasswordError && (
              <p className="mt-1 text-xs text-red-500">
                Mínimo 6 caracteres.
              </p>
            )}
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
          <Link
            to="/register"
            className="text-primary hover:underline font-medium"
          >
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
