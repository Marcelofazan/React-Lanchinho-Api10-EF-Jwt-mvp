using Microsoft.EntityFrameworkCore;
using ProjetoLanchinhoAPI.Models;

namespace ProjetoLanchinhoAPI.Data
{
    public class MeuDbContext : DbContext
    {
        public MeuDbContext(DbContextOptions<MeuDbContext> options)
            : base(options) { }

        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Produto> Produtos { get; set; }
        public DbSet<ProdutoImage> ProductImages { get; set; }
        public DbSet<Pedido> Pedidos { get; set; }
        public DbSet<ItemPedido> ItensPedido { get; set; }
        public DbSet<Pagamento> Pagamentos { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        public DbSet<LogEntry> LogEntries { get; set; }
        public DbSet<ConfiguracaoLoja> ConfiguracoesLoja { get; set; } // 🆕 ADICIONADO

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configurações de precisão decimal
            modelBuilder.Entity<Produto>().Property(p => p.Preco).HasPrecision(18, 2);
            modelBuilder.Entity<Pagamento>().Property(p => p.ValorTotal).HasPrecision(18, 2);
            modelBuilder.Entity<Pedido>().Property(p => p.Subtotal).HasColumnType("decimal(10,2)");
            modelBuilder.Entity<Pedido>().Property(p => p.TaxaEntrega).HasColumnType("decimal(10,2)");
            modelBuilder.Entity<Pedido>().Property(p => p.TotalFinal).HasColumnType("decimal(10,2)");

            // Configuração LogEntry
            modelBuilder.Entity<LogEntry>(entity =>
            {
                entity.Property(e => e.Action).HasMaxLength(100);
                entity.Property(e => e.Details).HasMaxLength(1000);
                entity.Property(e => e.IpAddress).HasMaxLength(45);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.LogType);
                entity.HasIndex(e => e.UserId);
            });

            // CONFIGURAÇÃO CORRIGIDA PARA CLIENTE
            modelBuilder.Entity<Cliente>(entity =>
            {
                // Configurações básicas
                entity.Property(e => e.Tipo).IsRequired().HasMaxLength(20).HasDefaultValue("cliente");
                entity.HasIndex(e => e.Email).IsUnique();

                // CORREÇÃO: Mapeamento explícito das colunas problemáticas
                entity.Property(e => e.Ativo)
                    .IsRequired()
                    .HasColumnName("Ativo")
                    .HasDefaultValue(true);

                entity.Property(e => e.Endereco)
                    .HasMaxLength(300)
                    .HasColumnName("Endereco")
                    .IsRequired(false);

                // Outras configurações importantes
                entity.Property(e => e.Nome)
                    .IsRequired()
                    .HasMaxLength(100)
                    .HasColumnName("Nome");

                entity.Property(e => e.Email)
                    .IsRequired()
                    .HasMaxLength(150)
                    .HasColumnName("Email");

                entity.Property(e => e.Telefone)
                    .HasMaxLength(15)
                    .HasColumnName("Telefone");

                entity.Property(e => e.SenhaHash)
                    .IsRequired()
                    .HasColumnName("SenhaHash");

                entity.Property(e => e.DataCriacao)
                    .HasColumnName("DataCriacao")
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.UltimaAtualizacao)
                    .HasColumnName("UltimaAtualizacao")
                    .IsRequired(false);

                entity.Property(e => e.TokenRecuperacao)
                    .HasMaxLength(100)
                    .HasColumnName("TokenRecuperacao")
                    .IsRequired(false);

                entity.Property(e => e.TokenExpiraEm)
                    .HasColumnName("TokenExpiraEm")
                    .IsRequired(false);

                // Índice único para telefone
                entity.HasIndex(e => e.Telefone)
                    .IsUnique()
                    .HasDatabaseName("IX_Clientes_Telefone")
                    .HasFilter("[Telefone] IS NOT NULL AND [Telefone] != ''");
            });

            modelBuilder.Entity<ConfiguracaoLoja>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.LojaAberta)
                    .IsRequired()
                    .HasDefaultValue(true);

                entity.Property(e => e.MensagemFechamento)
                    .HasMaxLength(500)
                    .IsRequired(false);

                entity.Property(e => e.UltimaAtualizacao)
                    .IsRequired()
                    .HasDefaultValueSql("GETUTCDATE()");
            });

            modelBuilder.Entity<ConfiguracaoLoja>().HasData(
                new ConfiguracaoLoja
                {
                    Id = 1,
                    LojaAberta = true,
                    MensagemFechamento = "Estamos fechados no momento. Voltamos em breve!",

                    // Segunda e Terça: FECHADO
                    SegundaFechado = true,
                    TercaFechado = true,

                    // Quarta: 19:00 - 22:00
                    QuartaAbertura = new TimeSpan(19, 0, 0),
                    QuartaFechamento = new TimeSpan(22, 0, 0),
                    QuartaFechado = false,

                    // Quinta: 19:00 - 22:00
                    QuintaAbertura = new TimeSpan(19, 0, 0),
                    QuintaFechamento = new TimeSpan(22, 0, 0),
                    QuintaFechado = false,

                    // Sexta: 19:00 - 23:00
                    SextaAbertura = new TimeSpan(19, 0, 0),
                    SextaFechamento = new TimeSpan(23, 0, 0),
                    SextaFechado = false,

                    // Sábado: 19:00 - 23:00
                    SabadoAbertura = new TimeSpan(19, 0, 0),
                    SabadoFechamento = new TimeSpan(23, 0, 0),
                    SabadoFechado = false,

                    // Domingo: 19:00 - 22:00
                    DomingoAbertura = new TimeSpan(19, 0, 0),
                    DomingoFechamento = new TimeSpan(22, 0, 0),
                    DomingoFechado = false,

                    UltimaAtualizacao = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            // Outras configurações mantidas
            modelBuilder.Entity<Pedido>(e =>
            {
                e.Property(p => p.DataPedido).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");
                e.HasIndex(p => p.Codigo).IsUnique();
                e.HasIndex(p => p.ClienteId);
            });

            modelBuilder.Entity<Produto>().HasIndex(p => p.Categoria);

            modelBuilder.Entity<RefreshToken>().HasIndex(e => e.Token).IsUnique();
            modelBuilder.Entity<PasswordResetToken>().HasIndex(e => e.Token).IsUnique();

            // Relacionamentos
            modelBuilder.Entity<ItemPedido>().HasOne(i => i.Pedido).WithMany(p => p.Itens).HasForeignKey(i => i.PedidoId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ItemPedido>().HasOne(i => i.Produto).WithMany(p => p.Itens).HasForeignKey(i => i.ProdutoId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Pagamento>().HasOne(pg => pg.Pedido).WithOne(p => p.Pagamento).HasForeignKey<Pagamento>(pg => pg.PedidoId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Produto>().HasMany(p => p.Imagens).WithOne(img => img.Produto).HasForeignKey(img => img.ProdutoId).OnDelete(DeleteBehavior.Cascade);
        }
    }
}