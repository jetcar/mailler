using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Mailler.Api.Tests;

public sealed class ApiSmokeTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ApiSmokeTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_Returns_Ok_Status()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(payload);
        Assert.Equal("ok", payload["status"]?.ToString());
    }

    [Fact]
    public async Task AuthMe_When_Not_Authenticated_Returns_Unauthorized_Payload()
    {
        var response = await _client.GetAsync("/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(payload);
        Assert.Equal("False", payload["authenticated"]?.ToString());
    }

    [Fact]
    public async Task Accounts_When_Not_Authenticated_Returns_Unauthorized()
    {
        var response = await _client.GetAsync("/api/accounts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Messages_When_Not_Authenticated_Returns_Unauthorized()
    {
        var response = await _client.GetAsync("/api/messages");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthLogin_Without_Oidc_Config_Returns_ServiceUnavailable()
    {
        var response = await _client.GetAsync("/auth/login");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }
}