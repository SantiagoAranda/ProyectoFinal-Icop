// hooks/useCurrentUser.ts
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  role: 'admin' | 'empleado' | 'tesorero' | 'cliente';
  nombre: string;
  trabajo: string;
  createdAt: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);

  const loadUser = () => {
    const storedUser = localStorage.getItem('user');
    setUser(storedUser ? JSON.parse(storedUser) : null);
  };

  useEffect(() => {
    loadUser();

    // Escuchar cambios de storage (si hay más de una pestaña)
    window.addEventListener('storage', loadUser);

    return () => {
      window.removeEventListener('storage', loadUser);
    };
  }, []);

  return user;
};
