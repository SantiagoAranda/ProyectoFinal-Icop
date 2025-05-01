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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return user;
};