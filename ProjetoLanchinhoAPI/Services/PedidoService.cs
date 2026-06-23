using Microsoft.EntityFrameworkCore;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.DTOs;
using ProjetoLanchinhoAPI.Models;

namespace ProjetoLanchinhoAPI.Services
{
    public class PedidoService : IPedidoService
    {
        private readonly MeuDbContext _context;
        private readonly ILogger<PedidoService> _logger;

        public PedidoService(
            MeuDbContext context,
            ILogger<PedidoService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Pedido> CriarPedidoAsync(PedidoCreateDTO dto)
        {
            // Usar Transaction com Serializable Isolation Level para evitar race conditions
            using var transaction = await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable);

            try
            {
                // 1. Validar Produtos e Calcular Subtotal
                var ids = dto.Itens.Select(i => i.ProdutoId).ToList();
                var produtos = await _context.Produtos
                    .Where(p => ids.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id);

                if (produtos.Count != ids.Distinct().Count())
                {
                    throw new Exception("Um ou mais produtos são inválidos ou indisponíveis.");
                }

                decimal subtotal = 0m;
                var itens = dto.Itens.Select(i =>
                {
                    var prod = produtos[i.ProdutoId];
                    subtotal += prod.Preco * i.Quantidade;
                    return new ItemPedido
                    {
                        ProdutoId = prod.Id,
                        Quantidade = i.Quantidade
                    };
                }).ToList();

                // 2. Gerar Código Único para o Pedido (com retry e lock)
                string codigo;
                int tentativas = 0;
                const int maxTentativas = 10;

                do
                {
                    codigo = OrderCodeGenerator.NewCode();
                    tentativas++;

                    if (tentativas > maxTentativas)
                    {
                        _logger.LogError(" Falha ao gerar código único após {Tentativas} tentativas", maxTentativas);
                        throw new Exception("Não foi possível gerar um código único para o pedido. Tente novamente.");
                    }

                    // Verifica com lock de leitura
                    var existeCodigo = await _context.Pedidos
                        .AsNoTracking()
                        .AnyAsync(p => p.Codigo == codigo);

                    if (!existeCodigo)
                        break;

                    _logger.LogWarning(" Código {Codigo} já existe, gerando novo... (tentativa {Tentativa})",
                        codigo, tentativas);

                } while (true);

                _logger.LogInformation(" Código gerado: {Codigo} (tentativa {Tentativa})", codigo, tentativas);

                // 3. Montar o Objeto Pedido
                var pedido = new Pedido
                {
                    ClienteId = dto.ClienteId,
                    DataPedido = DateTime.Now,
                    Status = dto.IsRascunho ? "AGUARDANDO_CONFIRMACAO" : "Recebido",
                    Codigo = codigo,
                    NomeCliente = dto.NomeCliente,
                    Endereco = dto.Endereco,
                    Referencia = dto.Referencia,
                    Observacoes = dto.Observacoes,
                    Subtotal = subtotal,
                    TaxaEntrega = 0,
                    TotalFinal = subtotal,
                    Itens = itens
                };

                // 4. Adicionar Pagamento se não for Rascunho
                if (!dto.IsRascunho)
                {
                    if (string.IsNullOrWhiteSpace(dto.FormaPagamento))
                        throw new Exception("Forma de pagamento é obrigatória para pedidos tradicionais.");

                    pedido.Pagamento = new Pagamento
                    {
                        ValorTotal = subtotal,
                        FormaPagamento = dto.FormaPagamento,
                        Pago = false
                    };

                    _logger.LogInformation(" Pagamento criado: {FormaPagamento}", dto.FormaPagamento);
                }

                // 5. Salvar no Banco de Dados
                _context.Pedidos.Add(pedido);
                await _context.SaveChangesAsync();

                // 6. Commit da Transaction
                await transaction.CommitAsync();

                _logger.LogInformation(" Pedido {Codigo} salvo no banco. ID: {Id}, Total: R$ {Total}",
                    pedido.Codigo, pedido.Id, pedido.TotalFinal);
                _logger.LogInformation(" Google Sheets atualizará automaticamente os dados em breve.");

                return pedido;
            }
            catch (DbUpdateException dbEx) when (dbEx.InnerException?.Message.Contains("IX_Pedidos_Codigo") == true)
            {
                await transaction.RollbackAsync();
                _logger.LogError(dbEx, " Tentativa de criar pedido com código duplicado (constraint violada)");
                throw new Exception("Código de pedido duplicado detectado. Por favor, tente novamente.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Erro ao criar pedido, rollback executado");
                throw;
            }
        }
    }
}
