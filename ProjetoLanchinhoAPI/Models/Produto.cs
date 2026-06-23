using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProjetoLanchinhoAPI.Models
{
    public class Produto
    {
        [Key]
        public int Id { get; set; }
        public string Tipo { get; set; } = "Padrão";
        [Required(ErrorMessage = "O nome do produto é obrigatório")]
        [StringLength(150, ErrorMessage = "Nome do produto muito longo")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "A descrição é obrigatória")]
        [StringLength(500)]
        public string Descricao { get; set; } = string.Empty;

        [Required(ErrorMessage = "A categoria é obrigatória")]
        [StringLength(100)]
        public string Categoria { get; set; } = string.Empty;

        [Required(ErrorMessage = "O preço é obrigatório")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Preço deve ser maior que zero")]
        public decimal Preco { get; set; }

        [Required(ErrorMessage = "Imagens são obrigatórias")]
        public ICollection<ProdutoImage> Imagens { get; set; } = new List<ProdutoImage>();

        public bool Disponivel { get; set; } = true;
        [JsonIgnore]
        public ICollection<ItemPedido> Itens { get; set; } = new List<ItemPedido>();
    }
}
