namespace ProjetoLanchinhoAPI.DTOs
{
    public class ConfiguracaoLojaDTO
    {
        public int Id { get; set; }
        public bool LojaAberta { get; set; }
        public string? MensagemFechamento { get; set; }
        public Dictionary<string, HorarioDiaDTO> Horarios { get; set; } = new();
    }

    public class HorarioDiaDTO
    {
        public string? Abertura { get; set; }
        public string? Fechamento { get; set; }
        public bool Fechado { get; set; }
    }

    public class StatusLojaDTO
    {
        public bool EstaAberta { get; set; }
        public string Mensagem { get; set; } = string.Empty;
        public string? ProximaAbertura { get; set; }
        public HorarioDiaDTO? HorarioHoje { get; set; }
    }
}
