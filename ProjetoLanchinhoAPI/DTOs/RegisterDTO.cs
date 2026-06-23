using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.DTOs
{
    public class RegisterDTO
    {
        [Required(ErrorMessage = "Nome é obrigatório.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Nome deve ter entre 2 e 100 caracteres.")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "Telefone é obrigatório.")]
        [RegularExpression(@"^(\(?\d{2}\)?\s?)?9?\d{8}$", ErrorMessage = "Formato de telefone inválido.")]
        public string Telefone { get; set; } = string.Empty;

        [Required(ErrorMessage = "E-mail é obrigatório.")]
        [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
        [StringLength(150, ErrorMessage = "E-mail muito longo.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Endereço é obrigatório.")]
        [StringLength(300, MinimumLength = 5, ErrorMessage = "Endereço deve ter entre 5 e 300 caracteres.")]
        public string Endereco { get; set; } = string.Empty;

        [Required(ErrorMessage = "Senha é obrigatória.")]
        [MinLength(6, ErrorMessage = "Senha deve ter pelo menos 6 caracteres.")]
        [StringLength(100, ErrorMessage = "Senha muito longa.")]
        public string Senha { get; set; } = string.Empty;

        // Opcional: só para o Admin usar
        [StringLength(20)]
        public string Tipo { get; set; } = "cliente";
    }
}
