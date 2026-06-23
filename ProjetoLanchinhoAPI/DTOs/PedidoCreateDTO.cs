using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.DTOs
{
    public class PedidoCreateDTO
    {
        public int? ClienteId { get; set; }

        public List<ItemPedidoDTO> Itens { get; set; } = new();

        public string FormaPagamento { get; set; } = string.Empty;

        [StringLength(120)]
        public string NomeCliente { get; set; } = string.Empty;


        [StringLength(220)]
        public string Endereco { get; set; } = string.Empty;

        [StringLength(160)]
        public string Referencia { get; set; } = string.Empty;

        [StringLength(300)]
        public string Observacoes { get; set; } = string.Empty;

        public bool IsRascunho { get; set; } = false;
    }
}
