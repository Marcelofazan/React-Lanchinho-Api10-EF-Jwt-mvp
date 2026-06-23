using System.ComponentModel.DataAnnotations.Schema;

namespace ProjetoLanchinhoAPI.Models
{
    public class Pagamento
    {
        public int Id { get; set; }

        public string Tipo { get; set; } = "Padrão";

        public decimal ValorTotal { get; set; }

        [Column(TypeName = "varchar(100)")]
        public string FormaPagamento { get; set; } = "Pix";

        public bool Pago { get; set; } = false;

        public int PedidoId { get; set; }

        public Pedido Pedido { get; set; } = null!;
    }
}
