using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.Models
{
    public class ConfiguracaoLoja
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public bool LojaAberta { get; set; } = true;

        public string? MensagemFechamento { get; set; }

        // Horários da semana
        public TimeSpan? SegundaAbertura { get; set; }
        public TimeSpan? SegundaFechamento { get; set; }
        public bool SegundaFechado { get; set; } = false;

        public TimeSpan? TercaAbertura { get; set; }
        public TimeSpan? TercaFechamento { get; set; }
        public bool TercaFechado { get; set; } = false;

        public TimeSpan? QuartaAbertura { get; set; }
        public TimeSpan? QuartaFechamento { get; set; }
        public bool QuartaFechado { get; set; } = false;

        public TimeSpan? QuintaAbertura { get; set; }
        public TimeSpan? QuintaFechamento { get; set; }
        public bool QuintaFechado { get; set; } = false;

        public TimeSpan? SextaAbertura { get; set; }
        public TimeSpan? SextaFechamento { get; set; }
        public bool SextaFechado { get; set; } = false;

        public TimeSpan? SabadoAbertura { get; set; }
        public TimeSpan? SabadoFechamento { get; set; }
        public bool SabadoFechado { get; set; } = false;

        public TimeSpan? DomingoAbertura { get; set; }
        public TimeSpan? DomingoFechamento { get; set; }
        public bool DomingoFechado { get; set; } = false;

        public DateTime UltimaAtualizacao { get; set; } = DateTime.Now;
    }
}
