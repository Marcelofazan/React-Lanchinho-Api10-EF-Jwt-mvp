using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.DTOs
{
    public class ClienteUpdateDTO
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        [StringLength(100)]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "O telefone é obrigatório.")]
        public string Telefone { get; set; } = string.Empty;

        [Required(ErrorMessage = "O e-mail é obrigatório.")]
        public string Email { get; set; } = string.Empty;

    }
}
