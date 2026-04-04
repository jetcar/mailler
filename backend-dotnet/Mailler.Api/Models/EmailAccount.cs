namespace Mailler.Api.Models;

public sealed class EmailAccount
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string EmailAddress { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}