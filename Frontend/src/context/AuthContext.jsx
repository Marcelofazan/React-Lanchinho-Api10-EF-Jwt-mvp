import React, { createContext, useState, useEffect, useContext } from "react";
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
  isAuthenticated,
  getCurrentUser,
  updateCurrentUser,
} from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        if (isAuthenticated()) {
          const user = getCurrentUser();
          if (user) {
            setUsuarioLogado(user);
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("authData");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authData");
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") {
        if (!e.newValue && e.oldValue) {
          setUsuarioLogado(null);
        } else if (e.newValue) {
          try {
            const user =
              e.key === "user" ? JSON.parse(e.newValue) : getCurrentUser();
            setUsuarioLogado(user);
          } catch (error) {
            console.error("Erro ao sincronizar dados entre abas:", error);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async (email, senha) => {
    try {
      setIsLoading(true);
      const usuario = await loginService(email, senha);
      setUsuarioLogado(usuario);
      return usuario;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dadosCadastro) => {
    try {
      setIsLoading(true);
      const response = await registerService(dadosCadastro);
      if (response.user) {
        setUsuarioLogado(response.user);
      }
      return response;
    } catch (error) {
      console.error("Erro no registro:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await logoutService();
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      setUsuarioLogado(null);
      setIsLoading(false);
    }
  };

  const updateUser = (userData) => {
    setUsuarioLogado(userData);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      updateCurrentUser(userData);
    }
  };

  const contextValue = {
    usuarioLogado,
    usuariologado: usuarioLogado,
    user: usuarioLogado,
    isLoading,
    loading: isLoading,
    isInitialized,
    isLoggedIn: Boolean(usuarioLogado && isAuthenticated()),
    login,
    register,
    logout,
    updateUser,
    setUsuarioLogado: updateUser,
    atualizarUsuario: updateUser,
    isAuthenticated: () => Boolean(usuarioLogado && isAuthenticated()),
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

export { AuthContext };
export default AuthProvider;
