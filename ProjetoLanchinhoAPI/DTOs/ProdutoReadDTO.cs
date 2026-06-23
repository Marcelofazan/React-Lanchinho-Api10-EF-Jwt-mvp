namespace ProjetoLanchinhoAPI.DTOs
{
    public class ProdutoReadDTO
    {
        public int Id { get; set; }

        public string Tipo { get; set; } = string.Empty;

        public string Nome { get; set; } = string.Empty;

        public string Descricao { get; set; } = string.Empty;

        public string Categoria { get; set; } = string.Empty;

        public decimal Preco { get; set; }

        public List<string> ImagemUrls { get; set; } = new();

        public bool Disponivel { get; set; } = true;
    }
}
