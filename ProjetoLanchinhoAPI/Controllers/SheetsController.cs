using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoLanchinhoAPI.Data;

namespace ProjetoLanchinhoAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SheetsController : ControllerBase
    {
        private readonly MeuDbContext _context;
        private readonly ILogger<SheetsController> _logger;
        private readonly IConfiguration _configuration;

        public SheetsController(
            MeuDbContext context,
            ILogger<SheetsController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        private bool ValidarChaveAPI()
        {
            var chaveEsperada = _configuration["SheetsAPI:Key"];
            var chaveRecebida = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

            return chaveEsperada == chaveRecebida;
        }


        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.Now,
                message = "API Lanchinho está funcionando!"
            });
        }


        [HttpGet("clientes")]
        public async Task<IActionResult> GetClientes()
        {
            try
            {
                if (!ValidarChaveAPI())
                {
                    _logger.LogWarning(" Tentativa de acesso não autorizado aos dados de clientes");
                    return Unauthorized(new { message = "Chave de API inválida" });
                }

                _logger.LogInformation(" Google Sheets solicitou dados de clientes");

                var clientes = await _context.Clientes
                    .AsNoTracking()
                    .OrderBy(c => c.DataCriacao)
                    .Select(c => new
                    {
                        id = c.Id,
                        nome = c.Nome ?? "",
                        email = c.Email ?? "",
                        telefone = c.Telefone ?? "",
                        endereco = c.Endereco ?? "",
                        dataCriacao = c.DataCriacao.ToString("dd/MM/yyyy HH:mm")
                    })
                    .ToListAsync();

                _logger.LogInformation($" Retornando {clientes.Count} clientes");
                return Ok(clientes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao buscar clientes para Google Sheets");
                return StatusCode(500, new { message = "Erro ao buscar clientes", details = ex.Message });
            }
        }


        [HttpGet("produtos")]
        public async Task<IActionResult> GetProdutos()
        {
            try
            {
                if (!ValidarChaveAPI())
                {
                    _logger.LogWarning(" Tentativa de acesso não autorizado aos dados de produtos");
                    return Unauthorized(new { message = "Chave de API inválida" });
                }

                _logger.LogInformation(" Google Sheets solicitou dados de produtos");

                var produtos = await _context.Produtos
                    .AsNoTracking()
                    .OrderBy(p => p.Categoria)
                    .ThenBy(p => p.Nome)
                    .Select(p => new
                    {
                        id = p.Id,
                        nome = p.Nome ?? "",
                        categoria = p.Categoria ?? "",
                        preco = p.Preco,
                        descricao = p.Descricao ?? ""
                    })
                    .ToListAsync();

                _logger.LogInformation($" Retornando {produtos.Count} produtos");
                return Ok(produtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao buscar produtos para Google Sheets");
                return StatusCode(500, new { message = "Erro ao buscar produtos", details = ex.Message });
            }
        }


        [HttpGet("pedidos")]
        public async Task<IActionResult> GetPedidos()
        {
            try
            {
                if (!ValidarChaveAPI())
                {
                    _logger.LogWarning("Tentativa de acesso não autorizado aos dados de pedidos");
                    return Unauthorized(new { message = "Chave de API inválida" });
                }

                _logger.LogInformation(" Google Sheets solicitou dados de pedidos");

                // Busca todos os pedidos primeiro
                var todosPedidos = await _context.Pedidos
                    .AsNoTracking()
                    .OrderByDescending(p => p.DataPedido)
                    .ToListAsync();

                var pedidosUnicos = todosPedidos
                    .GroupBy(p => p.Codigo)
                    .Select(g => g.OrderByDescending(p => p.Id).First())
                    .Select(p => new
                    {
                        id = p.Id,
                        codigo = p.Codigo ?? "",
                        dataPedido = p.DataPedido.ToString("dd/MM/yyyy HH:mm"),
                        nomeCliente = p.NomeCliente ?? "",
                        totalFinal = p.TotalFinal ?? (p.Subtotal + (p.TaxaEntrega ?? 0)),
                        status = p.Status ?? ""
                    })
                    .ToList();

                _logger.LogInformation($" Retornando {pedidosUnicos.Count} pedidos únicos");
                return Ok(pedidosUnicos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao buscar pedidos para Google Sheets");
                return StatusCode(500, new { message = "Erro ao buscar pedidos", details = ex.Message });
            }
        }


        [HttpGet("pagamentos")]
        public async Task<IActionResult> GetPagamentos()
        {
            try
            {
                if (!ValidarChaveAPI())
                {
                    _logger.LogWarning(" Tentativa de acesso não autorizado aos dados de pagamentos");
                    return Unauthorized(new { message = "Chave de API inválida" });
                }

                _logger.LogInformation(" Google Sheets solicitou dados de pagamentos");

                // Busca todos os pagamentos primeiro
                var todosPagamentos = await _context.Pagamentos
                    .Include(p => p.Pedido)
                    .AsNoTracking()
                    .OrderByDescending(p => p.Id)
                    .ToListAsync();

                // Remove duplicatas em memória (GroupBy funciona melhor em memória)
                var pagamentosUnicos = todosPagamentos
                    .GroupBy(p => p.PedidoId)
                    .Select(g => g.OrderByDescending(p => p.Id).First())
                    .Select(p => new
                    {
                        id = p.Id,
                        pedidoCodigo = p.Pedido != null ? (p.Pedido.Codigo ?? "") : "N/A",
                        valorTotal = p.ValorTotal,
                        formaPagamento = p.FormaPagamento ?? ""
                    })
                    .ToList();

                _logger.LogInformation($" Retornando {pagamentosUnicos.Count} pagamentos");
                return Ok(pagamentosUnicos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao buscar pagamentos para Google Sheets");
                return StatusCode(500, new { message = "Erro ao buscar pagamentos", details = ex.Message });
            }
        }


        [HttpGet("estatisticas")]
        public async Task<IActionResult> GetEstatisticas()
        {
            try
            {
                if (!ValidarChaveAPI())
                {
                    _logger.LogWarning("Tentativa de acesso não autorizado às estatísticas");
                    return Unauthorized(new { message = "Chave de API inválida" });
                }

                _logger.LogInformation(" Google Sheets solicitou estatísticas");

                var hoje = DateTime.Now.Date;
                var inicioMes = new DateTime(hoje.Year, hoje.Month, 1);

                var pedidos = await _context.Pedidos.AsNoTracking().ToListAsync();
                var clientes = await _context.Clientes.AsNoTracking().CountAsync();
                var produtos = await _context.Produtos.AsNoTracking().CountAsync();

                var pedidosHoje = pedidos.Count(p => p.DataPedido.Date == hoje);
                var vendasHoje = pedidos.Where(p => p.DataPedido.Date == hoje).Sum(p => p.TotalFinal ?? 0);

                var pedidosMes = pedidos.Count(p => p.DataPedido >= inicioMes);
                var vendasMes = pedidos.Where(p => p.DataPedido >= inicioMes).Sum(p => p.TotalFinal ?? 0);

                var ticketMedio = pedidos.Any() ? pedidos.Average(p => p.TotalFinal ?? 0) : 0;

                var estatisticas = new
                {
                    totalClientes = clientes,
                    totalProdutos = produtos,
                    pedidosHoje,
                    vendasHoje,
                    pedidosMes,
                    vendasMes,
                    totalPedidos = pedidos.Count,
                    ticketMedio
                };

                _logger.LogInformation(" Estatísticas calculadas e retornadas");
                return Ok(estatisticas);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao calcular estatísticas");
                return StatusCode(500, new { message = "Erro ao calcular estatísticas", details = ex.Message });
            }
        }
    }
}
