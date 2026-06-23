import axios from "axios";

// Função para buscar o token salvo
const getToken = () => {
  try {
    return localStorage.getItem("token");
  } catch (error) {
    console.error("Erro ao acessar localStorage:", error);
    return null;
  }
};

// Função para verificar se o token está expirado
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return payload.exp < Date.now() / 1000;
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return true;
  }
};

// Função para limpar dados de autenticação
const clearAuthData = () => {
  const keysToRemove = ["token", "user", "refreshToken", "authData"];
  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover ${key} do localStorage:`, error);
    }
  });
};

// Criação da instância Axios
const axiosConfig = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Cache para evitar múltiplas requisições de refresh simultâneas
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor de requisição
axiosConfig.interceptors.request.use(
  (config) => {
    const token = getToken();

    // Adicionar token se disponível e não expirado
    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[AXIOS REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${
          config.url
        }`
      );
      if (config.data && config.method !== "get") {
        console.log("[AXIOS REQUEST DATA]:", config.data);
      }
    }

    return config;
  },
  (error) => {
    console.error("[AXIOS REQUEST ERROR]:", error);
    return Promise.reject(error);
  }
);

// Interceptor de resposta
axiosConfig.interceptors.response.use(
  (response) => {
    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === "development") {
      console.log(`[AXIOS RESPONSE] ${response.status}:`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = error.config?.url;
    const data = error.response?.data;

    // Log detalhado do erro
    console.error(`[AXIOS ERROR] ${status} em ${url}:`, {
      status,
      data,
      message: error.message,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        data: error.config?.data,
      },
    });

    // Tratamento específico para erro 401 (Token expirado/inválido)
    if (status === 401 && !originalRequest._retry) {
      // Evitar loop infinito
      originalRequest._retry = true;

      // Se já estamos tentando renovar o token, enfileirar esta requisição
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosConfig(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("Senha ou Email inválidos");
        }

        // Tentar renovar o token
        const response = await axios.post(
          `${axiosConfig.defaults.baseURL}/auth/refresh`,
          {
            token: refreshToken,
          }
        );

        const { token: newToken } = response.data;

        if (newToken) {
          // Atualizar token no localStorage
          localStorage.setItem("token", newToken);

          // Atualizar refresh token se fornecido
          if (response.data.refreshToken) {
            localStorage.setItem("refreshToken", response.data.refreshToken);
          }

          // Atualizar authData se existir
          const authDataStr = localStorage.getItem("authData");
          if (authDataStr) {
            try {
              const authData = JSON.parse(authDataStr);
              authData.token = newToken;
              authData.refreshToken = response.data.refreshToken;
              authData.expiresAt = response.data.expiresAt;
              localStorage.setItem("authData", JSON.stringify(authData));
            } catch (parseError) {
              console.error("Erro ao atualizar authData:", parseError);
            }
          }

          // Processar fila de requisições
          processQueue(null, newToken);

          // Tentar novamente a requisição original
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosConfig(originalRequest);
        }

        throw new Error("Token não recebido na renovação");
      } catch (refreshError) {
        console.error("Erro ao renovar token:", refreshError);

        // Processar fila com erro
        processQueue(refreshError, null);

        // Limpar dados de autenticação
        clearAuthData();

        // Redirecionar para login apenas se não estiver em páginas públicas
        const publicPaths = ["/login", "/cadastro", "/", "/esqueci-senha"];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath)) {
          // Usar replace para evitar loop de navegação
          window.location.replace("/login");
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Outros tratamentos de erro baseados no status
    switch (status) {
      case 403:
        console.warn("Acesso negado - permissões insuficientes");
        if (error.response?.data?.message) {
          error.message = error.response.data.message;
        } else {
          error.message = "Você não tem permissão para acessar este recurso.";
        }
        break;

      case 404:
        console.warn(`Endpoint não encontrado: ${url}`);
        error.message = "Recurso não encontrado.";
        break;

      case 422:
        console.warn("Dados de requisição inválidos");
        if (error.response?.data?.errors) {
          const errors = error.response.data.errors;
          if (typeof errors === "object") {
            const errorMessages = Object.values(errors).flat().join(", ");
            error.message = errorMessages || "Dados inválidos.";
          } else {
            error.message = errors;
          }
        } else if (error.response?.data?.message) {
          error.message = error.response.data.message;
        } else {
          error.message = "Dados inválidos na requisição.";
        }
        break;

      case 429:
        console.warn("Rate limit excedido");
        error.message =
          "Muitas requisições. Aguarde alguns minutos e tente novamente.";
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        console.error("Erro interno do servidor");
        error.message = "Erro no servidor. Tente novamente mais tarde.";
        break;

      case 0:
      case undefined:
        console.error("Erro de conexão/rede - servidor pode estar fora do ar");
        error.message =
          "Erro de conexão. Verifique sua internet e tente novamente.";
        break;

      default:
        console.error(`Erro HTTP ${status}`);
        if (error.response?.data?.message) {
          error.message = error.response.data.message;
        } else {
          error.message = `Erro ${status}: ${
            error.message || "Erro desconhecido"
          }`;
        }
    }

    return Promise.reject(error);
  }
);

// Função para testar conectividade
export const testConnection = async () => {
  try {
    const response = await axiosConfig.get("/health", { timeout: 5000 });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data,
    };
  }
};

// Função para configurar interceptors personalizados se necessário
export const setupCustomInterceptors = (
  requestInterceptor,
  responseInterceptor
) => {
  if (requestInterceptor) {
    axiosConfig.interceptors.request.use(requestInterceptor);
  }

  if (responseInterceptor) {
    axiosConfig.interceptors.response.use(responseInterceptor);
  }
};

export default axiosConfig;
