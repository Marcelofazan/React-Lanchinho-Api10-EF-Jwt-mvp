namespace ProjetoLanchinhoAPI.Models
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime Expiracao { get; set; }

        public int ClienteId { get; set; } // Chave estrangeira
        public Cliente Cliente { get; set; } = null!;
    }
}
