using System.Text.Json;

namespace Mailler.Api.Models;

public sealed class Setting
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Key { get; set; } = string.Empty;

    public JsonDocument? Value { get; set; }

    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}