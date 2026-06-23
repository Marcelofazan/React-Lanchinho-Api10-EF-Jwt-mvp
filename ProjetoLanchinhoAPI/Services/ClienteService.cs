using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.Models;

namespace ProjetoLanchinhoAPI.Services
{
    public class ClienteService : IClienteService
    {
        private readonly MeuDbContext _context;

        public ClienteService(MeuDbContext context)
        {
            _context = context;
        }

        public Cliente? Autenticar(string email, string senha)
        {
            return _context.Clientes
                .FirstOrDefault(c => c.Email == email && c.SenhaHash == senha);
        }
    }
}
