import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../src/lib/api";

type TouchedState = {
  email: boolean;
  nombre: boolean;
  password: boolean;
  confirmPassword: boolean;
};

type RegisterPayload = {
  email: string;
  password: string;
  nombre: string;
  role: "cliente";
};

type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function Register(): React.ReactElement {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [touched, setTouched] = useState<TouchedState>({
    email: false,
    nombre: false,
    password: false,
    confirmPassword: false,
  });

  const normalizedEmail = useMemo<string>(() => email.trim().toLowerCase(), [email]);

  const emailOk = useMemo<boolean>(() => {
    const v = normalizedEmail;
    const tieneArroba = v.includes("@");
    const terminaEnCom = v.endsWith(".com");
    const partes = v.split("@");
    const esValido = tieneArroba && partes.length === 2 && partes[0].length > 0 && partes[1].length > 4;
    return tieneArroba && terminaEnCom && esValido;
  }, [normalizedEmail]);

  const nombreOk = useMemo<boolean>(() => {
    const v = nombre.trim();
    return v.length >= 3 && !/\d/.test(v);
  }, [nombre]);

  const passwordOk = useMemo<boolean>(() => password.length >= 6, [password]);

  const confirmOk = useMemo<boolean>(
    () => confirmPassword.length >= 6 && confirmPassword === password,
    [confirmPassword, password]
  );

  const showEmailError = touched.email && (!normalizedEmail || !emailOk);
  const showNombreError = touched.nombre && !nombreOk;
  const showPasswordError = touched.password && !passwordOk;
  const showConfirmError = touched.confirmPassword && !confirmOk;

  const inputBase =
    "w-full border rounded-md px-3 py-2 bg-background outline-none transition-colors";
  const okBorder =
    "border-border focus:border-primary focus:ring-2 focus:ring-primary/20";
  const errorBorder =
    "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    setTouched({
      email: true,
      nombre: true,
      password: true,
      confirmPassword: true,
    });

    if (!normalizedEmail || !nombre.trim() || !password || !confirmPassword) {
      toast.error("Por favor, completa todos los campos obligatorios.");
      return;
    }

    if (!emailOk) {
      toast.error("El email debe ser válido y terminar en .com.");
      return;
    }

    if (!nombreOk) {
      const v = nombre.trim();
      toast.error(/\d/.test(v) ? "El nombre no puede contener números." : "El nombre debe tener al menos 3 caracteres.");
      return;
    }

    if (!passwordOk) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    try {
      const payload: RegisterPayload = {
        email: normalizedEmail,
        password,
        nombre: nombre.trim(),
        role: "cliente",
      };

      await api.post("/auth/register", payload);

      toast.success("Usuario registrado exitosamente");
      navigate("/login");
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      const msg = error?.response?.data?.message ?? "Error al registrar. Intenta nuevamente.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-primary text-center mb-2">
          Registrarse
        </h1>
        <p className="text-muted-foreground text-center mb-4">Crea tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`${inputBase} ${showEmailError ? errorBorder : okBorder}`}
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="ejemplo@email.com"
              autoComplete="email"
              required
            />
            {showEmailError && (
              <p className="mt-1 text-xs text-red-500">
                El email debe ser válido y terminar en .com.
              </p>
            )}
          </div>

          {/* NOMBRE */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              className={`${inputBase} ${showNombreError ? errorBorder : okBorder}`}
              value={nombre}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombre(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
              placeholder="Tu nombre"
              autoComplete="name"
              required
            />
            {showNombreError && (
              <p className="mt-1 text-xs text-red-500">
                {/\d/.test(nombre)
                  ? "El nombre no puede contener números."
                  : "El nombre debe tener al menos 3 caracteres."}
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={`${inputBase} ${showPasswordError ? errorBorder : okBorder}`}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
            {showPasswordError && (
              <p className="mt-1 text-xs text-red-500">Mínimo 6 caracteres.</p>
            )}
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`${inputBase} ${showConfirmError ? errorBorder : okBorder}`}
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              placeholder="Repetí tu contraseña"
              autoComplete="new-password"
              required
            />
            {showConfirmError && (
              <p className="mt-1 text-xs text-red-500">
                Debe coincidir y tener mínimo 6 caracteres.
              </p>
            )}
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
