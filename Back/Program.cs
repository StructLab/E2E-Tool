using Rail;
using RailTool.Services;
using RailTool.Services.DataLoading;
using RailTool.Services.Validation;
using VDS.RDF;
using Microsoft.OpenApi.Models;
using VDS.RDF.Parsing;
using CCSTMSturtle.RDF;
using DataService = RailTool.Services.DataLoading.DataService;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddSwaggerGen(c =>
{
    // Tell Swagger how to represent IFormFile
    c.MapType<IFormFile>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "binary"
    });
});
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add services to the container.
builder.Services.AddSingleton<IDataLoader, TTLdataLoaderService>();
builder.Services.AddSingleton<DataService>();
builder.Services.AddSingleton<RdfToTtlNormalizationService>();
builder.Services.AddSingleton<RinfArchiveLoaderService>();
builder.Services.AddSingleton<RinfGraphState>();
builder.Services.AddSingleton<OsmGeoJsonLoaderService>();
builder.Services.AddSingleton<OsmRailwayState>();
builder.Services.AddSingleton<RinfOsmMatcherService>();
builder.Services.AddSingleton<OsmRailwayGraphBuilderService>();
builder.Services.AddSingleton<OsmRailwayPathService>();
builder.Services.AddSingleton<OsmToEraRdfService>();    
builder.Services.AddSingleton<RinfGeometryEnrichmentService>();

builder.Services.AddSingleton<AssetsHandlerService>();
builder.Services.AddSingleton<RailModelState>();
builder.Services.AddSingleton<IGraph, Graph>(sp =>
{
    var graph = new Graph();
    graph.NamespaceMap.AddNamespace("era", new Uri("http://data.europa.eu/949/"));
    graph.NamespaceMap.AddNamespace("concepts", new Uri("http://data.europa.eu/949/concepts/"));

    // Standard RDF namespaces
    graph.NamespaceMap.AddNamespace("rdf", new Uri(NamespaceMapper.RDF));
    graph.NamespaceMap.AddNamespace("rdfs", new Uri(NamespaceMapper.RDFS));
    graph.NamespaceMap.AddNamespace("xsd", new Uri(XmlSpecsHelper.NamespaceXmlSchema));
    //graph.LoadFromFile("C:\\Users\\Khaled Elhadary\\OneDrive - Lawcon Consulting Ltd\\Code\\DXFtoTTL\\Sample\\ModelRailway-0.6-trial.ttl");
    return graph;
});
builder.Services.AddSingleton<EngineeringValidationService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy
                .AllowAnyOrigin()   // allow any domain
                .AllowAnyHeader()   // allow any header
                .AllowAnyMethod();  // allow GET, POST, etc.
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 4️⃣ Use CORS
app.UseCors("AllowAll");
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
