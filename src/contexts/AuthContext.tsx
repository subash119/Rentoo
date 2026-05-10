import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}

interface AuthContextType {
  user: User | null;
  userRole: User['role'] | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (token: string, role: User['role'], userData: User) => void;
  register: (name: string, email: string, password: string, role: User['role']) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.status === 404) {
            // If the endpoint doesn't exist, try to decode the token locally
            try {
              // For now, just clear the token if we can't verify it
              localStorage.removeItem('token');
            } catch (error) {
              console.error('Token verification error:', error);
              localStorage.removeItem('token');
            }
          } else if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Auth verification error:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (token: string, role: User['role'], userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string, role: User['role']) => {
    try {
      setError(null);
      const response = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole: user?.role || null,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
