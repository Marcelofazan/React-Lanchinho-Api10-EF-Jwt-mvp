using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.DTOs;
using System.Security.Claims;

namespace ProjetoLanchinhoAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClienteController : ControllerBase
    {
        private readonly MeuDbContext _context;
        private readonly ILogger<ClienteController> _logger;

        public ClienteController(
            MeuDbContext context,
            ILogger<ClienteController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPut("perfil")]
        public async Task<IActionResult> UpdatePerfil([FromBody] ClienteUpdateDTO dto)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Token inválido." });
                }

                var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Id == int.Parse(userId));

                if (cliente == null)
                {
                    return NotFound(new { message = "Cliente não encontrado." });
                }

                if (string.IsNullOrWhiteSpace(dto.Nome))
                {
                    return BadRequest(new { message = "Nome é obrigatório." });
                }

                if (!string.IsNullOrEmpty(dto.Telefone))
                {
                    var telefoneNumeros = System.Text.RegularExpressions.Regex.Replace(dto.Telefone, @"\D", "");
                    if (telefoneNumeros.Length < 10 || telefoneNumeros.Length > 11)
                    {
                        return BadRequest(new { message = "Telefone inválido. Inclua o DDD." });
                    }
                    cliente.Telefone = telefoneNumeros;
                }

                cliente.Nome = dto.Nome.Trim();
                cliente.UltimaAtualizacao = DateTime.Now;

                await _context.SaveChangesAsync();


                return Ok(new
                {
                    message = "Perfil atualizado com sucesso!",
                    user = new
                    {
                        id = cliente.Id,
                        nome = cliente.Nome,
                        email = cliente.Email,
                        telefone = cliente.Telefone,
                        role = cliente.Tipo
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao atualizar perfil");
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }

        [HttpGet("perfil")]
        public async Task<IActionResult> GetPerfil()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Token inválido." });
                }

                var cliente = await _context.Clientes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == int.Parse(userId));

                if (cliente == null)
                {
                    return NotFound(new { message = "Cliente não encontrado." });
                }

                return Ok(new
                {
                    id = cliente.Id,
                    nome = cliente.Nome,
                    email = cliente.Email,
                    telefone = cliente.Telefone,
                    endereco = cliente.Endereco,
                    role = cliente.Tipo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao buscar perfil");
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }

        [HttpGet("listar")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> ListarClientes([FromQuery] int page = 1, [FromQuery] int size = 10)
        {
            try
            {
                var skip = (page - 1) * size;

                var clientes = await _context.Clientes
                    .AsNoTracking()
                    .Where(c => c.Tipo == "cliente")
                    .OrderBy(c => c.Nome)
                    .Skip(skip)
                    .Take(size)
                    .Select(c => new
                    {
                        id = c.Id,
                        nome = c.Nome,
                        email = c.Email,
                        telefone = c.Telefone,
                        tipo = c.Tipo,
                        dataCriacao = c.DataCriacao
                    })
                    .ToListAsync();

                var total = await _context.Clientes.CountAsync(c => c.Tipo == "cliente");

                return Ok(new
                {
                    clientes,
                    pagination = new
                    {
                        currentPage = page,
                        pageSize = size,
                        totalItems = total,
                        totalPages = (int)Math.Ceiling(total / (double)size)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao listar clientes");
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> DeletarCliente(int id)
        {
            try
            {
                var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Id == id);

                if (cliente == null)
                {
                    return NotFound(new { message = "Cliente não encontrado." });
                }

                if (cliente.Tipo.ToUpper() == "ADM")
                {
                    return BadRequest(new { message = "Não é possível deletar um administrador." });
                }

                _context.Clientes.Remove(cliente);
                await _context.SaveChangesAsync();


                return Ok(new { message = "Cliente deletado com sucesso." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao deletar cliente");
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }
    }
}
