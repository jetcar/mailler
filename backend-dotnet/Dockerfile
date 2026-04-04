FROM node:22-alpine AS frontend-builder

WORKDIR /src/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-build

WORKDIR /src

COPY backend-dotnet/ ./backend-dotnet/
COPY database/ ./database/

RUN dotnet restore ./backend-dotnet/Mailler.Api/Mailler.Api.csproj
RUN dotnet publish ./backend-dotnet/Mailler.Api/Mailler.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=dotnet-build /app/publish ./
COPY --from=dotnet-build /src/database ./database
COPY --from=frontend-builder /src/frontend/dist ./wwwroot

EXPOSE 3000
EXPOSE 25
EXPOSE 587
EXPOSE 465

ENTRYPOINT ["dotnet", "Mailler.Api.dll"]