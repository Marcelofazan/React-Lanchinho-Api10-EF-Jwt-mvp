import { useEffect, useState, useCallback } from "react";
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { getProdutos } from "../services/produtoService";
import HamburguerCard from "../components/HamburguerCard";
import BarraCarrinho from "../components/BarraCarrinho";
import AlertaLojaFechada from "../components/AlertaLojaFechada";
import axiosConfig from "../services/axiosConfig";

import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();
  const { usuarioLogado, isLoggedIn, isInitialized } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [filtro, setFiltro] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finalizandoPedido, setFinalizandoPedido] = useState(false);

  const [statusLoja, setStatusLoja] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [dadosEntrega, setDadosEntrega] = useState({
    tipoPedido: "ENTREGA",
    endereco: "",
    pontoReferencia: "",
    observacoes: "",
    formaPagamento: "",
    troco: "",
  });

  const handleInputChange = (field, value) => {
    setDadosEntrega((prev) => ({ ...prev, [field]: value }));
  };

  const obterCarrinhoUsuario = useCallback((userId) => {
    try {
      if (!userId) return [];
      const carrinhoKey = `carrinho_${userId}`;
      const carrinhoSalvo = localStorage.getItem(carrinhoKey);
      const carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];

      return Array.isArray(carrinho)
        ? carrinho.filter(
            (item) =>
              item &&
              item.id &&
              item.nome &&
              typeof item.preco === "number" &&
              item.quantidade > 0,
          )
        : [];
    } catch (error) {
      console.error("Erro ao ler carrinho do localStorage:", error);
      return [];
    }
  }, []);

  const salvarCarrinhoUsuario = useCallback((userId, carrinhoData) => {
    try {
      if (!userId) return;
      const carrinhoKey = `carrinho_${userId}`;
      localStorage.setItem(carrinhoKey, JSON.stringify(carrinhoData));
    } catch (error) {
      console.error("Erro ao salvar carrinho no localStorage:", error);
    }
  }, []);

  const limparCarrinhoUsuario = useCallback((userId) => {
    try {
      if (!userId) return;
      const carrinhoKey = `carrinho_${userId}`;
      localStorage.removeItem(carrinhoKey);
    } catch (error) {
      console.error("Erro ao limpar carrinho do localStorage:", error);
    }
  }, []);

  useEffect(() => {
    const carregarStatusLoja = async () => {
      try {
        setLoadingStatus(true);
        const response = await axiosConfig.get("/configuracaoLoja/status");
        console.log("Status da loja:", response.data);
        setStatusLoja(response.data);
      } catch (error) {
        console.error("Erro ao carregar status da loja:", error);
        setStatusLoja({ estaAberta: true });
      } finally {
        setLoadingStatus(false);
      }
    };

    carregarStatusLoja();
    const interval = setInterval(carregarStatusLoja, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("Iniciando carregamento de produtos...");
        const listaProdutos = await getProdutos();

        console.log("Resposta de getProdutos:", listaProdutos);

        if (Array.isArray(listaProdutos) && listaProdutos.length > 0) {
          const produtosValidos = listaProdutos.filter((p) => {
            const valido =
              p.id &&
              p.nome &&
              p.nome.trim() !== "" &&
              p.preco > 0 &&
              p.categoria &&
              p.categoria.trim() !== "";

            if (!valido) {
              console.warn("Produto inválido ignorado:", p);
            }
            return valido;
          });

          console.log("Produtos válidos:", produtosValidos.length);

          if (produtosValidos.length > 0) {
            setProdutos(produtosValidos);
          } else {
            setProdutos([]);
            setError("Produtos estão com dados incompletos.");
          }
        } else if (Array.isArray(listaProdutos) && listaProdutos.length === 0) {
          console.warn("API retornou array vazio");
          setProdutos([]);
          setError("Nenhum produto cadastrado no momento.");
        } else {
          console.error("API retornou formato inválido:", listaProdutos);
          setProdutos([]);
          setError("Formato de dados inválido recebido do servidor.");
        }
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        setProdutos([]);

        let mensagemErro = "Erro ao carregar produtos.";
        if (!err.response) {
          mensagemErro = "Erro de conexão. Verifique sua internet.";
        } else if (err.response.status >= 500) {
          mensagemErro = "Erro no servidor. Tente novamente mais tarde.";
        } else if (err.response.status === 404) {
          mensagemErro = "Endpoint de produtos não encontrado.";
        }
        setError(mensagemErro);
      } finally {
        setLoading(false);
        console.log("Carregamento finalizado");
      }
    };

    carregarProdutos();
  }, []);

  useEffect(() => {
    if (isInitialized && usuarioLogado?.id) {
      const carrinhoUsuario = obterCarrinhoUsuario(usuarioLogado.id);
      setCarrinho(carrinhoUsuario);
    } else if (isInitialized && !usuarioLogado) {
      setCarrinho([]);
    }
  }, [usuarioLogado, isInitialized, isLoggedIn, obterCarrinhoUsuario]);

  useEffect(() => {
    if (usuarioLogado?.id) {
      salvarCarrinhoUsuario(usuarioLogado.id, carrinho);

      if (carrinho.length === 0) {
        setMostrarCarrinho(false);
      }
    }
  }, [carrinho, usuarioLogado, salvarCarrinhoUsuario]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        if (usuarioLogado?.id) {
          const carrinhoAtualizado = obterCarrinhoUsuario(usuarioLogado.id);
          setCarrinho(carrinhoAtualizado);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [usuarioLogado, obterCarrinhoUsuario]);

  useEffect(() => {
    if (mostrarCarrinho && usuarioLogado?.endereco) {
      setDadosEntrega((prev) => ({
        ...prev,
        endereco: usuarioLogado.endereco,
      }));
    } else if (mostrarCarrinho && !usuarioLogado?.endereco) {
      setDadosEntrega((prev) => ({
        ...prev,
        endereco: "",
      }));
    }
  }, [mostrarCarrinho, usuarioLogado]);

  const adicionarAoCarrinho = useCallback(
    (produto) => {
      if (!usuarioLogado) {
        alert("Faça login para adicionar itens ao carrinho.");
        navigate("/login");
        return;
      }

      if (!produto.disponivel) {
        alert("Este produto está temporariamente indisponível!");
        return;
      }

      if (!statusLoja?.estaAberta) {
        alert(
          "Loja fechada! Não é possível adicionar produtos ao carrinho no momento.",
        );
        return;
      }

      if (
        !produto ||
        !produto.id ||
        !produto.nome ||
        typeof produto.preco !== "number"
      ) {
        console.error("Produto inválido:", produto);
        return;
      }

      setCarrinho((prevCarrinho) => {
        const itemExistente = prevCarrinho.find(
          (item) => item.id === produto.id,
        );

        if (itemExistente) {
          return prevCarrinho.map((item) =>
            item.id === produto.id
              ? { ...item, quantidade: item.quantidade + 1 }
              : item,
          );
        }

        return [...prevCarrinho, { ...produto, quantidade: 1 }];
      });
    },
    [usuarioLogado, navigate, statusLoja],
  );

  const atualizarQuantidade = useCallback((produtoId, operacao) => {
    setCarrinho((prevCarrinho) =>
      prevCarrinho
        .map((item) => {
          if (item.id === produtoId) {
            const novaQtde =
              operacao === "+" ? item.quantidade + 1 : item.quantidade - 1;
            return novaQtde > 0 ? { ...item, quantidade: novaQtde } : null;
          }
          return item;
        })
        .filter(Boolean),
    );
  }, []);

  const limparCarrinho = useCallback(() => {
    setCarrinho([]);
    setMostrarCarrinho(false);
  }, []);

  const finalizarPedido = useCallback(async () => {
    if (!usuarioLogado?.id || carrinho.length === 0) return;

    if (!statusLoja?.estaAberta) {
      alert("Loja fechada! Não é possível finalizar pedidos no momento.");
      return;
    }

    try {
      setFinalizandoPedido(true);

      console.log("Finalizando pedido para usuário:", usuarioLogado.id);
      console.log("Itens do pedido:", carrinho);
      console.log("Dados de entrega:", dadosEntrega);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      limparCarrinhoUsuario(usuarioLogado.id);
      setCarrinho([]);
      setMostrarCarrinho(false);

      alert("Pedido realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setFinalizandoPedido(false);
    }
  }, [
    usuarioLogado,
    carrinho,
    dadosEntrega,
    limparCarrinhoUsuario,
    statusLoja,
  ]);

  const deletarProduto = useCallback(async (produtoId) => {
    try {
      console.log("Deletando produto ID:", produtoId);

      const response = await axiosConfig.delete(`/produtos/${produtoId}`);

      console.log("Produto deletado:", response.data);

      setProdutos((prev) => prev.filter((p) => p.id !== produtoId));

      alert("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      const mensagem =
        error.response?.data?.message || "Erro ao excluir produto.";
      alert(mensagem);
      throw error;
    }
  }, []);

  const toggleDisponibilidade = useCallback(async (produtoId) => {
    try {
      console.log("Alterando disponibilidade do produto:", produtoId);

      const response = await axiosConfig.patch(
        `/produtos/${produtoId}/disponibilidade`,
      );

      console.log("Resposta da API:", response.data);

      setProdutos((prev) =>
        prev.map((p) =>
          p.id === produtoId
            ? { ...p, disponivel: response.data.disponivel }
            : p,
        ),
      );

      alert(
        response.data.disponivel
          ? "Produto marcado como disponível!"
          : "Produto marcado como indisponível!",
      );
    } catch (error) {
      console.error("Erro ao alterar disponibilidade:", error);
      alert("Erro ao atualizar disponibilidade!");
    }
  }, []);

  const ordenarProdutos = useCallback((produtos) => {
    const disponiveis = produtos.filter((p) => p.disponivel);
    const indisponiveis = produtos.filter((p) => !p.disponivel);

    return [...disponiveis, ...indisponiveis];
  }, []);

  if (!isInitialized) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-3">Carregando...</p>
      </Container>
    );
  }

  const categorias = [
    "Todos",
    "Artesanais",
    "Tradicionais",
    "Bebidas",
    "Combos",
    "Batatas",
    "Adicionais",
  ];
  const produtosBase = (() => {
    let produtosFiltrados = produtos;

    if (filtro !== "Todos") {
      produtosFiltrados = produtosFiltrados.filter(
        (item) => item.categoria === filtro,
      );
    }

    const isAdmin = usuarioLogado?.tipo === "ADM";

    if (!isAdmin) {
      produtosFiltrados = produtosFiltrados.filter(
        (item) => item.disponivel === true,
      );
    }

    return produtosFiltrados;
  })();

  const produtosFiltrados = ordenarProdutos(produtosBase);
  const totalItensCarrinho = carrinho.reduce(
    (acc, item) => acc + item.quantidade,
    0,
  );

  return (
    <Container className="menu-container mt-5 mb-5 fade-in">
      <h1 className="text-center mb-4">Lanchinho Delivery</h1>

      {!loadingStatus && statusLoja && (
        <AlertaLojaFechada status={statusLoja} />
      )}

      {!isLoggedIn && (
        <Alert variant="info" className="text-center">
          <Alert.Heading>Bem-vindo!</Alert.Heading>
          <p>
            Para uma experiência completa, faça login e adicione itens ao seu
            carrinho.
          </p>
          <Button variant="outline-primary" onClick={() => navigate("/login")}>
            Fazer Login
          </Button>
        </Alert>
      )}

      {error && (
        <Alert
          variant="danger"
          className="text-center"
          dismissible
          onClose={() => setError("")}
        >
          <Alert.Heading>Erro</Alert.Heading>
          <p>{error}</p>
          <Button
            variant="outline-danger"
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </Button>
        </Alert>
      )}

      <div className="mb-4 d-flex flex-wrap gap-2 justify-content-center">
        {categorias.map((cat) => (
          <Button
            key={cat}
            variant={cat === filtro ? "success" : "outline-success"}
            onClick={() => setFiltro(cat)}
            disabled={loading}
          >
            {cat}
          </Button>
        ))}
      </div>

      <Row className="gy-4">
        {loading ? (
          <Col xs={12} className="text-center">
            <Spinner animation="border" variant="success" />
            <p className="text-muted mt-3">Carregando produtos...</p>
          </Col>
        ) : produtosFiltrados.length === 0 ? (
          <Col xs={12} className="text-center">
            <Alert variant="warning">
              <h4>Nenhum produto encontrado</h4>
              <p>
                {error
                  ? "Ocorreu um erro ao carregar os produtos."
                  : filtro === "Todos"
                    ? "Não há produtos cadastrados no momento."
                    : `Não há produtos na categoria "${filtro}".`}
              </p>
              {error && (
                <Button
                  variant="outline-warning"
                  onClick={() => window.location.reload()}
                >
                  Recarregar Página
                </Button>
              )}
            </Alert>
          </Col>
        ) : (
          produtosFiltrados.map((item) => (
            <Col key={item.id} xs={12} sm={6} lg={4}>
              <HamburguerCard
                id={item.id}
                nome={item.nome}
                descricao={item.descricao}
                preco={item.preco}
                imagens={item.imagemUrls}
                onAdd={() => adicionarAoCarrinho(item)}
                onDelete={deletarProduto}
                disabled={!statusLoja?.estaAberta}
                isIndisponivel={!item.disponivel}
                onToggleDisponibilidade={toggleDisponibilidade}
              />
            </Col>
          ))
        )}
      </Row>

      {totalItensCarrinho > 0 && (
        <Button
          className="btn-ver-carrinho position-fixed"
          style={{
            bottom: "20px",
            right: "20px",
            zIndex: 1000,
            borderRadius: "50px",
            padding: "15px 25px",
            fontSize: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
          variant="success"
          onClick={() => setMostrarCarrinho(true)}
          disabled={finalizandoPedido}
        >
          Ver Carrinho ({totalItensCarrinho})
        </Button>
      )}

      {mostrarCarrinho && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1050,
          }}
          onClick={() => setMostrarCarrinho(false)}
        >
          <div
            className="position-absolute end-0 top-0 h-100 bg-white"
            style={{
              width: "100%",
              maxWidth: "400px",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <BarraCarrinho
              carrinho={carrinho}
              atualizarQuantidade={atualizarQuantidade}
              limparCarrinho={limparCarrinho}
              onClose={() => setMostrarCarrinho(false)}
              onFinalizarPedido={finalizarPedido}
              loading={finalizandoPedido}
              dadosEntrega={dadosEntrega}
              handleInputChange={handleInputChange}
            />
          </div>
        </div>
      )}
    </Container>
  );
}

export default Home;
