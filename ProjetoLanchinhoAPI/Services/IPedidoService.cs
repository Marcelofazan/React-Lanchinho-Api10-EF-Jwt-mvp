using ProjetoLanchinhoAPI.DTOs;
using ProjetoLanchinhoAPI.Models;

namespace ProjetoLanchinhoAPI.Services
{
    public interface IPedidoService
    {
        Task<Pedido> CriarPedidoAsync(PedidoCreateDTO dto);
    }
}
