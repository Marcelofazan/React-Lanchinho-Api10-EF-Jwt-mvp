using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.DTOs;
using ProjetoLanchinhoAPI.Models;
using ProjetoLanchinhoAPI.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ProjetoLanchinhoAPI.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly MeuDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<AuthController> _logger;
        private static readonly TimeSpan TokenTtl = TimeSpan.FromHours(1);

        public AuthController(
            MeuDbContext context,
            IConfiguration configuration,
            IEmailService emailService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test()
        {
            return Ok(new
            {
                message = "API Lanchinho funcionando!",
                timestamp = DateTime.Now,
                version = "2.0.0",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDTO login)
        {
            try
            {
                _logger.LogInformation("=== TENTATIVA DE LOGIN ===");
                _logger.LogInformation("Email recebido: {Email}", login.Email);

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage);
                    _logger.LogWarning("ModelState inválido: {Errors}", string.Join(", ", errors));
                    return BadRequest(new { errors });
                }

                var emailNormalizado = login.Email.ToLower().Trim();
                _logger.LogInformation("Email normalizado: {EmailNorm}", emailNormalizado);

                var cliente = await _context.Clientes
                    .FirstOrDefaultAsync(c => c.Email == emailNormalizado);

                _logger.LogInformation("Cliente encontrado? {Encontrado}", cliente != null);

                if (cliente == null)
                {
                    _logger.LogWarning("Cliente não encontrado para email: {Email}", login.Email);
                    return Unauthorized(new { message = "Email ou senha incorretos." });
                }

                _logger.LogInformation("Cliente ID: {ClienteId}, Ativo: {Ativo}", cliente.Id, cliente.Ativo);
                _logger.LogInformation("SenhaHash presente? {HashPresente}, Tamanho: {Tamanho}",
                    !string.IsNullOrEmpty(cliente.SenhaHash),
                    cliente.SenhaHash?.Length ?? 0);

                if (!cliente.Ativo)
                {
                    _logger.LogWarning("Cliente desativado: {ClienteId}", cliente.Id);
                    return Unauthorized(new { message = "Conta desativada." });
                }

                if (string.IsNullOrEmpty(cliente.SenhaHash))
                {
                    _logger.LogError("SenhaHash está vazia para cliente: {ClienteId}", cliente.Id);
                    return StatusCode(500, new { message = "Erro de configuração da conta." });
                }

                bool senhaValida;
                try
                {
                    senhaValida = BCrypt.Net.BCrypt.Verify(login.Senha, cliente.SenhaHash);
                    _logger.LogInformation("Senha válida? {SenhaValida}", senhaValida);
                }
                catch (Exception bcryptEx)
                {
                    _logger.LogError(bcryptEx, "Erro ao verificar senha com BCrypt para cliente: {ClienteId}", cliente.Id);
                    return StatusCode(500, new { message = "Erro ao validar credenciais.", details = bcryptEx.Message });
                }

                if (!senhaValida)
                {
                    _logger.LogWarning("Senha inválida para cliente: {ClienteId}", cliente.Id);
                    return Unauthorized(new { message = "Email ou senha incorretos." });
                }

                await LimparRefreshTokensExpirados(cliente.Id);

                var jwt = GerarJwt(cliente);
                var refreshToken = await CriarRefreshTokenAsync(cliente.Id);

                _logger.LogInformation("Login bem-sucedido para cliente: {ClienteId}", cliente.Id);

                return Ok(new
                {
                    token = jwt,
                    refreshToken = refreshToken,
                    user = MapUser(cliente),
                    expiresAt = DateTime.UtcNow.Add(TokenTtl) // Mantenha em UTC aqui também
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno no login. Tipo: {TipoErro}, Mensagem: {Mensagem}, StackTrace: {StackTrace}",
                    ex.GetType().Name, ex.Message, ex.StackTrace);
                return StatusCode(500, new
                {
                    message = "Erro interno do servidor.",
                    error = ex.Message,
                    type = ex.GetType().Name
                });
            }
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterDTO dto)
        {
            try
            {
                _logger.LogInformation("=== TENTATIVA DE CADASTRO ===");
                _logger.LogInformation("Nome: {Nome}", dto.Nome);
                _logger.LogInformation("Email: {Email}", dto.Email);
                _logger.LogInformation("Telefone: {Telefone}", dto.Telefone);
                _logger.LogInformation("Endereco: {Endereco}", dto.Endereco);

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage);
                    _logger.LogWarning("ModelState inválido: {Errors}", string.Join(", ", errors));
                    return BadRequest(new { errors });
                }

                var emailNormalizado = dto.Email.ToLower().Trim();
                var telefoneNumeros = LimparTelefone(dto.Telefone);

                _logger.LogInformation("Email normalizado: {EmailNorm}", emailNormalizado);
                _logger.LogInformation("Telefone limpo: {TelefoneNorm}", telefoneNumeros);

                // Verificar duplicados
                var emailExiste = await _context.Clientes.AnyAsync(c => c.Email == emailNormalizado);
                var telefoneExiste = await _context.Clientes.AnyAsync(c => c.Telefone == telefoneNumeros);

                _logger.LogInformation("Email já existe? {EmailExiste}", emailExiste);
                _logger.LogInformation("Telefone já existe? {TelefoneExiste}", telefoneExiste);

                if (emailExiste)
                {
                    _logger.LogWarning("Email já cadastrado: {Email}", emailNormalizado);
                    return Conflict(new { message = "Email já está em uso." });
                }

                if (string.IsNullOrEmpty(telefoneNumeros) || !ValidarTelefoneBrasileiro(telefoneNumeros))
                {
                    _logger.LogWarning("Telefone inválido: {Telefone}", telefoneNumeros);
                    return BadRequest(new { message = "Telefone inválido. Use o formato brasileiro com DDD." });
                }

                if (telefoneExiste)
                {
                    _logger.LogWarning("Telefone já cadastrado: {Telefone}", telefoneNumeros);
                    return Conflict(new { message = "Telefone já está em uso." });
                }

                _logger.LogInformation("Validações passaram. Criando cliente...");

                var senhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha);
                _logger.LogInformation("Senha hasheada com sucesso. Tamanho do hash: {Tamanho}", senhaHash.Length);

                var cliente = new Cliente
                {
                    Nome = dto.Nome.Trim(),
                    Email = emailNormalizado,
                    Telefone = telefoneNumeros,
                    Endereco = dto.Endereco?.Trim(),
                    SenhaHash = senhaHash,
                    Tipo = "cliente",
                    DataCriacao = DateTime.Now,
                    Ativo = true
                };

                _context.Clientes.Add(cliente);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cliente criado com ID: {ClienteId}", cliente.Id);

                var jwt = GerarJwt(cliente);
                var refreshToken = await CriarRefreshTokenAsync(cliente.Id);

                _logger.LogInformation("Cadastro bem-sucedido para cliente: {ClienteId}", cliente.Id);

                return Ok(new
                {
                    token = jwt,
                    refreshToken = refreshToken,
                    user = MapUser(cliente),
                    message = "Cadastro realizado com sucesso!"
                });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Violação de constraint única ao cadastrar. InnerException: {InnerException}",
                    dbEx.InnerException?.Message);
                return Conflict(new
                {
                    message = "Email ou telefone já cadastrado.",
                    details = dbEx.InnerException?.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno no cadastro. Tipo: {TipoErro}, Mensagem: {Mensagem}, StackTrace: {StackTrace}",
                    ex.GetType().Name, ex.Message, ex.StackTrace);
                return StatusCode(500, new
                {
                    message = "Erro interno do servidor.",
                    error = ex.Message,
                    type = ex.GetType().Name
                });
            }
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenDTO dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Token))
                {
                    return BadRequest(new { message = "Refresh token é obrigatório." });
                }

                var refreshToken = await _context.RefreshTokens
                    .Include(r => r.Cliente)
                    .FirstOrDefaultAsync(r => r.Token == dto.Token && r.Expiracao > DateTime.Now);

                if (refreshToken?.Cliente?.Ativo != true)
                {
                    return Unauthorized(new { message = "Refresh token inválido ou expirado." });
                }

                var newJwt = GerarJwt(refreshToken.Cliente);
                var newRefreshToken = await CriarRefreshTokenAsync(refreshToken.ClienteId);

                _context.RefreshTokens.Remove(refreshToken);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    token = newJwt,
                    refreshToken = newRefreshToken,
                    expiresAt = DateTime.UtcNow.Add(TokenTtl) // Mantenha em UTC aqui também
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao renovar token: {Token}", dto.Token);
                return StatusCode(500, new { message = "Erro interno do servidor." });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenDTO dto)
        {
            try
            {
                if (!string.IsNullOrEmpty(dto.Token))
                {
                    var refreshToken = await _context.RefreshTokens
                        .FirstOrDefaultAsync(r => r.Token == dto.Token);

                    if (refreshToken != null)
                    {
                        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                        if (refreshToken.ClienteId.ToString() == userId)
                        {
                            _context.RefreshTokens.Remove(refreshToken);
                            await _context.SaveChangesAsync();
                        }
                    }
                }

                return Ok(new { message = "Logout realizado com sucesso." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no logout");
                return Ok(new { message = "Logout realizado." });
            }
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { message = "Email inválido." });
                }

                var cliente = await _context.Clientes
                    .FirstOrDefaultAsync(c => c.Email.ToLower() == dto.Email.ToLower() && c.Ativo);

                if (cliente != null)
                {
                    var resetToken = Guid.NewGuid().ToString();
                    cliente.TokenRecuperacao = resetToken;
                    cliente.TokenExpiraEm = DateTime.Now.AddHours(1);

                    await _context.SaveChangesAsync();
                    await _emailService.EnviarEmailRecuperacaoAsync(cliente.Email, resetToken);
                }

                return Ok(new { message = "Se o email existir, você receberá instruções para redefinir sua senha." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no forgot password para email: {Email}", dto.Email);
                return StatusCode(500, new { message = "Erro interno do servidor." });
            }
        }

        [HttpPost("alterar-senha")]
        [AllowAnonymous]
        public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaDTO dto)
        {
            try
            {
                _logger.LogInformation("=== TENTATIVA DE ALTERAR SENHA ===");
                _logger.LogInformation("Token recebido: {Token}", dto.Token);
                _logger.LogInformation("Email recebido: {Email}", dto.Email);

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage);
                    _logger.LogWarning("ModelState inválido: {Errors}", string.Join(", ", errors));
                    return BadRequest(new { message = "Dados inválidos.", errors });
                }

                var emailNormalizado = dto.Email.ToLower().Trim();

                var cliente = await _context.Clientes
                    .FirstOrDefaultAsync(c =>
                        c.Email == emailNormalizado &&
                        c.TokenRecuperacao == dto.Token &&
                        c.TokenExpiraEm > DateTime.Now &&
                        c.Ativo);

                if (cliente == null)
                {
                    _logger.LogWarning("Token inválido ou expirado para email: {Email}", dto.Email);
                    return BadRequest(new { message = "Token inválido ou expirado." });
                }

                // Atualizar senha
                cliente.SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha);
                cliente.TokenRecuperacao = null;
                cliente.TokenExpiraEm = null;

                await _context.SaveChangesAsync();

                _logger.LogInformation(" Senha alterada com sucesso para: {Email}", dto.Email);

                return Ok(new { message = "Senha alterada com sucesso!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao alterar senha para email: {Email}", dto.Email);
                return StatusCode(500, new { message = "Erro interno do servidor." });
            }
        }

        [HttpGet("validar-token-reset/{token}")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidarTokenReset(string token)
        {
            try
            {
                _logger.LogInformation("=== VALIDANDO TOKEN DE RESET ===");
                _logger.LogInformation("Token: {Token}", token);

                if (string.IsNullOrWhiteSpace(token))
                {
                    return BadRequest(new { message = "Token não fornecido." });
                }

                var cliente = await _context.Clientes
                    .FirstOrDefaultAsync(c =>
                        c.TokenRecuperacao == token &&
                        c.TokenExpiraEm > DateTime.Now &&
                        c.Ativo);

                if (cliente == null)
                {
                    _logger.LogWarning("Token inválido ou expirado: {Token}", token);
                    return BadRequest(new { message = "Token inválido ou expirado." });
                }

                _logger.LogInformation("Token válido para email: {Email}", cliente.Email);

                return Ok(new
                {
                    email = cliente.Email,
                    message = "Token válido."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao validar token: {Token}", token);
                return StatusCode(500, new { message = "Erro interno do servidor." });
            }
        }



        // --- Métodos Auxiliares ---
        private static string LimparTelefone(string telefone)
        {
            return string.IsNullOrEmpty(telefone) ? "" :
                System.Text.RegularExpressions.Regex.Replace(telefone, @"\D", "");
        }

        private static bool ValidarTelefoneBrasileiro(string telefone)
        {
            if (telefone.Length < 10 || telefone.Length > 11)
                return false;

            var ddd = int.Parse(telefone.Substring(0, 2));
            if (ddd < 11 || ddd > 99)
                return false;

            if (telefone.Length == 11 && telefone[2] != '9')
                return false;

            return true;
        }

        private async Task LimparRefreshTokensExpirados(int clienteId)
        {
            var tokensExpirados = await _context.RefreshTokens
                .Where(r => r.ClienteId == clienteId && r.Expiracao <= DateTime.Now)
                .ToListAsync();

            if (tokensExpirados.Any())
            {
                _context.RefreshTokens.RemoveRange(tokensExpirados);
                await _context.SaveChangesAsync();
            }
        }

        private string GerarJwt(Cliente cliente)
        {
            var keyString = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key não configurada.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            
            // CORREÇÃO 1: Usar UtcNow para o token não expirar antes do tempo
            var expiresAt = DateTime.UtcNow.Add(TokenTtl); 

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, cliente.Id.ToString()),
                new Claim(ClaimTypes.Name, cliente.Nome),
                new Claim(ClaimTypes.Email, cliente.Email),
                
                // SOLUÇÃO: Adicione as duas formas da Role. 
                // Assim, não importa qual o .NET tente ler, ele vai encontrar "ADM"!
                new Claim(ClaimTypes.Role, cliente.Tipo.ToUpper()), // Padrão longo
                
                new Claim("telefone", cliente.Telefone ?? ""),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
            };

            var token = new JwtSecurityToken(
                _configuration["Jwt:Issuer"],
                _configuration["Jwt:Audience"],
                claims,
                expires: expiresAt,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        private async Task<string> CriarRefreshTokenAsync(int clienteId)
        {
            var refresh = new RefreshToken
            {
                Token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
                Expiracao = DateTime.Now.AddDays(30),
                ClienteId = clienteId
            };

            _context.RefreshTokens.Add(refresh);
            await _context.SaveChangesAsync();

            return refresh.Token;
        }

        private object MapUser(Cliente cliente) => new
        {
            id = cliente.Id,
            nome = cliente.Nome,
            email = cliente.Email,
            telefone = cliente.Telefone,
            endereco = cliente.Endereco,
            tipo = cliente.Tipo,
            role = cliente.Tipo?.ToUpper(),
            dataCriacao = cliente.DataCriacao,
            ativo = cliente.Ativo
        };
    }
}
