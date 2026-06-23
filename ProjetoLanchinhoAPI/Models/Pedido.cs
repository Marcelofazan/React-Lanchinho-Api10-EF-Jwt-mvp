namespace ProjetoLanchinhoAPI.Models
{
    public class Pedido
    {
        public int Id { get; set; }

        public string Tipo { get; set; } = "Padrão";

        public DateTime DataPedido { get; set; } = DateTime.Now;

        public int? ClienteId { get; set; }
        public Cliente? Cliente { get; set; }

        public ICollection<ItemPedido> Itens { get; set; } = new List<ItemPedido>();

        public Pagamento? Pagamento { get; set; }

        public string Status { get; set; } = "Recebido";


        public string Codigo { get; set; } = string.Empty;

        public string NomeCliente { get; set; } = string.Empty;
        public string Endereco { get; set; } = string.Empty;
        public string? Referencia { get; set; }
        public string? Observacoes { get; set; }


        public decimal Subtotal { get; set; }
        public decimal? TaxaEntrega { get; set; }
        public decimal? TotalFinal { get; set; }
    }
}
