using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.DTOs
{
    public class ItemPedidoDTO
    {
        [Required(ErrorMessage = "ProdutoId é obrigatório.")]
        public int ProdutoId { get; set; }

        [Required(ErrorMessage = "Quantidade é obrigatória.")]
        [Range(1, int.MaxValue, ErrorMessage = "Quantidade deve ser no mínimo 1.")]
        public int Quantidade { get; set; }
    }
}
