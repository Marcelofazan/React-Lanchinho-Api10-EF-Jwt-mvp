using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.DTOs;
using ProjetoLanchinhoAPI.Models;
using ProjetoLanchinhoAPI.Services;
using ProjetoLanchinhoAPI.Filters;
using System.Globalization;

namespace ProjetoLanchinhoAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProdutosController : ControllerBase
    {
        private readonly MeuDbContext _context;
        private readonly IFileStorageService _storageService;
        private readonly ILogger<ProdutosController> _logger;
        private const string DiretorioImagens = "imagens";

        public ProdutosController(
            MeuDbContext context,
            IFileStorageService storageService,
            ILogger<ProdutosController> logger)
        {
            _context = context;
            _storageService = storageService;
            _logger = logger;
        }

        [HttpGet("categorias")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCategorias()
        {
            var categorias = await _context.Produtos
                .Select(p => p.Categoria)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return Ok(categorias);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int page = 1, int pageSize = 100)
        {
            try
            {
                // Buscar todos os produtos do banco
                var todosProdutos = await _context.Produtos
                    .AsNoTracking()
                    .Include(p => p.Imagens)
                    .ToListAsync();

                // Definir ordem de prioridade das categorias
                var ordemCategorias = new Dictionary<string, int>
        {
            { "Artesanais", 1 },
            { "Tradicionais", 2 },
            { "Batatas", 3 },
            { "Bebidas", 4 },
            { "Adicionais", 5 },
            { "Combos", 6 }
        };

                // Ordenar EM MEMÓRIA (não no banco)
                var produtosOrdenados = todosProdutos
                    .OrderBy(p => ordemCategorias.ContainsKey(p.Categoria)
                        ? ordemCategorias[p.Categoria]
                        : 999)
                    .ThenByDescending(p => p.Preco)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new ProdutoReadDTO
                    {
                        Id = p.Id,
                        Nome = p.Nome,
                        Descricao = p.Descricao,
                        Categoria = p.Categoria,
                        Preco = p.Preco,
                        ImagemUrls = p.Imagens.Select(img => img.Url).ToList(),
                        Disponivel = p.Disponivel
                    })
                    .ToList();

                return Ok(produtosOrdenados);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar produtos");
                return StatusCode(500, new { message = "Erro ao buscar produtos", error = ex.Message });
            }
        }

        //  GET por ID
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var produtoDto = await _context.Produtos
                .AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new ProdutoReadDTO
                {
                    Id = p.Id,
                    Nome = p.Nome,
                    Descricao = p.Descricao,
                    Categoria = p.Categoria,
                    Preco = p.Preco,
                    ImagemUrls = p.Imagens.Select(img => img.Url).ToList()
                })
                .FirstOrDefaultAsync();

            if (produtoDto == null)
            {
                return NotFound(new { message = "Produto não encontrado." });
            }

            return Ok(produtoDto);
        }

         //  CREATE
        [HttpPost]
        [Authorize(Roles = "ADM")]
        [RequestFormSizeLimit(valueCountLimit: 4000)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create([FromForm] ProdutoCreateUpdateDTO dto, [FromForm] List<IFormFile> imagens)
        {
            try
            {
                _logger.LogInformation("=== CRIANDO NOVO PRODUTO ===");
                _logger.LogInformation("Nome: {Nome}, Categoria: {Categoria}, Preço (string): {Preco}",
                    dto.Nome, dto.Categoria, dto.Preco);

                if (!ModelState.IsValid) return BadRequest(ModelState);


                if (!decimal.TryParse(dto.Preco, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal preco))
                {
                    _logger.LogWarning("Preço inválido recebido: {Preco}", dto.Preco);
                    return BadRequest(new { message = "Preço inválido. Use ponto (.) para separar decimais. Exemplo: 35.50" });
                }

                if (preco <= 0)
                {
                    return BadRequest(new { message = "Preço deve ser maior que zero." });
                }

                _logger.LogInformation("Preço convertido com sucesso: {Preco}", preco);

                if (await _context.Produtos.AnyAsync(p => p.Nome == dto.Nome))
                    return BadRequest(new { message = "Já existe um produto com esse nome." });

                var p = new Produto
                {
                    Tipo = dto.Tipo,
                    Nome = dto.Nome,
                    Descricao = dto.Descricao ?? string.Empty,
                    Categoria = dto.Categoria,
                    Preco = preco
                };

                _context.Produtos.Add(p);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Produto criado com ID: {Id}, Preço: {Preco}", p.Id, p.Preco);

                if (imagens?.Any() == true)
                {
                    _logger.LogInformation(" Salvando {Count} imagens...", imagens.Count);
                    foreach (var img in imagens)
                    {
                        var url = await _storageService.SalvarArquivoAsync(img, DiretorioImagens);
                        _context.ProductImages.Add(new ProdutoImage { Url = url, ProdutoId = p.Id });
                    }
                    await _context.SaveChangesAsync();
                    _logger.LogInformation(" Imagens salvas com sucesso");
                }

                var actionResult = await GetById(p.Id);
                if (actionResult is OkObjectResult okResult)
                {
                    return CreatedAtAction(nameof(GetById), new { id = p.Id }, okResult.Value);
                }

                return BadRequest(new { message = "Não foi possível criar o produto." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erro ao criar produto");
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }


        [HttpPut("{id:int}")]
        [Authorize(Roles = "ADM")]
        [RequestFormSizeLimit(valueCountLimit: 4000)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Update(int id, [FromForm] ProdutoCreateUpdateDTO dto, [FromForm] List<IFormFile> imagens)
        {
            try
            {
                _logger.LogInformation("=== ATUALIZANDO PRODUTO ID: {Id} (FormData) ===", id);
                _logger.LogInformation("Preço recebido (string): {Preco}", dto.Preco);

                if (!ModelState.IsValid) return BadRequest(ModelState);

                if (!decimal.TryParse(dto.Preco, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal preco))
                {
                    _logger.LogWarning("Preço inválido recebido: {Preco}", dto.Preco);
                    return BadRequest(new { message = "Preço inválido. Use ponto (.) para separar decimais. Exemplo: 35.50" });
                }

                if (preco <= 0)
                {
                    return BadRequest(new { message = "Preço deve ser maior que zero." });
                }

                _logger.LogInformation(" Preço convertido com sucesso: {Preco}", preco);

                var existing = await _context.Produtos.Include(x => x.Imagens).FirstOrDefaultAsync(x => x.Id == id);
                if (existing == null) return NotFound(new { message = "Produto não encontrado." });

                existing.Tipo = dto.Tipo;
                existing.Nome = dto.Nome;
                existing.Descricao = dto.Descricao ?? string.Empty;
                existing.Categoria = dto.Categoria;
                existing.Preco = preco;

                _logger.LogInformation("Produto atualizado - Preço: {Preco}", existing.Preco);

                if (imagens?.Any() == true)
                {
                    _logger.LogInformation(" Substituindo imagens...");
                    foreach (var img in existing.Imagens)
                    {
                        _storageService.ApagarArquivo(img.Url, DiretorioImagens);
                    }
                    _context.ProductImages.RemoveRange(existing.Imagens);

                    foreach (var img in imagens)
                    {
                        var url = await _storageService.SalvarArquivoAsync(img, DiretorioImagens);
                        _context.ProductImages.Add(new ProdutoImage { Url = url, ProdutoId = existing.Id });
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation(" Produto atualizado com sucesso");

                var actionResult = await GetById(existing.Id);
                if (actionResult is OkObjectResult okResult)
                {
                    return Ok(okResult.Value);
                }

                return NotFound(new { message = "Não foi possível encontrar o produto após a atualização." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao atualizar produto ID: {Id}", id);
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }

        [HttpPatch("{id}/disponibilidade")]
        public async Task<IActionResult> ToggleDisponibilidade(int id)
        {
            try
            {
                var produto = await _context.Produtos.FindAsync(id);

                if (produto == null)
                {
                    return NotFound(new { message = "Produto não encontrado" });
                }

                // Toggle do status
                produto.Disponivel = !produto.Disponivel;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    id = produto.Id,
                    disponivel = produto.Disponivel,
                    message = produto.Disponivel
                        ? "Produto marcado como disponível"
                        : "Produto marcado como indisponível"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao atualizar disponibilidade", error = ex.Message });
            }
        }


        [HttpPatch("{id:int}")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> UpdateDados(int id, [FromBody] ProdutoCreateUpdateDTO dto)
        {
            try
            {
                _logger.LogInformation("=== ATUALIZANDO DADOS DO PRODUTO ID: {Id} (JSON) ===", id);
                _logger.LogInformation("Dados recebidos: {@DTO}", dto);

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("ModelState inválido: {@Errors}", ModelState);
                    return BadRequest(ModelState);
                }


                if (!decimal.TryParse(dto.Preco, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal preco))
                {
                    _logger.LogWarning("Preço inválido recebido: {Preco}", dto.Preco);
                    return BadRequest(new { message = "Preço inválido. Use ponto (.) para separar decimais." });
                }

                if (preco <= 0)
                {
                    return BadRequest(new { message = "Preço deve ser maior que zero." });
                }

                var existing = await _context.Produtos.FirstOrDefaultAsync(x => x.Id == id);
                if (existing == null)
                {
                    _logger.LogWarning("Produto ID {Id} não encontrado", id);
                    return NotFound(new { message = "Produto não encontrado." });
                }

                existing.Tipo = dto.Tipo;
                existing.Nome = dto.Nome;
                existing.Descricao = dto.Descricao ?? string.Empty;
                existing.Categoria = dto.Categoria;
                existing.Preco = preco;

                await _context.SaveChangesAsync();
                _logger.LogInformation(" Dados do produto ID {Id} atualizados com sucesso, Preço: {Preco}", id, existing.Preco);

                var actionResult = await GetById(existing.Id);
                if (actionResult is OkObjectResult okResult)
                {
                    return Ok(okResult.Value);
                }

                return NotFound(new { message = "Não foi possível encontrar o produto após a atualização." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao atualizar dados do produto ID: {Id}", id);
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }

        //  ATUALIZAR APENAS IMAGENS
        [HttpPost("{id:int}/imagens")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> AtualizarImagens(int id, [FromForm] List<IFormFile> imagens)
        {
            try
            {
                _logger.LogInformation("=== ATUALIZANDO IMAGENS DO PRODUTO ID: {Id} ===", id);

                if (imagens == null || !imagens.Any())
                {
                    return BadRequest(new { message = "Nenhuma imagem foi enviada." });
                }

                var existing = await _context.Produtos.Include(x => x.Imagens).FirstOrDefaultAsync(x => x.Id == id);
                if (existing == null)
                {
                    _logger.LogWarning("Produto ID {Id} não encontrado", id);
                    return NotFound(new { message = "Produto não encontrado." });
                }

                _logger.LogInformation(" Removendo {Count} imagens antigas...", existing.Imagens.Count);
                // Remover imagens antigas
                foreach (var img in existing.Imagens)
                {
                    _storageService.ApagarArquivo(img.Url, DiretorioImagens);
                }
                _context.ProductImages.RemoveRange(existing.Imagens);

                _logger.LogInformation(" Salvando {Count} novas imagens...", imagens.Count);
                // Adicionar novas imagens
                foreach (var img in imagens)
                {
                    var url = await _storageService.SalvarArquivoAsync(img, DiretorioImagens);
                    _context.ProductImages.Add(new ProdutoImage { Url = url, ProdutoId = existing.Id });
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation(" Imagens atualizadas com sucesso");

                return Ok(new
                {
                    message = "Imagens atualizadas com sucesso!",
                    totalImagens = imagens.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, " Erro ao atualizar imagens do produto ID: {Id}", id);
                return StatusCode(500, new { message = "Erro interno do servidor.", error = ex.Message });
            }
        }
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> Delete(int id)
        {
            var errosImagens = new List<string>();
            var imagensDeletadas = new List<string>();

            try
            {
                _logger.LogInformation("=== DELETANDO PRODUTO ID: {Id} ===", id);

                var p = await _context.Produtos
                    .Include(x => x.Imagens)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (p == null)
                {
                    _logger.LogWarning("Produto ID {Id} não encontrado", id);
                    return NotFound(new { message = "Produto não encontrado." });
                }

                _logger.LogInformation("Produto: {Nome}, Total de imagens: {Count}", p.Nome, p.Imagens.Count);

                foreach (var img in p.Imagens.ToList())
                {
                    try
                    {
                        _logger.LogInformation("Tentando deletar imagem: {Url}", img.Url);
                        _storageService.ApagarArquivo(img.Url, DiretorioImagens);
                        imagensDeletadas.Add(img.Url);
                        _logger.LogInformation("  Imagem deletada: {Url}", img.Url);
                    }
                    catch (FileNotFoundException)
                    {
                        // Arquivo não existe, mas tudo bem
                        _logger.LogWarning(" Arquivo não encontrado (ok): {Url}", img.Url);
                        imagensDeletadas.Add(img.Url);
                    }
                    catch (DirectoryNotFoundException)
                    {
                        // Diretório não existe, mas tudo bem
                        _logger.LogWarning("  Diretório não encontrado (ok): {Url}", img.Url);
                        imagensDeletadas.Add(img.Url);
                    }
                    catch (UnauthorizedAccessException ex)
                    {
                        _logger.LogError(ex, " Sem permissão para deletar: {Url}", img.Url);
                        errosImagens.Add($"{img.Url}: Sem permissão");
                    }
                    catch (IOException ex)
                    {
                        _logger.LogError(ex, "  Erro de I/O ao deletar: {Url}", img.Url);
                        errosImagens.Add($"{img.Url}: Arquivo em uso ou erro de I/O");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, " Erro inesperado ao deletar: {Url}", img.Url);
                        errosImagens.Add($"{img.Url}: {ex.Message}");
                    }
                }

                _logger.LogInformation("Removendo {Count} imagens do banco...", p.Imagens.Count);
                _context.ProductImages.RemoveRange(p.Imagens);

                _logger.LogInformation("Removendo produto do banco...");
                _context.Produtos.Remove(p);

                _logger.LogInformation("Salvando alterações...");
                await _context.SaveChangesAsync();

                _logger.LogInformation(" Produto ID {Id} removido com sucesso!", id);

                return Ok(new
                {
                    message = errosImagens.Any()
                        ? $"Produto excluído, mas {errosImagens.Count} imagem(ns) não puderam ser deletadas do disco."
                        : "Produto excluído com sucesso!",
                    sucesso = true,
                    imagensDeletadas = imagensDeletadas.Count,
                    imagensComErro = errosImagens.Count,
                    detalhesErros = errosImagens.Any() ? errosImagens : null
                });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "❌ Erro ao salvar no banco ao deletar produto ID: {Id}", id);
                return StatusCode(500, new
                {
                    message = "Erro ao remover produto do banco de dados.",
                    error = dbEx.InnerException?.Message ?? dbEx.Message,
                    imagensDeletadas = imagensDeletadas.Count,
                    imagensComErro = errosImagens
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ ERRO CRÍTICO ao deletar produto ID: {Id}", id);
                return StatusCode(500, new
                {
                    message = "Erro crítico ao excluir produto.",
                    error = ex.Message,
                    type = ex.GetType().Name,
                    innerError = ex.InnerException?.Message,
                    imagensDeletadas = imagensDeletadas.Count,
                    imagensComErro = errosImagens
                });
            }
        }
    }
}
