namespace Mailler.Api.Models;

public sealed class User
{
    public int Id { get; set; }

    public string OidcSub { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<EmailAccount> EmailAccounts { get; set; } = new List<EmailAccount>();

    public ICollection<Setting> Settings { get; set; } = new List<Setting>();
}