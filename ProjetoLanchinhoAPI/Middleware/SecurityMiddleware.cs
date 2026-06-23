using System.Collections.Concurrent;

namespace ProjetoLanchinhoAPI.Middleware
{
    public class SecurityMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SecurityMiddleware> _logger;

        // Cache simples para rate limiting
        private static readonly ConcurrentDictionary<string, List<DateTime>> _requestCounts = new();

        public SecurityMiddleware(RequestDelegate next, ILogger<SecurityMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var clientIp = GetClientIpAddress(context);

            try
            {
                // Rate limiting básico
                if (!CheckRateLimit(clientIp))
                {
                    context.Response.StatusCode = 429;
                    await context.Response.WriteAsync("Muitas requisições. Tente novamente em alguns minutos.");
                    return;
                }

                // Adicionar headers de segurança
                AddSecurityHeaders(context);

                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no middleware de segurança para IP {ClientIp}", clientIp);
                throw;
            }
        }

        private bool CheckRateLimit(string clientIp)
        {
            var key = $"rate_limit_{clientIp}";
            var now = DateTime.Now;

            var requests = _requestCounts.GetOrAdd(key, _ => new List<DateTime>());

            lock (requests)
            {
                // Remove requisições antigas (últimos 5 minutos)
                requests.RemoveAll(r => now.Subtract(r).TotalMinutes > 5);

                // Verifica se excedeu o limite (100 requisições por 5 minutos)
                if (requests.Count >= 100)
                {
                    return false;
                }

                requests.Add(now);
            }

            return true;
        }

        private void AddSecurityHeaders(HttpContext context)
        {
            var headers = context.Response.Headers;

            headers["X-Frame-Options"] = "DENY";
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-XSS-Protection"] = "1; mode=block";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        }

        private string GetClientIpAddress(HttpContext context)
        {
            var xForwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(xForwardedFor))
            {
                return xForwardedFor.Split(',')[0].Trim();
            }

            return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }

    // Extension method para facilitar o uso
    public static class SecurityMiddlewareExtensions
    {
        public static IApplicationBuilder UseSecurityMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SecurityMiddleware>();
        }
    }
}
