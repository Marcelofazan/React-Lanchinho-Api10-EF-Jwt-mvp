using System.Security.Cryptography;
using System.Text;

namespace ProjetoLanchinhoAPI.Services
{
    public static class OrderCodeGenerator
    {
        private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

        public static string NewCode(int size = 6)
        {
            var bytes = RandomNumberGenerator.GetBytes(size);
            var sb = new StringBuilder(size);
            foreach (var b in bytes)
                sb.Append(Alphabet[b % Alphabet.Length]);
            return sb.ToString();
        }
    }
}
