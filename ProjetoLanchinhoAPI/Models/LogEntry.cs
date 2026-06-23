using System.ComponentModel.DataAnnotations;

namespace ProjetoLanchinhoAPI.Models
{
    public class LogEntry
    {
        [Key]
        public int Id { get; set; }
        public LogType LogType { get; set; }
        public LogLevel Level { get; set; }
        public int? UserId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public string? StackTrace { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public string? Metadata { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public enum LogType
    {
        UserAction,
        System,
        Security,
        Error,
        Performance,
        Business
    }
}
