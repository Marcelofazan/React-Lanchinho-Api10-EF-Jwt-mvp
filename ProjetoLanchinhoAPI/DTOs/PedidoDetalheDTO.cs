namespace ProjetoLanchinhoAPI.DTOs
{
    public class PedidoComItensDTO
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public DateTime DataPedido { get; set; }
        public string Status { get; set; } = string.Empty;
        public string NomeCliente { get; set; } = string.Empty;
        public string Endereco { get; set; } = string.Empty;
        public string? Referencia { get; set; }
        public string? Observacoes { get; set; }
        public decimal Subtotal { get; set; }
        public decimal? TaxaEntrega { get; set; }
        public decimal? TotalFinal { get; set; }

        public List<ItemPedidoComProdutoDTO> Itens { get; set; } = new();
        public PagamentoInfoDTO? Pagamento { get; set; }
    }

    public class ItemPedidoComProdutoDTO
    {
        public int Id { get; set; }
        public int ProdutoId { get; set; }
        public int Quantidade { get; set; }
        public ProdutoInfoDTO? Produto { get; set; }
    }

    public class ProdutoInfoDTO
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public decimal Preco { get; set; }
        public string? Categoria { get; set; }
    }

    public class PagamentoInfoDTO
    {
        public int Id { get; set; }
        public decimal ValorTotal { get; set; }
        public string FormaPagamento { get; set; } = string.Empty;
        public bool Pago { get; set; }
    }
}
