using System.ComponentModel.DataAnnotations.Schema;

namespace ProjetoLanchinhoAPI.Models
{
    [Table("product_images")]
    public class ProdutoImage
    {
        public int Id { get; set; }

        [Column("produto_id")]
        public int ProdutoId { get; set; }

        public string Url { get; set; } = string.Empty;
        public Produto? Produto { get; set; }
    }

}
