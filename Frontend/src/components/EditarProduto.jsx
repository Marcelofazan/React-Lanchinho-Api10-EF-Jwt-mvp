import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosConfig from "../services/axiosConfig";
import {
  Form,
  Button,
  Container,
  Alert,
  Carousel,
  Spinner,
} from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";
import "../styles/EditarProduto.css";

function EditarProduto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuariologado } = useContext(AuthContext);

  const categoriasDisponiveis = [
    "Artesanais",
    "Tradicionais",
    "Bebidas",
    "Combos",
    "Batatas",
    "Adicionais",
  ];

  const [produto, setProduto] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [novasImagens, setNovasImagens] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    axiosConfig
      .get(`/produtos/${id}`)
      .then((res) => {
        setProduto(res.data);
      })
      .catch((err) => {
        console.error("Erro ao carregar produto:", err);
        setErro("Produto não encontrado ou acesso negado.");
      });
  }, [id]);

  const isAdmin = usuariologado?.tipo?.toUpperCase() === "ADM";
  if (!isAdmin) {
    return (
      <Alert variant="danger" className="m-5 text-center">
        Acesso negado: apenas administradores podem editar produtos.
      </Alert>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduto((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrecoChange = (e) => {
    let valor = e.target.value;
    valor = valor.replace(/[^0-9.]/g, "");
    const partes = valor.split(".");
    if (partes.length > 2) {
      valor = partes[0] + "." + partes.slice(1).join("");
    }
    if (partes.length === 2 && partes[1].length > 2) {
      valor = partes[0] + "." + partes[1].substring(0, 2);
    }
    setProduto((prev) => ({ ...prev, preco: valor }));
  };

  const handleImagemChange = (e) => {
    setNovasImagens(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      const precoNumero = parseFloat(produto.preco);
      if (isNaN(precoNumero) || precoNumero <= 0) {
        setErro("Preço inválido. Use ponto (.) para centavos. Ex: 35.50");
        setEnviando(false);
        return;
      }

      const formData = new FormData();
      formData.append("nome", produto.nome.trim());
      formData.append("descricao", produto.descricao.trim());
      formData.append("preco", precoNumero.toFixed(2));
      formData.append("categoria", produto.categoria);
      formData.append("tipo", produto.tipo || "Padrão");

      if (novasImagens.length > 0) {
        novasImagens.forEach((img) => {
          formData.append("imagens", img);
        });
      }

      const response = await axiosConfig.put(`/produtos/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSucesso("Produto atualizado com sucesso! Redirecionando...");
      setTimeout(() => navigate("/home"), 2000);
    } catch (err) {
      console.error("Erro ao atualizar produto:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Erro ao atualizar produto.";
      setErro(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setEnviando(false);
    }
  };

  if (!produto) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
        <p>Carregando produto...</p>
      </Container>
    );
  }

  return (
    <Container className="editar-produto-container mt-5 mb-5 fade-in">
      <h2 className="text-center mb-4">Editar Produto</h2>

      {erro && (
        <Alert variant="danger" dismissible onClose={() => setErro("")}>
          <Alert.Heading>Erro</Alert.Heading>
          <p>{erro}</p>
        </Alert>
      )}
      {sucesso && (
        <Alert variant="success">
          <Alert.Heading>Sucesso!</Alert.Heading>
          <p>{sucesso}</p>
        </Alert>
      )}

      <Form.Group className="mb-4">
        {produto.imagemUrls?.length > 0 ? (
          <div className="carousel-container-edit">
            <Carousel fade interval={null}>
              {produto.imagemUrls.map((url, index) => (
                <Carousel.Item key={index}>
                  <img
                    className="d-block w-100 carousel-image-edit"
                    src={url}
                    alt={`Imagem ${index + 1}`}
                  />
                </Carousel.Item>
              ))}
            </Carousel>
          </div>
        ) : (
          <Alert variant="info">Este produto não possui imagens.</Alert>
        )}
      </Form.Group>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Nome</Form.Label>
          <Form.Control
            type="text"
            name="nome"
            value={produto.nome || ""}
            onChange={handleChange}
            required
            disabled={enviando}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Descrição</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="descricao"
            value={produto.descricao || ""}
            onChange={handleChange}
            required
            disabled={enviando}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Preço (R$)</Form.Label>
          <Form.Control
            type="text"
            name="preco"
            value={produto.preco || ""}
            onChange={handlePrecoChange}
            placeholder="Ex: 35.50"
            required
            disabled={enviando}
          />
          <Form.Text className="text-muted">
            Use ponto (.) para separar centavos. Exemplo: 35.50
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Categoria</Form.Label>
          <Form.Select
            name="categoria"
            value={produto.categoria || ""}
            onChange={handleChange}
            required
            disabled={enviando}
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {categoriasDisponiveis.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Substituir Imagens (opcional)</Form.Label>
          <Form.Control
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleImagemChange}
            disabled={enviando}
          />
          <Form.Text className="text-muted">
            Se você enviar novas imagens, as antigas serão substituídas.
          </Form.Text>
        </Form.Group>

        <div className="d-grid gap-2">
          <Button variant="primary" type="submit" size="lg" disabled={enviando}>
            {enviando ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/home")}
            disabled={enviando}
          >
            Cancelar
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default EditarProduto;
