import { useUser } from '../context/UserContext';

export const useCurrentUser = () => {
  const { user } = useUser();
  return user;
};