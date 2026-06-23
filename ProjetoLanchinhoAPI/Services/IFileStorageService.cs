namespace ProjetoLanchinhoAPI.Services
{
    public interface IFileStorageService
    {
        // Salva um arquivo e retorna a URL pública para acessá-lo
        Task<string> SalvarArquivoAsync(IFormFile arquivo, string diretorio);

        // Apaga um arquivo com base na sua URL
        void ApagarArquivo(string url, string diretorio);
    }
}
