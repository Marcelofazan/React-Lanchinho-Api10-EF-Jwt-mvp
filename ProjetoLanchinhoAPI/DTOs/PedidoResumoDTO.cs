namespace ProjetoLanchinhoAPI.DTOs
{
    public class PedidoResumoDTO
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public DateTime DataPedido { get; set; }
        public string Status { get; set; } = string.Empty;
        public string NomeCliente { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
    }
}
