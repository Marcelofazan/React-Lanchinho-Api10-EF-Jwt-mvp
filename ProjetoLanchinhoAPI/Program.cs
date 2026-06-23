using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi;
using ProjetoLanchinhoAPI.Data;
using ProjetoLanchinhoAPI.Services;
using System.Text;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins("http://localhost:3000",
                         "https://localhost:3000")
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
// Configuração corrigida do OpenAPI para .NET 9
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        var jwtSecurityScheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = JwtBearerDefaults.AuthenticationScheme.ToLowerInvariant(),
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = HeaderNames.Authorization
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
        {
            [JwtBearerDefaults.AuthenticationScheme] = jwtSecurityScheme
        };

        var schemeReference = new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, document);
        var securityRequirement = new OpenApiSecurityRequirement { [schemeReference] = new List<string>() };
        document.Security = new List<OpenApiSecurityRequirement> { securityRequirement };

        return Task.CompletedTask;
    });
});

builder.Services.AddDbContext<MeuDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("CoxexaoDb")));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IPedidoService, PedidoService>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IGoogleSheetsService, GoogleSheetsService>();
builder.Services.AddScoped<IFileStorageService, LocalStorageService>();

// Configuração de Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.SetMinimumLevel(LogLevel.Information);

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

builder.Services.Configure<FormOptions>(x => x.ValueCountLimit = 2048);
builder.Services.AddOrchardCms();

var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    try
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogInformation(" Executando sincronização inicial com Google Sheets...");

        var googleSheetsService = scope.ServiceProvider.GetRequiredService<IGoogleSheetsService>();
        await googleSheetsService.SincronizarTudoAsync();

        logger.LogInformation(" Sincronização inicial concluída com sucesso!");
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, " Erro na sincronização inicial (continuando normalmente)");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(); // Nova interface visual que substitui o SwaggerUI
}

// 3. ORDEM VITAL DE ROTEAMENTO E CORS
app.UseRouting();
app.UseCors(MyAllowSpecificOrigins);

// 4. AUTENTICAÇÃO E AUTORIZAÇÃO
app.UseAuthentication();
app.UseAuthorization();

app.UseHttpsRedirection();
app.UseStaticFiles();


app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();