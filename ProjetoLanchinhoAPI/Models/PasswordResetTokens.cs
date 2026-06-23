namespace ProjetoLanchinhoAPI.Models
{
    public class PasswordResetToken
    {
        public int Id { get; set; }

        public string Token { get; set; } = string.Empty;

        public DateTime ExpiraEm { get; set; }

        public bool Usado { get; set; }

        // Relacionamento
        public int ClienteId { get; set; }
        public Cliente Cliente { get; set; } = null!;
    }
}
