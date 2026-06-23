using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.DTOs;
using ProjetoLanchinhoAPI.Models;
using ProjetoLanchinhoAPI.Services;
using System.Security.Claims;

namespace ProjetoLanchinhoAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PedidoController : ControllerBase
    {
        private readonly MeuDbContext _context;
        private readonly IPedidoService _pedidoService;
        private readonly ILogger<PedidoController> _logger;

        public PedidoController(
            MeuDbContext context,
            IPedidoService pedidoService,
            ILogger<PedidoController> logger)
        {
            _context = context;
            _pedidoService = pedidoService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CriarPedido([FromBody] PedidoCreateDTO dto)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("ModelState inválido ao criar pedido");
                return BadRequest(ModelState);
            }

            try
            {
                _logger.LogInformation("Iniciando criação de pedido para cliente: {ClienteNome}", dto.NomeCliente);

                var pedido = await _pedidoService.CriarPedidoAsync(dto);

                _logger.LogInformation("Pedido {Codigo} criado com sucesso. ID: {Id}, Total: R$ {Total}",
                    pedido.Codigo, pedido.Id, pedido.TotalFinal);

                var resposta = new
                {
                    id = pedido.Id,
                    codigo = pedido.Codigo,
                    status = pedido.Status,
                    dataPedido = pedido.DataPedido,
                    subtotal = pedido.Subtotal,
                    taxaEntrega = pedido.TaxaEntrega,
                    totalFinal = pedido.TotalFinal
                };

                return CreatedAtAction(nameof(ObterPedido), new { id = pedido.Id }, resposta);
            }
            catch (DbUpdateException dbEx) when (dbEx.InnerException?.Message.Contains("IX_Pedidos_Codigo") == true)
            {
                _logger.LogError(dbEx, "Tentativa de criar pedido com código duplicado");
                return Conflict(new { message = "Código de pedido já existe. Tente novamente." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro crítico ao criar pedido");
                return BadRequest(new { message = ex.Message, details = ex.InnerException?.Message });
            }
        }

        [HttpGet]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> ListarPedidos()
        {
            try
            {
                _logger.LogInformation("Listando todos os pedidos (ADM)");

                // Busca todos os pedidos primeiro
                var pedidos = await _context.Pedidos
                    .Where(p => p.Codigo != null)
                    .OrderByDescending(p => p.DataPedido)
                    .AsNoTracking()
                    .ToListAsync();

                // Processa em memória para evitar problemas com GroupBy no EF
                var pedidosUnicos = pedidos
                    .GroupBy(p => p.Codigo)
                    .Select(g => g.OrderByDescending(p => p.Id).First())
                    .Select(p => new PedidoResumoDTO
                    {
                        Id = p.Id,
                        Codigo = p.Codigo ?? "",
                        DataPedido = p.DataPedido,
                        Status = p.Status ?? "",
                        NomeCliente = p.NomeCliente ?? "",
                        Subtotal = p.Subtotal
                    })
                    .ToList();

                _logger.LogInformation("{Count} pedidos encontrados", pedidosUnicos.Count);
                return Ok(pedidosUnicos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao listar pedidos");
                return StatusCode(500, new { message = "Erro ao listar pedidos", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPedido(int id)
        {
            try
            {
                _logger.LogInformation("Buscando pedido {Id}", id);

                var pedido = await _context.Pedidos
                    .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                    .Include(p => p.Pagamento)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (pedido == null)
                {
                    _logger.LogWarning("Pedido {Id} não encontrado", id);
                    return NotFound(new { message = "Pedido não encontrado" });
                }

                // Verificação de autorização corrigida
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var userRole = User.FindFirstValue(ClaimTypes.Role);
                var emailClaim = User.FindFirstValue(ClaimTypes.Email);

                _logger.LogInformation("Pedido {Id} - ClienteId: {ClienteId}, UserId: {UserId}, Role: {Role}, Email: {Email}",
                    id, pedido.ClienteId, userIdClaim, userRole, emailClaim);

                // Se não for ADM, verificar se é o dono do pedido
                if (userRole != "ADM")
                {
                    // Buscar o cliente pelo ID ou Email
                    Cliente? cliente = null;

                    if (int.TryParse(userIdClaim, out int parsedUserId))
                    {
                        cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Id == parsedUserId);
                    }

                    if (cliente == null && !string.IsNullOrEmpty(emailClaim))
                    {
                        cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Email == emailClaim);
                    }

                    if (cliente == null)
                    {
                        _logger.LogWarning("Cliente não encontrado no token");
                        return Unauthorized(new { message = "Sessão inválida" });
                    }

                    // Verificar se o pedido pertence ao cliente
                    if (pedido.ClienteId != cliente.Id)
                    {
                        _logger.LogWarning("Cliente {ClienteId} tentou acessar pedido {PedidoId} de outro cliente",
                            cliente.Id, id);
                        return Forbid();
                    }
                }

                _logger.LogInformation("Acesso autorizado ao pedido {Id} com {ItensCount} itens", id, pedido.Itens?.Count ?? 0);

                var pedidoDto = new PedidoComItensDTO
                {
                    Id = pedido.Id,
                    Codigo = pedido.Codigo ?? string.Empty,
                    DataPedido = pedido.DataPedido,
                    Status = pedido.Status ?? string.Empty,
                    NomeCliente = pedido.NomeCliente ?? string.Empty,
                    Endereco = pedido.Endereco ?? string.Empty,
                    Referencia = pedido.Referencia,
                    Observacoes = pedido.Observacoes,
                    Subtotal = pedido.Subtotal,
                    TaxaEntrega = pedido.TaxaEntrega,
                    TotalFinal = pedido.TotalFinal,
                    Itens = pedido.Itens?.Select(i => new ItemPedidoComProdutoDTO
                    {
                        Id = i.Id,
                        ProdutoId = i.ProdutoId,
                        Quantidade = i.Quantidade,
                        Produto = i.Produto != null ? new ProdutoInfoDTO
                        {
                            Id = i.Produto.Id,
                            Nome = i.Produto.Nome ?? string.Empty,
                            Preco = i.Produto.Preco,
                            Categoria = i.Produto.Categoria
                        } : null
                    }).ToList() ?? new List<ItemPedidoComProdutoDTO>(),
                    Pagamento = pedido.Pagamento != null ? new PagamentoInfoDTO
                    {
                        Id = pedido.Pagamento.Id,
                        ValorTotal = pedido.Pagamento.ValorTotal,
                        FormaPagamento = pedido.Pagamento.FormaPagamento ?? string.Empty,
                        Pago = pedido.Pagamento.Pago
                    } : null
                };

                return Ok(pedidoDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar pedido {Id}", id);
                return StatusCode(500, new { message = "Erro interno ao buscar pedido", error = ex.Message, innerError = ex.InnerException?.Message });
            }
        }

        [HttpGet("meus")]
        public async Task<IActionResult> MeusPedidos()
        {
            try
            {
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var emailClaim = User.FindFirstValue(ClaimTypes.Email);

                _logger.LogInformation("Buscando pedidos - UserId: {UserId}, Email: {Email}", userIdClaim, emailClaim);

                Cliente? cliente = null;

                if (int.TryParse(userIdClaim, out int parsedId))
                {
                    cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Id == parsedId);
                }

                if (cliente == null && !string.IsNullOrEmpty(emailClaim))
                {
                    cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Email == emailClaim);
                }

                if (cliente == null)
                {
                    _logger.LogWarning("Cliente não encontrado para token");
                    return Unauthorized(new { message = "Cliente não encontrado para este token." });
                }

                // Query simplificada - busca todos os pedidos primeiro
                var pedidos = await _context.Pedidos
                    .Where(p => p.ClienteId == cliente.Id && p.Codigo != null)
                    .OrderByDescending(p => p.DataPedido)
                    .AsNoTracking()
                    .ToListAsync();

                // Processa em memória para evitar problemas com GroupBy no EF
                var pedidosUnicos = pedidos
                    .GroupBy(p => p.Codigo)
                    .Select(g => g.OrderByDescending(p => p.Id).First())
                    .Select(p => new PedidoResumoDTO
                    {
                        Id = p.Id,
                        Codigo = p.Codigo ?? "",
                        DataPedido = p.DataPedido,
                        Status = p.Status ?? "",
                        NomeCliente = p.NomeCliente ?? "",
                        Subtotal = p.Subtotal
                    })
                    .ToList();

                _logger.LogInformation("{Count} pedidos encontrados para cliente {ClienteId}", pedidosUnicos.Count, cliente.Id);
                return Ok(pedidosUnicos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar pedidos do cliente");
                return StatusCode(500, new { message = "Erro ao buscar seus pedidos", error = ex.Message });
            }
        }

        [HttpPut("{id}/confirmar-pagamento")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> ConfirmarPagamento(int id)
        {
            try
            {
                var pedido = await _context.Pedidos
                    .Include(p => p.Pagamento)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (pedido?.Pagamento == null)
                {
                    _logger.LogWarning("Pedido {Id} ou pagamento não encontrado", id);
                    return NotFound(new { message = "Pedido ou pagamento não encontrado." });
                }

                pedido.Pagamento.Pago = true;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Pagamento do pedido {Codigo} confirmado", pedido.Codigo);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao confirmar pagamento do pedido {Id}", id);
                return StatusCode(500, new { message = "Erro ao confirmar pagamento" });
            }
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> AtualizarStatus(int id, [FromBody] string novoStatus)
        {
            try
            {
                var pedido = await _context.Pedidos.FirstOrDefaultAsync(p => p.Id == id);

                if (pedido == null)
                {
                    _logger.LogWarning("Pedido {Id} não encontrado", id);
                    return NotFound(new { message = "Pedido não encontrado." });
                }

                var statusAnterior = pedido.Status;
                pedido.Status = novoStatus;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Status do pedido {Codigo} alterado de '{StatusAnterior}' para '{NovoStatus}'",
                    pedido.Codigo, statusAnterior, novoStatus);

                return Ok(new { pedido.Id, pedido.Status });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao atualizar status do pedido {Id}", id);
                return StatusCode(500, new { message = "Erro ao atualizar status" });
            }
        }

        [HttpDelete("remover-duplicatas")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> RemoverDuplicatas()
        {
            try
            {
                _logger.LogInformation("Iniciando remoção de pedidos duplicados");

                var pedidosDuplicados = await _context.Pedidos
                    .Where(p => p.Codigo != null)
                    .GroupBy(p => p.Codigo)
                    .Where(g => g.Count() > 1)
                    .Select(g => new
                    {
                        Codigo = g.Key,
                        Pedidos = g.OrderByDescending(p => p.Id).Skip(1).ToList()
                    })
                    .ToListAsync();

                int totalRemovidos = 0;

                foreach (var grupo in pedidosDuplicados)
                {
                    _context.Pedidos.RemoveRange(grupo.Pedidos);
                    totalRemovidos += grupo.Pedidos.Count;
                    _logger.LogInformation("Removidos {Count} pedidos duplicados do código {Codigo}",
                        grupo.Pedidos.Count, grupo.Codigo);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Total de {Count} pedidos duplicados removidos", totalRemovidos);

                return Ok(new
                {
                    message = "Duplicatas removidas com sucesso",
                    totalRemovidos,
                    detalhes = pedidosDuplicados.Select(p => new
                    {
                        codigo = p.Codigo,
                        removidos = p.Pedidos.Count
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao remover duplicatas");
                return StatusCode(500, new { message = "Erro ao remover duplicatas", error = ex.Message });
            }
        }

        [HttpGet("validar-duplicatas")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> ValidarDuplicatas()
        {
            try
            {
                _logger.LogInformation("Verificando duplicatas");

                var pedidosDuplicados = await _context.Pedidos
                    .Where(p => p.Codigo != null)
                    .GroupBy(p => p.Codigo)
                    .Where(g => g.Count() > 1)
                    .Select(g => new
                    {
                        codigo = g.Key,
                        total = g.Count(),
                        ids = g.Select(p => p.Id).ToList()
                    })
                    .ToListAsync();

                var pagamentosDuplicados = await _context.Pagamentos
                    .GroupBy(p => p.PedidoId)
                    .Where(g => g.Count() > 1)
                    .Select(g => new
                    {
                        pedidoId = g.Key,
                        total = g.Count(),
                        ids = g.Select(p => p.Id).ToList()
                    })
                    .ToListAsync();

                var resultado = new
                {
                    temDuplicatas = pedidosDuplicados.Any() || pagamentosDuplicados.Any(),
                    pedidos = new
                    {
                        total = pedidosDuplicados.Count,
                        duplicatas = pedidosDuplicados
                    },
                    pagamentos = new
                    {
                        total = pagamentosDuplicados.Count,
                        duplicatas = pagamentosDuplicados
                    }
                };

                _logger.LogInformation("Validação concluída: {PedidosDup} pedidos duplicados, {PagDup} pagamentos duplicados",
                    pedidosDuplicados.Count, pagamentosDuplicados.Count);

                return Ok(resultado);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao validar duplicatas");
                return StatusCode(500, new { message = "Erro ao validar duplicatas", error = ex.Message });
            }
        }

        // Endpoint temporário para debug do token JWT
        [HttpGet("debug-token")]
        public IActionResult DebugToken()
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var email = User.FindFirstValue(ClaimTypes.Email);

            return Ok(new
            {
                claims,
                parsedData = new
                {
                    userId,
                    userRole,
                    email
                }
            });
        }
    }
}
