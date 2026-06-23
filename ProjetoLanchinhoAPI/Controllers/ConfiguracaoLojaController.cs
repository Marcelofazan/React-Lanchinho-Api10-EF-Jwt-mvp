using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.DTOs;
using ProjetoLanchinhoAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ProjetoLanchinhoAPI.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class ConfiguracaoLojaController : ControllerBase
    {
        private readonly MeuDbContext _context;
        private readonly ILogger<ConfiguracaoLojaController> _logger;

        public ConfiguracaoLojaController(MeuDbContext context, ILogger<ConfiguracaoLojaController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ===================================================================
        // GET: api/ConfiguracaoLoja/status
        // Retorna o status atual da loja (aberta/fechada)
        // ===================================================================
        [HttpGet("status")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                var config = await _context.ConfiguracoesLoja.FirstOrDefaultAsync();

                if (config == null)
                {
                    return NotFound(new { message = "Configuração não encontrada." });
                }

                var agora = DateTime.Now;
                var diaSemana = agora.DayOfWeek;

                var status = VerificarStatusLoja(config, agora, diaSemana);

                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao verificar status da loja");
                return StatusCode(500, new { message = "Erro ao verificar status." });
            }
        }

        // ===================================================================
        // GET: api/ConfiguracaoLoja
        // Retorna toda a configuração da loja (horários, status, etc)
        // ===================================================================
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetConfiguracao()
        {
            try
            {
                var config = await _context.ConfiguracoesLoja.FirstOrDefaultAsync();

                if (config == null)
                {
                    return NotFound(new { message = "Configuração não encontrada." });
                }

                var dto = MapearParaDTO(config);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar configuração");
                return StatusCode(500, new { message = "Erro ao buscar configuração." });
            }
        }

        // ===================================================================
        // PUT: api/ConfiguracaoLoja
        // Atualiza toda a configuração (horários e mensagem)
        // ===================================================================
        [HttpPut]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> AtualizarConfiguracao([FromBody] ConfiguracaoLojaDTO dto)
        {
            try
            {
                var config = await _context.ConfiguracoesLoja.FirstOrDefaultAsync();

                if (config == null)
                {
                    config = new ConfiguracaoLoja { Id = 1 };
                    _context.ConfiguracoesLoja.Add(config);
                }

                config.LojaAberta = dto.LojaAberta;
                config.MensagemFechamento = dto.MensagemFechamento;

                // Atualizar horários de cada dia
                foreach (var horario in dto.Horarios)
                {
                    AtualizarHorarioDia(config, horario.Key, horario.Value);
                }

                config.UltimaAtualizacao = DateTime.Now;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Configuração da loja atualizada com sucesso");
                return Ok(new { message = "Configuração atualizada com sucesso!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao atualizar configuração");
                return StatusCode(500, new { message = "Erro ao atualizar configuração." });
            }
        }

        // ===================================================================
        // PUT: api/ConfiguracaoLoja/toggle
        // Abre ou fecha a loja manualmente (override dos horários)
        // ===================================================================
        [HttpPut("toggle")]
        [Authorize(Roles = "ADM")]
        public async Task<IActionResult> ToggleStatus([FromBody] bool abrir)
        {
            try
            {
                var config = await _context.ConfiguracoesLoja.FirstOrDefaultAsync();

                if (config == null)
                {
                    return NotFound(new { message = "Configuração não encontrada." });
                }

                config.LojaAberta = abrir;
                config.UltimaAtualizacao = DateTime.Now;

                await _context.SaveChangesAsync();

                var mensagem = abrir ? "Loja aberta com sucesso!" : "Loja fechada com sucesso!";
                _logger.LogInformation($"Status da loja alterado: {mensagem}");

                return Ok(new { message = mensagem, lojaAberta = config.LojaAberta });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao alternar status da loja");
                return StatusCode(500, new { message = "Erro ao alternar status." });
            }
        }

        // ===================================================================
        // MÉTODOS AUXILIARES PRIVADOS
        // ===================================================================


        private StatusLojaDTO VerificarStatusLoja(ConfiguracaoLoja config, DateTime agora, DayOfWeek diaSemana)
        {
            var status = new StatusLojaDTO
            {
                EstaAberta = false,
                Mensagem = config.MensagemFechamento ?? "Estamos fechados.",
                HorarioHoje = ObterHorarioDia(config, diaSemana)
            };

            // Se loja está manualmente fechada (override)
            if (!config.LojaAberta)
            {
                return status;
            }

            var (abertura, fechamento, fechado) = ObterHorarios(config, diaSemana);

            // Se o dia está marcado como fechado
            if (fechado || abertura == null || fechamento == null)
            {
                status.Mensagem = "Fechado hoje.";
                status.ProximaAbertura = CalcularProximaAbertura(config, agora);
                return status;
            }

            var horaAtual = agora.TimeOfDay;

            // Verificar se está dentro do horário de funcionamento
            if (horaAtual >= abertura && horaAtual <= fechamento)
            {
                status.EstaAberta = true;
                status.Mensagem = $"Aberto até {fechamento:hh\\:mm}";
            }
            else if (horaAtual < abertura)
            {
                status.Mensagem = $"Abre às {abertura:hh\\:mm}";
            }
            else
            {
                status.Mensagem = "Fechado.";
                status.ProximaAbertura = CalcularProximaAbertura(config, agora);
            }

            return status;
        }


        private (TimeSpan?, TimeSpan?, bool) ObterHorarios(ConfiguracaoLoja config, DayOfWeek dia)
        {
            return dia switch
            {
                DayOfWeek.Monday => (config.SegundaAbertura, config.SegundaFechamento, config.SegundaFechado),
                DayOfWeek.Tuesday => (config.TercaAbertura, config.TercaFechamento, config.TercaFechado),
                DayOfWeek.Wednesday => (config.QuartaAbertura, config.QuartaFechamento, config.QuartaFechado),
                DayOfWeek.Thursday => (config.QuintaAbertura, config.QuintaFechamento, config.QuintaFechado),
                DayOfWeek.Friday => (config.SextaAbertura, config.SextaFechamento, config.SextaFechado),
                DayOfWeek.Saturday => (config.SabadoAbertura, config.SabadoFechamento, config.SabadoFechado),
                DayOfWeek.Sunday => (config.DomingoAbertura, config.DomingoFechamento, config.DomingoFechado),
                _ => (null, null, true)
            };
        }

        /// <summary>
        /// Obtém o horário de um dia específico formatado como DTO
        /// </summary>
        private HorarioDiaDTO ObterHorarioDia(ConfiguracaoLoja config, DayOfWeek dia)
        {
            var (abertura, fechamento, fechado) = ObterHorarios(config, dia);

            return new HorarioDiaDTO
            {
                Abertura = abertura?.ToString(@"hh\:mm"),
                Fechamento = fechamento?.ToString(@"hh\:mm"),
                Fechado = fechado
            };
        }


        private string? CalcularProximaAbertura(ConfiguracaoLoja config, DateTime agora)
        {
            for (int i = 1; i <= 7; i++)
            {
                var proximoDia = agora.AddDays(i).DayOfWeek;
                var (abertura, _, fechado) = ObterHorarios(config, proximoDia);

                if (!fechado && abertura != null)
                {
                    var nomeDia = ObterNomeDia(proximoDia);
                    return $"{nomeDia} às {abertura:hh\\:mm}";
                }
            }

            return null;
        }


        private string ObterNomeDia(DayOfWeek dia)
        {
            return dia switch
            {
                DayOfWeek.Monday => "Segunda-feira",
                DayOfWeek.Tuesday => "Terça-feira",
                DayOfWeek.Wednesday => "Quarta-feira",
                DayOfWeek.Thursday => "Quinta-feira",
                DayOfWeek.Friday => "Sexta-feira",
                DayOfWeek.Saturday => "Sábado",
                DayOfWeek.Sunday => "Domingo",
                _ => ""
            };
        }

        /// Mapeia a entidade ConfiguracaoLoja para DTO
        private ConfiguracaoLojaDTO MapearParaDTO(ConfiguracaoLoja config)
        {
            return new ConfiguracaoLojaDTO
            {
                Id = config.Id,
                LojaAberta = config.LojaAberta,
                MensagemFechamento = config.MensagemFechamento,
                Horarios = new Dictionary<string, HorarioDiaDTO>
                {
                    ["segunda"] = new HorarioDiaDTO
                    {
                        Abertura = config.SegundaAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.SegundaFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.SegundaFechado
                    },
                    ["terca"] = new HorarioDiaDTO
                    {
                        Abertura = config.TercaAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.TercaFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.TercaFechado
                    },
                    ["quarta"] = new HorarioDiaDTO
                    {
                        Abertura = config.QuartaAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.QuartaFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.QuartaFechado
                    },
                    ["quinta"] = new HorarioDiaDTO
                    {
                        Abertura = config.QuintaAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.QuintaFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.QuintaFechado
                    },
                    ["sexta"] = new HorarioDiaDTO
                    {
                        Abertura = config.SextaAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.SextaFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.SextaFechado
                    },
                    ["sabado"] = new HorarioDiaDTO
                    {
                        Abertura = config.SabadoAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.SabadoFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.SabadoFechado
                    },
                    ["domingo"] = new HorarioDiaDTO
                    {
                        Abertura = config.DomingoAbertura?.ToString(@"hh\:mm"),
                        Fechamento = config.DomingoFechamento?.ToString(@"hh\:mm"),
                        Fechado = config.DomingoFechado
                    }
                }
            };
        }

        /// Atualiza os horários de um dia específico
        private void AtualizarHorarioDia(ConfiguracaoLoja config, string dia, HorarioDiaDTO horario)
        {
            TimeSpan? abertura = horario.Abertura != null ? TimeSpan.Parse(horario.Abertura) : null;
            TimeSpan? fechamento = horario.Fechamento != null ? TimeSpan.Parse(horario.Fechamento) : null;

            switch (dia.ToLower())
            {
                case "segunda":
                    config.SegundaAbertura = abertura;
                    config.SegundaFechamento = fechamento;
                    config.SegundaFechado = horario.Fechado;
                    break;
                case "terca":
                    config.TercaAbertura = abertura;
                    config.TercaFechamento = fechamento;
                    config.TercaFechado = horario.Fechado;
                    break;
                case "quarta":
                    config.QuartaAbertura = abertura;
                    config.QuartaFechamento = fechamento;
                    config.QuartaFechado = horario.Fechado;
                    break;
                case "quinta":
                    config.QuintaAbertura = abertura;
                    config.QuintaFechamento = fechamento;
                    config.QuintaFechado = horario.Fechado;
                    break;
                case "sexta":
                    config.SextaAbertura = abertura;
                    config.SextaFechamento = fechamento;
                    config.SextaFechado = horario.Fechado;
                    break;
                case "sabado":
                    config.SabadoAbertura = abertura;
                    config.SabadoFechamento = fechamento;
                    config.SabadoFechado = horario.Fechado;
                    break;
                case "domingo":
                    config.DomingoAbertura = abertura;
                    config.DomingoFechamento = fechamento;
                    config.DomingoFechado = horario.Fechado;
                    break;
            }
        }
    }
}
