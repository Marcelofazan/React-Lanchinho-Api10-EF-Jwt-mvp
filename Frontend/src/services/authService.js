import axiosConfig from "./axiosConfig";

// Cache para evitar múltiplas requisições de refresh simultâneas
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

export const login = async (email, senha) => {
  try {
    // Validações locais
    const validation = validateLoginData({ email, senha });
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const { data } = await axiosConfig.post("/auth/login", {
      email: email.trim().toLowerCase(),
      senha,
    });

    if (data.token && data.user) {
      const usuarioFormatado = formatUserData(data.user);

      // Salvar dados com timestamp para auditoria
      const authData = {
        token: data.token,
        user: usuarioFormatado,
        refreshToken: data.refreshToken,
        loginTime: Date.now(),
        expiresAt: data.expiresAt,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(usuarioFormatado));
      localStorage.setItem("authData", JSON.stringify(authData));

      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      return usuarioFormatado;
    }
    throw new Error("Resposta da API inválida após o login.");
  } catch (error) {
    handleAuthError(error, "login");
    throw error;
  }
};

export const register = async (dadosCadastro) => {
  try {
    // Validações locais
    const validation = validateRegisterData(dadosCadastro);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const dadosParaEnvio = {
      nome: dadosCadastro.nome.trim(),
      email: dadosCadastro.email.toLowerCase().trim(),
      telefone: formatPhoneNumber(dadosCadastro.telefone),
      endereco: dadosCadastro.endereco?.trim(),
      senha: dadosCadastro.senha,
    };

    const { data } = await axiosConfig.post("/auth/register", dadosParaEnvio);

    if (data.token && data.user) {
      const usuarioFormatado = formatUserData(data.user);

      const authData = {
        token: data.token,
        user: usuarioFormatado,
        refreshToken: data.refreshToken,
        loginTime: Date.now(),
        expiresAt: data.expiresAt,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(usuarioFormatado));
      localStorage.setItem("authData", JSON.stringify(authData));

      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      return { user: usuarioFormatado, token: data.token };
    }
    throw new Error("Resposta da API inválida após o registro.");
  } catch (error) {
    handleAuthError(error, "register");
    throw error;
  }
};

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");

    // Tentar logout no servidor (não crítico se falhar)
    if (refreshToken) {
      try {
        await axiosConfig.post("/auth/logout", { token: refreshToken });
      } catch (error) {
        console.warn(
          "Erro no logout do servidor (continuando):",
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Erro no logout:", error);
  } finally {
    // Sempre limpar dados locais
    clearAuthData();
  }
};

export const refreshToken = async () => {
  const refreshTokenValue = localStorage.getItem("refreshToken");

  if (!refreshTokenValue) {
    throw new Error("Senha ou Email inválidos.");
  }

  if (isRefreshing) {
    // Se já estamos renovando, enfileirar esta requisição
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const { data } = await axiosConfig.post("/auth/refresh", {
      token: refreshTokenValue,
    });

    if (data.token) {
      localStorage.setItem("token", data.token);

      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      // Atualizar authData
      const authDataStr = localStorage.getItem("authData");
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        authData.token = data.token;
        authData.refreshToken = data.refreshToken;
        authData.expiresAt = data.expiresAt;
        localStorage.setItem("authData", JSON.stringify(authData));
      }

      processQueue(null, data.token);
      return data.token;
    }

    throw new Error("Erro ao renovar token");
  } catch (error) {
    processQueue(error, null);
    clearAuthData();

    const publicPaths = ["/login", "/cadastro", "/", "/esqueci-senha"];
    if (!publicPaths.includes(window.location.pathname)) {
      window.location.href = "/login";
    }

    throw error;
  } finally {
    isRefreshing = false;
  }
};

export const isAuthenticated = () => {
  try {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      return false;
    }

    // Verificar se o token não está expirado
    if (isTokenExpired(token)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
    clearAuthData();
    return false;
  }
};

export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Erro ao obter usuário atual:", error);
    return null;
  }
};

export const updateCurrentUser = (userData) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error("Usuário não encontrado no localStorage");

    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Atualizar também no authData
    const authDataStr = localStorage.getItem("authData");
    if (authDataStr) {
      const authData = JSON.parse(authDataStr);
      authData.user = updatedUser;
      localStorage.setItem("authData", JSON.stringify(authData));
    }

    return updatedUser;
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw error;
  }
};

export const getToken = () => {
  return localStorage.getItem("token");
};

// Funções de validação
const validateLoginData = ({ email, senha }) => {
  if (!email || !senha) {
    return { isValid: false, message: "Email e senha são obrigatórios." };
  }
  if (!isValidEmail(email)) {
    return { isValid: false, message: "Email inválido." };
  }
  if (senha.length < 6) {
    return {
      isValid: false,
      message: "Senha deve ter pelo menos 6 caracteres.",
    };
  }
  return { isValid: true };
};

const validateRegisterData = (dados) => {
  if (!dados.nome || dados.nome.trim().length < 2) {
    return {
      isValid: false,
      message: "Nome deve ter pelo menos 2 caracteres.",
    };
  }
  if (!dados.email || !isValidEmail(dados.email)) {
    return { isValid: false, message: "Email inválido." };
  }
  if (!dados.senha || dados.senha.length < 6) {
    return {
      isValid: false,
      message: "Senha deve ter pelo menos 6 caracteres.",
    };
  }
  if (!dados.telefone || !isValidPhone(dados.telefone)) {
    return {
      isValid: false,
      message: "Telefone inválido. Use o formato brasileiro com DDD.",
    };
  }
  if (!dados.endereco || dados.endereco.trim().length < 5) {
    return {
      isValid: false,
      message: "Endereço deve ter pelo menos 5 caracteres.",
    };
  }
  return { isValid: true };
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (telefone) => {
  const nums = telefone.replace(/\D/g, "");
  if (nums.length < 10 || nums.length > 11) return false;

  const ddd = parseInt(nums.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  // Se tem 11 dígitos, deve ser celular (terceiro dígito = 9)
  if (nums.length === 11) return nums.charAt(2) === "9";

  // Se tem 10 dígitos, não deve ter 9 na terceira posição
  if (nums.length === 10) return nums.charAt(2) !== "9";

  return false;
};

const formatPhoneNumber = (telefone) => {
  return telefone ? telefone.replace(/\D/g, "") : "";
};

const formatUserData = (user) => {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone || "",
    endereco: user.endereco || "",
    tipo: (user.role || user.tipo || "CLIENTE").toUpperCase().trim(),
    dataCriacao: user.dataCriacao,
    ativo: user.ativo !== false,
  };
};

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;

    return payload.exp < Date.now() / 1000;
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return true;
  }
};

export const isTokenExpiringSoon = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;

    const timeUntilExpiry = payload.exp - Date.now() / 1000;
    return timeUntilExpiry < 900; // 15 minutos
  } catch (error) {
    return false;
  }
};

const clearAuthData = () => {
  const keysToRemove = ["token", "user", "refreshToken", "authData"];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const handleAuthError = (error, operation) => {
  if (error.response) {
    const status = error.response.status;
    const errorData = error.response.data;

    console.error(`Erro ${status} na operação ${operation}:`, errorData);

    let message = "Erro desconhecido.";

    if (typeof errorData === "string") {
      message = errorData;
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (errorData?.errors) {
      message = Array.isArray(errorData.errors)
        ? errorData.errors.join(", ")
        : Object.values(errorData.errors).flat().join(", ");
    }

    // Sobrescrever mensagens específicas para melhor UX
    switch (status) {
      case 401:
        if (operation === "login") {
          message = "Email ou senha incorretos.";
        }
        break;
      case 409:
        message = "Email ou telefone já cadastrado.";
        break;
      case 422:
        message = "Dados inválidos. Verifique as informações.";
        break;
      case 500:
        message = "Erro interno do servidor. Tente novamente mais tarde.";
        break;
    }

    error.message = message;
  } else if (error.request) {
    error.message = "Erro de conexão. Verifique sua internet.";
  }
};

export const testConnection = async () => {
  try {
    const response = await axiosConfig.get("/auth/test");
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data,
    };
  }
};

export const getAuthData = () => {
  try {
    const authDataStr = localStorage.getItem("authData");
    return authDataStr ? JSON.parse(authDataStr) : null;
  } catch (error) {
    return null;
  }
};

// Monitoramento de sessão
export const startSessionMonitoring = () => {
  // Verificar a cada 5 minutos se o token está expirando
  setInterval(() => {
    if (isAuthenticated() && isTokenExpiringSoon()) {
      console.log("Token expirando em breve, tentando renovar...");
      refreshToken().catch((error) => {
        console.error("Falha ao renovar token automaticamente:", error);
      });
    }
  }, 5 * 60 * 1000); // 5 minutos
};

// Detecção de múltiplas abas
export const setupMultiTabSync = () => {
  window.addEventListener("storage", (e) => {
    if (e.key === "token" && !e.newValue && e.oldValue) {
      // Token foi removido em outra aba (logout)
      clearAuthData();
      window.location.reload();
    }
  });
};

export default {
  login,
  register,
  logout,
  refreshToken,
  isAuthenticated,
  getCurrentUser,
  updateCurrentUser,
  getToken,
  isValidPhone,
  testConnection,
  getAuthData,
  startSessionMonitoring,
  setupMultiTabSync,
};
