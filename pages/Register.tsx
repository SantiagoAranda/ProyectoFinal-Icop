import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !nombre || !password || !confirmPassword) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/register', {
        email: email.toLowerCase(),
        password,
        nombre,
        role: 'user', // Fijo en el frontend
        especialidad: especialidad || null, // Opcional
      });

      if (response.status === 201) {
        // Guardar token y datos del usuario en localStorage
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        alert('Usuario registrado exitosamente');
        navigate('/login');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || 'Error al registrar. Intenta nuevamente.');
      } else {
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Nombre:</label><br />
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Especialidad (opcional):</label><br />
          <input type="text" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Contraseña:</label><br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Confirmar contraseña:</label><br />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
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
