namespace ProjetoLanchinhoAPI.Services
{
    public interface IAdvancedLoggingService
    {
        Task LogUserActionAsync(int? userId, string action, string details, string? ipAddress = null);
        Task LogSystemEventAsync(string eventType, string message, object? data = null);
        Task LogSecurityEventAsync(string eventType, string ipAddress, string details, int? userId = null);
        Task LogErrorAsync(Exception exception, string context, int? userId = null);
    }

    public class AdvancedLoggingService : IAdvancedLoggingService
    {
        private readonly ILogger<AdvancedLoggingService> _logger;

        public AdvancedLoggingService(ILogger<AdvancedLoggingService> logger)
        {
            _logger = logger;
        }

        public async Task LogUserActionAsync(int? userId, string action, string details, string? ipAddress = null)
        {
            try
            {
                _logger.LogInformation("USER ACTION: UserId={UserId}, Action={Action}, Details={Details}, IP={IpAddress}",
                    userId, action, details, ipAddress ?? "unknown");

                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao registrar ação do usuário: {Action}", action);
            }
        }

        public async Task LogSystemEventAsync(string eventType, string message, object? data = null)
        {
            try
            {
                var dataString = data?.ToString() ?? "null";
                _logger.LogInformation("SYSTEM EVENT: Type={EventType}, Message={Message}, Data={Data}",
                    eventType, message, dataString);

                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao registrar evento do sistema: {EventType}", eventType);
            }
        }

        public async Task LogSecurityEventAsync(string eventType, string ipAddress, string details, int? userId = null)
        {
            try
            {
                _logger.LogWarning("SECURITY EVENT: Type={EventType}, IP={IpAddress}, Details={Details}, UserId={UserId}",
                    eventType, ipAddress, details, userId);

                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao registrar evento de segurança: {EventType}", eventType);
            }
        }

        public async Task LogErrorAsync(Exception exception, string context, int? userId = null)
        {
            try
            {
                _logger.LogError(exception, "ERROR: Context={Context}, UserId={UserId}", context, userId);

                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao registrar erro: {Context}", context);
            }
        }
    }

    // Extension method para registrar o serviço
    public static class LoggingServiceExtensions
    {
        public static IServiceCollection AddAdvancedLogging(this IServiceCollection services)
        {
            services.AddScoped<IAdvancedLoggingService, AdvancedLoggingService>();
            return services;
        }
    }
}
