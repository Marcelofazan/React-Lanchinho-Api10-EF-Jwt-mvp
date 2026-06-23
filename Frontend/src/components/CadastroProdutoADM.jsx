import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axiosConfig from "../services/axiosConfig";
import { Container, Form, Button, Alert, Spinner } from "react-bootstrap";
import "../styles/CadastroProdutoADM.css";

function CadastroProdutoADM() {
  const { usuariologado } = useContext(AuthContext);

  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    tipo: "Padrão",
  });

  const [imagemFiles, setImagemFiles] = useState([]);
  const [previewImagens, setPreviewImagens] = useState([]);

  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const categoriasDisponiveis = [
    "Artesanais",
    "Tradicionais",
    "Bebidas",
    "Combos",
    "Batatas",
    "Adicionais",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
    setForm((prev) => ({ ...prev, preco: valor }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImagemFiles(files);
      setPreviewImagens(files.map((file) => URL.createObjectURL(file)));
    } else {
      setImagemFiles([]);
      setPreviewImagens([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    setSucesso(false);

    const precoNumero = parseFloat(form.preco);

    if (isNaN(precoNumero) || precoNumero <= 0) {
      setErro("Preço inválido. Use ponto (.) para centavos. Ex: 34.99");
      setEnviando(false);
      return;
    }

    if (imagemFiles.length === 0) {
      setErro("Selecione ao menos uma imagem para o produto.");
      setEnviando(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("nome", form.nome.trim());
      data.append("descricao", form.descricao.trim());
      data.append("preco", precoNumero.toFixed(2));
      data.append("categoria", form.categoria);
      data.append("tipo", form.tipo);

      imagemFiles.forEach((file) => {
        data.append("imagens", file);
      });

      const res = await axiosConfig.post("/produtos", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSucesso(true);
      setForm({
        nome: "",
        descricao: "",
        preco: "",
        categoria: "",
        tipo: "Padrão",
      });
      setImagemFiles([]);
      setPreviewImagens([]);

      previewImagens.forEach((url) => URL.revokeObjectURL(url));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      const mensagemErro =
        error.response?.data?.message ||
        error.response?.data ||
        "Erro ao cadastrar produto. Verifique os campos.";
      setErro(mensagemErro);
    } finally {
      setEnviando(false);
    }
  };

  if (!usuariologado || usuariologado.tipo?.toUpperCase() !== "ADM") {
    return (
      <Alert variant="danger" className="m-5 text-center">
        Acesso negado: apenas administradores podem cadastrar produtos.
      </Alert>
    );
  }

  return (
    <Container className="cadastro-produto-container mt-5 mb-5 fade-in">
      <h2 className="text-center mb-4">Cadastrar Novo Produto</h2>

      {sucesso && (
        <Alert variant="success" dismissible onClose={() => setSucesso(false)}>
          <Alert.Heading>Sucesso!</Alert.Heading>
          <p>Produto cadastrado com sucesso!</p>
        </Alert>
      )}
      {erro && (
        <Alert variant="danger" dismissible onClose={() => setErro("")}>
          {erro}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Nome do Produto</Form.Label>
          <Form.Control
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Ex: X-Bacon Artesanal"
            required
            disabled={enviando}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Descrição</Form.Label>
          <Form.Control
            as="textarea"
            name="descricao"
            rows={3}
            value={form.descricao}
            onChange={handleChange}
            placeholder="Descreva os ingredientes e características do produto..."
            required
            disabled={enviando}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Categoria</Form.Label>
          <Form.Select
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            required
            disabled={enviando}
          >
            <option value="">Selecione uma categoria</option>
            {categoriasDisponiveis.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Preço (R$)</Form.Label>
          <Form.Control
            type="text"
            name="preco"
            value={form.preco}
            onChange={handlePrecoChange}
            placeholder="Ex: 34.99"
            required
            disabled={enviando}
          />
          <Form.Text className="text-muted">
            Use ponto (.) para separar centavos. Exemplo: 34.99
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Imagens do Produto</Form.Label>
          <Form.Control
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            disabled={enviando}
          />
          <Form.Text className="text-muted">
            Selecione uma ou mais imagens (JPG, PNG, WEBP)
          </Form.Text>
        </Form.Group>

        {previewImagens.length > 0 && (
          <div className="mb-3">
            <Form.Label>Preview das Imagens:</Form.Label>
            <div className="preview-container">
              {previewImagens.map((url, idx) => (
                <div key={idx} className="preview-item">
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="preview-image"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="d-grid gap-2">
          <Button variant="success" type="submit" size="lg" disabled={enviando}>
            {enviando ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Cadastrando...
              </>
            ) : (
              "Cadastrar Produto"
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default CadastroProdutoADM;
