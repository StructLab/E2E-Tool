using Microsoft.AspNetCore.Mvc;
using RailTool.Services.DataLoading;

namespace RailTool.Controllers;

[ApiController]
[Route("osm")]
public class OsmController : ControllerBase
{
    private readonly OsmGeoJsonLoaderService _loader;
    private readonly OsmRailwayState _state;
    private readonly OsmRailwayGraphBuilderService _graphBuilder;
    private readonly OsmRailwayPathService _pathService;
    private readonly OsmToEraRdfService _rdfService;

    public OsmController(
    OsmGeoJsonLoaderService loader,
    OsmRailwayState state,
    OsmRailwayGraphBuilderService graphBuilder,
    OsmRailwayPathService pathService,
    OsmToEraRdfService rdfService)
    {
        _loader = loader;
        _state = state;
        _graphBuilder = graphBuilder;
        _pathService = pathService;
        _rdfService = rdfService;
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import(
        [FromForm] OsmImportRequest request)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(
                "No OSM GeoJSON file was uploaded.");
        }

        var osm = await _loader.LoadAsync(request.File);

        _state.Current = osm;
        _state.Graph = _graphBuilder.Build(osm.Lines);
        _state.ImportedAtUtc = DateTime.UtcNow;

        return Ok(new
        {
            RailwayPoints = osm.Points.Count,
            RailwayLines = osm.Lines.Count,
            FirstPoint = osm.Points.FirstOrDefault(),
            FirstLine = osm.Lines.FirstOrDefault()
        });
    }

    [HttpGet("graph-summary")]
    public IActionResult GetGraphSummary()
    {
        var osmData = _state.Current;

        if (osmData == null)
        {
            return BadRequest(
                "No OSM GeoJSON data has been imported yet.");
        }

        var graph = _state.Graph;

        if (graph == null)
        {
            return BadRequest(
                "No railway graph has been built.");
        }

        var edgeCount = graph.Nodes.Values
            .Sum(node => node.Edges.Count);

        var isolatedNodeCount = graph.Nodes.Values
            .Count(node => node.Edges.Count == 0);

        var junctionNodeCount = graph.Nodes.Values
            .Count(node => node.Edges.Count > 2);

        return Ok(new
        {
            RailwayLines = osmData.Lines.Count,
            GraphNodes = graph.Nodes.Count,
            DirectedEdges = edgeCount,
            UndirectedEdges = edgeCount / 2,
            IsolatedNodes = isolatedNodeCount,
            JunctionNodes = junctionNodeCount
        });
    }

    [HttpGet("test-path")]
    public IActionResult GetTestPath()
    {
        var graph = _state.Graph;

        if (graph == null)
        {
            return BadRequest(
                "No railway graph has been built.");
        }

        const double startLatitude = 50.972472;
        const double startLongitude = 11.038034;

        const double endLatitude = 50.974795;
        const double endLongitude = 11.055499;

        const double expectedLengthMeters = 1300d;

        var bestCandidate =
            _pathService.FindBestPathCandidate(
                graph,
                startLongitude,
                startLatitude,
                endLongitude,
                endLatitude,
                expectedLengthMeters,
                candidateCount: 8);

        if (bestCandidate == null)
        {
            return NotFound(
                "No connected railway path was found.");
        }

        return Ok(new
        {
            ExpectedLengthMeters =
                expectedLengthMeters,

            ActualLengthMeters =
                bestCandidate.LengthMeters,

            DifferenceMeters =
                bestCandidate.DifferenceFromExpectedMeters,

            StartGraphNode = new
            {
                bestCandidate.StartNode.Latitude,
                bestCandidate.StartNode.Longitude
            },

            EndGraphNode = new
            {
                bestCandidate.EndNode.Latitude,
                bestCandidate.EndNode.Longitude
            },

            NodeCount =
                bestCandidate.Path.Count,

            Coordinates =
                bestCandidate.Path.Select(node => new
                {
                    node.Longitude,
                    node.Latitude
                })
        });
    }
    [HttpGet("test-rdf")]
public IActionResult GetTestRdf()
{
    var graph = _state.Graph;

    if (graph == null)
    {
        return BadRequest(
            "No railway graph has been built.");
    }

    const double startLatitude = 50.972472;
    const double startLongitude = 11.038034;

    const double endLatitude = 50.974795;
    const double endLongitude = 11.055499;

    const double expectedLengthMeters = 1300d;

    var bestCandidate =
        _pathService.FindBestPathCandidate(
            graph,
            startLongitude,
            startLatitude,
            endLongitude,
            endLatitude,
            expectedLengthMeters,
            candidateCount: 8);

    if (bestCandidate == null)
    {
        return NotFound(
            "No connected railway path was found.");
    }

    const string geometryUri =
        "http://data.europa.eu/949/geometry/test-erfurt-hbf-gueterbahnhof";

    var rdfGraph = _rdfService.CreateGeometryGraph(
        geometryUri,
        bestCandidate.Path);

    var triples = rdfGraph.Triples
        .Select(triple => new
        {
            Subject = triple.Subject.ToString(),
            Predicate = triple.Predicate.ToString(),
            Object = triple.Object.ToString()
        })
        .ToList();

    return Ok(new
    {
        GeometryUri = geometryUri,
        PathLengthMeters =
            bestCandidate.LengthMeters,
        TripleCount =
            rdfGraph.Triples.Count,
        Triples = triples
    });
}
}

public class OsmImportRequest
{
    public IFormFile File { get; set; } = null!;
}