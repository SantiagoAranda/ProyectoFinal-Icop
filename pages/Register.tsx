import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!email || !password || !confirmPassword) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    // Acá iría la llamada a tu API para registrar
    console.log('Registro enviado:', { email, password });

    // Simulación: si todo OK ➔ redireccionar a login
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Registrarse</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Contraseña:</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Confirmar contraseña:</label><br />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" style={{ marginTop: '1.5rem' }}>
          Registrarse
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        ¿Ya tenés cuenta? <a href="/login">Iniciar sesión</a>
      </p>
    </div>
  );
}

export default Register;
