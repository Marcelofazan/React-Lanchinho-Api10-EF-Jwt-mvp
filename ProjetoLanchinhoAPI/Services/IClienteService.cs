using ProjetoLanchinhoAPI.Models;

namespace ProjetoLanchinhoAPI.Services
{
    public interface IClienteService
    {
        Cliente? Autenticar(string email, string senha);
    }
}
