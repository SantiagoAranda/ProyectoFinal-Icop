import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    try {
      // Realizamos la llamada POST con los datos del formulario
      const response = await axios.post('http://localhost:3001/register', { email, password, role: 'user' });

      // Si la respuesta es exitosa, redirigimos al login
      alert('Usuario registrado exitosamente');
      navigate('/login');
    } catch (error) {
      // Aquí agregamos un manejo de errores más detallado
      if (axios.isAxiosError(error)) {
        // Manejo de errores de Axios
        setErrorMessage(error.response?.data?.message || 'Error al registrar. Intenta nuevamente.');
      } else {
        // Otros errores
        setErrorMessage('Error al registrar. Intenta nuevamente.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Registrarse</h1>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

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
