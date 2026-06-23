namespace ProjetoLanchinhoAPI.Services
{
    public class LocalStorageService : IFileStorageService
    {
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<LocalStorageService> _logger;

        public LocalStorageService(
            IWebHostEnvironment env,
            IHttpContextAccessor httpContextAccessor,
            ILogger<LocalStorageService> logger)
        {
            _env = env;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<string> SalvarArquivoAsync(IFormFile arquivo, string diretorio)
        {
            try
            {
                var ext = Path.GetExtension(arquivo.FileName).ToLowerInvariant();
                var permitidos = new[] { ".jpg", ".jpeg", ".png", ".webp" };

                if (!permitidos.Contains(ext))
                {
                    throw new ArgumentException($"Extensão {ext} não permitida. Use: {string.Join(", ", permitidos)}");
                }

                var nomeArquivo = $"{Guid.NewGuid()}{ext}";

                // Garantir que wwwroot existe
                if (string.IsNullOrEmpty(_env.WebRootPath))
                {
                    throw new InvalidOperationException("WebRootPath não está configurado");
                }

                var pastaDestino = Path.Combine(_env.WebRootPath, diretorio);

                // Criar diretório se não existir
                if (!Directory.Exists(pastaDestino))
                {
                    _logger.LogInformation("Criando diretório: {PastaDestino}", pastaDestino);
                    Directory.CreateDirectory(pastaDestino);
                }

                var caminhoCompleto = Path.Combine(pastaDestino, nomeArquivo);

                _logger.LogInformation("Salvando arquivo em: {CaminhoCompleto}", caminhoCompleto);

                using (var stream = new FileStream(caminhoCompleto, FileMode.Create))
                {
                    await arquivo.CopyToAsync(stream);
                }

                // Verificar se o arquivo foi salvo
                if (!File.Exists(caminhoCompleto))
                {
                    throw new InvalidOperationException($"Falha ao salvar arquivo em {caminhoCompleto}");
                }

                var request = _httpContextAccessor.HttpContext?.Request;
                var urlBase = $"{request?.Scheme}://{request?.Host}";
                var urlCompleta = $"{urlBase}/{diretorio}/{nomeArquivo}";

                _logger.LogInformation("Arquivo salvo com sucesso. URL: {UrlCompleta}", urlCompleta);

                return urlCompleta;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao salvar arquivo: {Message}", ex.Message);
                throw;
            }
        }

        public void ApagarArquivo(string url, string diretorio)
        {
            try
            {
                if (string.IsNullOrEmpty(url)) return;

                var nomeArquivo = Path.GetFileName(new Uri(url).LocalPath);
                var caminhoCompleto = Path.Combine(_env.WebRootPath, diretorio, nomeArquivo);

                if (File.Exists(caminhoCompleto))
                {
                    File.Delete(caminhoCompleto);
                    _logger.LogInformation("Arquivo deletado: {CaminhoCompleto}", caminhoCompleto);
                }
                else
                {
                    _logger.LogWarning("Arquivo não encontrado para deletar: {CaminhoCompleto}", caminhoCompleto);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao deletar arquivo {Url}: {Message}", url, ex.Message);
            }
        }
    }
}
