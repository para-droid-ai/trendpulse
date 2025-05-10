import { createContext } from 'react';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  darkMode: false,
  login: () => {},
  logout: () => {},
  toggleDarkMode: () => {}
});

export default AuthContext; 