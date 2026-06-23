using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.Models
{
    public class Cliente
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "O tipo do cliente é obrigatório")]
        [StringLength(20, ErrorMessage = "O tipo não pode exceder 20 caracteres")]
        public string Tipo { get; set; } = "cliente";

        [Required(ErrorMessage = "O nome do cliente é obrigatório")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 100 caracteres")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "O email do cliente é obrigatório")]
        [EmailAddress(ErrorMessage = "O email informado não é válido")]
        [StringLength(150, ErrorMessage = "O email não pode exceder 150 caracteres")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "A senha é obrigatória")]
        public string SenhaHash { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Formato de telefone inválido")]
        [StringLength(15, ErrorMessage = "Telefone muito longo")]
        public string Telefone { get; set; } = string.Empty;

        [StringLength(300, ErrorMessage = "Endereço muito longo")]
        public string? Endereco { get; set; }

        // Campos para recuperação de senha
        public string? TokenRecuperacao { get; set; }
        public DateTime? TokenExpiraEm { get; set; }

        // Campos de auditoria
        public DateTime DataCriacao { get; set; } = DateTime.Now;
        public DateTime? UltimaAtualizacao { get; set; }
        public bool Ativo { get; set; } = true;

        // Relacionamentos
        public ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

        // Método para atualizar dados
        public void AtualizarDados(string? nome = null, string? telefone = null, string? endereco = null)
        {
            if (!string.IsNullOrWhiteSpace(nome))
                Nome = nome.Trim();

            if (!string.IsNullOrWhiteSpace(telefone))
                Telefone = telefone.Trim();

            if (endereco != null)
                Endereco = endereco.Trim();

            UltimaAtualizacao = DateTime.Now;
        }
    }
}
