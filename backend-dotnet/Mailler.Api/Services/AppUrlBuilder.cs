using Mailler.Api.Configuration;

namespace Mailler.Api.Services;

public sealed class AppUrlBuilder(RuntimeOptions runtimeOptions)
{
    public string BuildAppPath(string pathname = "/")
    {
        var normalizedPathname = pathname.StartsWith('/') ? pathname : $"/{pathname}";
        return string.IsNullOrEmpty(runtimeOptions.AppBasePath)
            ? normalizedPathname
            : $"{runtimeOptions.AppBasePath}{normalizedPathname}";
    }

    public string BuildFrontendUrl(string pathname = "/")
    {
        var frontendOrigin = runtimeOptions.FrontendUrl.TrimEnd('/');
        return $"{frontendOrigin}{BuildAppPath(pathname)}";
    }
}