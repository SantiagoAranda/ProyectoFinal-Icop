import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!email || !password) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    try {
      // Realizar la solicitud POST al backend
      const response = await axios.post('http://localhost:3001/login', { email, password });

      // Si el login es exitoso, redirigimos al Dashboard
      alert(response.data.message);
      navigate('/cliente'); // O la ruta que necesites según el rol

    } catch (error: any) {
      // Manejo de errores
      if (error.response) {
        // Si el error es desde el servidor
        setErrorMessage(error.response.data.message);
      } else {
        // Si el error es de red
        setErrorMessage('Hubo un error al conectar con el servidor.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Iniciar sesión</h1>
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

        <button type="submit" style={{ marginTop: '1.5rem' }}>
          Iniciar sesión
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        ¿No tienes cuenta? <a href="/register">Registrarse</a>
      </p>
    </div>
  );
}

export default Login;
