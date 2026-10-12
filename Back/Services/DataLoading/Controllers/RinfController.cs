using Microsoft.AspNetCore.Mvc;
using VDS.RDF;

namespace RailTool.Services.DataLoading.Controllers;

[ApiController]
[Route("rinf")]
public class RinfController : ControllerBase
{
    private const string EraNamespace =
        "http://data.europa.eu/949/";

    private const string RdfType =
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

    private readonly RinfArchiveLoaderService _loader;
    private readonly RinfGraphState _state;
    private readonly OsmRailwayState _osmState;
    private readonly RinfOsmMatcherService _matcher;
    private readonly RinfGeometryEnrichmentService _geometryEnrichmentService;

    private readonly RdfToTtlNormalizationService _rdfNormalizationService;
    public RinfController(
    RinfArchiveLoaderService loader,
    RinfGraphState state,
    OsmRailwayState osmState,
    RinfOsmMatcherService matcher,
    RinfGeometryEnrichmentService geometryEnrichmentService,
    RdfToTtlNormalizationService rdfNormalizationService)
    {
        _loader = loader;
        _state = state;
        _osmState = osmState;
        _matcher = matcher;
        _geometryEnrichmentService =
            geometryEnrichmentService;
        _rdfNormalizationService =
            rdfNormalizationService;
    }

[HttpPost("import")]
[RequestSizeLimit(long.MaxValue)]
[RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
public async Task<IActionResult> Import(
        [FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest("No files were uploaded.");
        }

        var workingDirectory = Path.Combine(
            Path.GetTempPath(),
            "RinfImport");

       var result = await _loader.LoadArchivesAsync(
    files,
    workingDirectory);

        var sourceGraph = result.Graph;

        Console.WriteLine(
            $"RINF source graph loaded. " +
            $"Triples = {sourceGraph.Triples.Count}"
        );

        var graph =
            _rdfNormalizationService.Normalize(
                sourceGraph
            );

        Console.WriteLine(
            $"RINF graph normalized. " +
            $"Triples = {graph.Triples.Count}"
        );

        _state.Graph = graph;
        _state.ImportedAtUtc = DateTime.UtcNow;
        var operationalPoints = GetSubjectsByType(
            graph,
            $"{EraNamespace}OperationalPoint");

        var firstOperationalPointDetails =
            operationalPoints.Count > 0
                ? GetSubjectDetails(
                    graph,
                    operationalPoints[0])
                : new List<object>();

        var sectionsOfLine = GetSubjectsByType(
            graph,
            $"{EraNamespace}SectionOfLine");

        var firstSectionDetails = sectionsOfLine.Count > 0
            ? GetSubjectDetails(graph, sectionsOfLine[0])
            : new List<object>();
        
        var firstSectionValidityDetails = sectionsOfLine.Count > 0
            ? GetLinkedResourceDetails(
                graph,
                sectionsOfLine[0],
                $"{EraNamespace}validity")
            : new List<object>();

        var sectionConnections = sectionsOfLine
            .Select(sectionUri => GetSectionConnection(graph, sectionUri))
            .Where(connection => connection != null)
            .ToList();

        var runningTracks = GetSubjectsByType(
            graph,
            $"{EraNamespace}RunningTrack");

        var netPointReferences = GetSubjectsByType(
            graph,
            $"{EraNamespace}NetPointReference");
        
        var firstNetPointReferenceDetails =
            netPointReferences.Count > 0
                ? GetSubjectDetails(
                    graph,
                    netPointReferences[0])
                : new List<object>();

        var firstNetPointGeometryDetails =
            netPointReferences.Count > 0
                ? GetLinkedGeometryDetails(
                    graph,
                    netPointReferences[0])
                : new List<object>();

        var netLinearReferences = GetSubjectsByType(
            graph,
            $"{EraNamespace}NetLinearReference");
        
        var firstNetLinearReferenceDetails =
            netLinearReferences.Count > 0
                ? GetSubjectDetails(
                    graph,
                    netLinearReferences[0])
                : new List<object>();

        var firstGeometryDetails =
            netLinearReferences.Count > 0
                ? GetGeometryDetails(
                    graph,
                    netLinearReferences[0])
                : new List<object>();


        return Ok(new
        {
            ZipFiles = result.ZipCount,
            RdfFiles = result.LoadedRdfFiles.Count,
            Triples = graph.Triples.Count,

            RailwayObjects = new
            {
                OperationalPoints = operationalPoints.Count,
                SectionsOfLine = sectionsOfLine.Count,
                RunningTracks = runningTracks.Count,
                NetPointReferences = netPointReferences.Count,
                NetLinearReferences = netLinearReferences.Count
            },

            FirstSectionOfLine = firstSectionDetails,
            FirstOperationalPoint = firstOperationalPointDetails,
            SectionConnections = sectionConnections,
            FirstSectionValidity = firstSectionValidityDetails,
            FirstNetLinearReference = firstNetLinearReferenceDetails,
            FirstNetPointGeometry = firstNetPointGeometryDetails,
            FirstNetPointReference = firstNetPointReferenceDetails,
            FirstGeometry = firstGeometryDetails,

            Errors = result.Errors
        });
    }


[HttpGet("network")]
public IActionResult GetNetwork()
{
    var graph = _state.Graph;

    if (graph == null)
    {
        return BadRequest(
            "No RINF data has been imported yet.");
    }

    var operationalPointUris = GetSubjectsByType(
        graph,
        $"{EraNamespace}OperationalPoint");

    var sectionUris = GetSubjectsByType(
        graph,
        $"{EraNamespace}SectionOfLine");

    var operationalPoints = operationalPointUris
        .Select(uri => GetOperationalPoint(graph, uri))
        .Where(point => point != null)
        .ToList();

    var sections = sectionUris
        .Select(uri => GetSectionConnection(graph, uri))
        .Where(section => section != null)
        .ToList();

    return Ok(new
    {
        ImportedAtUtc = _state.ImportedAtUtc,
        TripleCount = _state.TripleCount,
        OperationalPoints = operationalPoints,
        Sections = sections
    });
}

[HttpGet("section-endpoints")]
public IActionResult GetSectionEndpoints()
{
    var graph = _state.Graph;

    if (graph == null)
    {
        return BadRequest(
            "No RINF data has been imported yet.");
    }

    var sectionUris = GetSubjectsByType(
        graph,
        $"{EraNamespace}SectionOfLine");

    var sections = sectionUris
        .Select(sectionUri =>
            GetSectionEndpointCoordinates(
                graph,
                sectionUri))
        .Where(section => section != null)
        .ToList();

    return Ok(new
    {
        TotalSections = sections.Count,
        Sections = sections
    });
}

[HttpPost("enrich-geometries")]
public IActionResult EnrichGeometries(
    [FromQuery] int year = 2026)
{
    var rinfGraph = _state.Graph;
    var osmGraph = _osmState.Graph;

    if (rinfGraph == null)
    {
        return BadRequest(
            "No RINF graph has been imported.");
    }

    if (osmGraph == null)
    {
        return BadRequest(
            "No OSM railway graph has been imported.");
    }

    var result =
        _geometryEnrichmentService.Enrich(
            rinfGraph,
            osmGraph,
            year);

    return Ok(new
    {
        Year = year,

        EnrichedCount =
            result.EnrichedSections.Count,

        UnresolvedCount =
            result.UnresolvedSections.Count,

        Sections =
            result.EnrichedSections,

        Unresolved =
            result.UnresolvedSections
    });
}

[HttpGet("osm-match")]
public IActionResult MatchOperationalPoint(
    [FromQuery] string name)
{
    if (string.IsNullOrWhiteSpace(name))
    {
        return BadRequest(
            "An operational-point name is required.");
    }

    var osmData = _osmState.Current;

    if (osmData == null)
    {
        return BadRequest(
            "No OSM GeoJSON data has been imported yet.");
    }

    var matches = _matcher.FindPointMatches(
    name,
    osmData.Points);

        if (matches.Count == 0)
        {
            return NotFound(new
            {
                InputName = name,
                Message = "No matching OSM railway point was found."
            });
        }

        return Ok(new
        {
            InputName = name,
            Matches = matches
        });
}

[HttpGet("osm-matches")]
public IActionResult MatchAllOperationalPoints()
{
    var graph = _state.Graph;

    if (graph == null)
    {
        return BadRequest(
            "No RINF data has been imported yet.");
    }

    var osmData = _osmState.Current;

    if (osmData == null)
    {
        return BadRequest(
            "No OSM GeoJSON data has been imported yet.");
    }

    var matches = _matcher.MatchOperationalPoints(
        graph,
        osmData.Points);

    return Ok(new
    {
        Total = matches.Count,
        Matches = matches
    });
}

    private static object? GetOperationalPoint(
        IGraph graph,
        string operationalPointUri)
    {
        if (!Uri.TryCreate(
                operationalPointUri,
                UriKind.Absolute,
                out var parsedUri))
        {
            return null;
        }

        var operationalPointNode =
            graph.CreateUriNode(parsedUri);

        var label = GetLiteralObject(
            graph,
            operationalPointNode,
            "http://www.w3.org/2000/01/rdf-schema#label");

        var latitude = GetLiteralObject(
            graph,
            operationalPointNode,
            "http://www.w3.org/2003/01/geo/wgs84_pos#lat");

        var longitude = GetLiteralObject(
            graph,
            operationalPointNode,
            "http://www.w3.org/2003/01/geo/wgs84_pos#long");

        return new
        {
            Uri = operationalPointUri,
            Label = label,
            Latitude = latitude,
            Longitude = longitude
        };
    }

    private static List<string> GetSubjectsByType(
        IGraph graph,
        string typeUri)
    {
        var rdfTypeNode = graph.CreateUriNode(
            new Uri(RdfType));

        var requestedTypeNode = graph.CreateUriNode(
            new Uri(typeUri));

        return graph
            .GetTriplesWithPredicateObject(
                rdfTypeNode,
                requestedTypeNode)
            .Select(triple => triple.Subject.ToString())
            .Distinct()
            .ToList();
    }

    private static List<object> GetSubjectDetails(
        IGraph graph,
        string subjectValue)
    {
        if (!Uri.TryCreate(
                subjectValue,
                UriKind.Absolute,
                out var subjectUri))
        {
            return new List<object>();
        }

        var subjectNode = graph.CreateUriNode(subjectUri);

        return graph
            .GetTriplesWithSubject(subjectNode)
            .Select(triple => new
            {
                Predicate = triple.Predicate.ToString(),
                Object = triple.Object.ToString(),
                ObjectType = triple.Object.NodeType.ToString()
            })
            .Cast<object>()
            .ToList();
    }

    private static object? GetSectionConnection(
        IGraph graph,
        string sectionUri)
    {
        if (!Uri.TryCreate(
                sectionUri,
                UriKind.Absolute,
                out var parsedSectionUri))
        {
            return null;
        }

        var sectionNode = graph.CreateUriNode(parsedSectionUri);

        var opStartUri = GetUriObject(
            graph,
            sectionNode,
            $"{EraNamespace}opStart");

        var opEndUri = GetUriObject(
            graph,
            sectionNode,
            $"{EraNamespace}opEnd");

        var sectionLabel = GetLiteralObject(
            graph,
            sectionNode,
            "http://www.w3.org/2000/01/rdf-schema#label");

        var length = GetLiteralObject(
            graph,
            sectionNode,
            $"{EraNamespace}lengthOfSectionOfLine");

        return new
        {
            SectionUri = sectionUri,
            SectionLabel = sectionLabel,
            StartOperationalPointUri = opStartUri,
            StartOperationalPointLabel =
                GetResourceLabel(graph, opStartUri),
            EndOperationalPointUri = opEndUri,
            EndOperationalPointLabel =
                GetResourceLabel(graph, opEndUri),
            LengthKm = length
        };
    }

    private static List<string> GetUriObjects(
        IGraph graph,
        INode subject,
        string predicateUri)
    {
        var predicate = graph.CreateUriNode(
            new Uri(predicateUri));

        return graph
            .GetTriplesWithSubjectPredicate(
                subject,
                predicate)
            .Select(triple => triple.Object)
            .OfType<IUriNode>()
            .Select(node => node.Uri.AbsoluteUri)
            .Distinct()
            .ToList();
    }

    private static string? GetUriObject(
        IGraph graph,
        INode subject,
        string predicateUri)
    {
        var predicate = graph.CreateUriNode(
            new Uri(predicateUri));

        var triple = graph
            .GetTriplesWithSubjectPredicate(
                subject,
                predicate)
            .FirstOrDefault();

        return triple?.Object is IUriNode uriNode
            ? uriNode.Uri.AbsoluteUri
            : null;
    }

    private static string? GetLiteralObject(
        IGraph graph,
        INode subject,
        string predicateUri)
    {
        var predicate = graph.CreateUriNode(
            new Uri(predicateUri));

        var triple = graph
            .GetTriplesWithSubjectPredicate(
                subject,
                predicate)
            .FirstOrDefault();

        return triple?.Object is ILiteralNode literalNode
            ? literalNode.Value
            : null;
    }

    private static string? GetResourceLabel(
        IGraph graph,
        string? resourceUri)
    {
        if (string.IsNullOrWhiteSpace(resourceUri) ||
            !Uri.TryCreate(
                resourceUri,
                UriKind.Absolute,
                out var parsedUri))
        {
            return null;
        }

        var resourceNode = graph.CreateUriNode(parsedUri);

        return GetLiteralObject(
            graph,
            resourceNode,
            "http://www.w3.org/2000/01/rdf-schema#label");
    }

    private static List<object> GetGeometryDetails(
    IGraph graph,
    string netLinearReferenceUri)
        {
            if (!Uri.TryCreate(
                    netLinearReferenceUri,
                    UriKind.Absolute,
                    out var parsedUri))
            {
                return new List<object>();
            }

            var referenceNode = graph.CreateUriNode(parsedUri);

            var hasGeometryPredicate = graph.CreateUriNode(
                new Uri("http://www.opengis.net/ont/geosparql#hasGeometry")
            );

            var geometryTriple = graph
                .GetTriplesWithSubjectPredicate(
                    referenceNode,
                    hasGeometryPredicate)
                .FirstOrDefault();

            if (geometryTriple == null)
            {
                return new List<object>
                {
                    new
                    {
                        Message = "No geosparql:hasGeometry triple was found.",
                        ReferenceUri = netLinearReferenceUri
                    }
                };
            }

            var geometryNode = geometryTriple.Object;

            var geometryTriples = graph
                .GetTriplesWithSubject(geometryNode)
                .ToList();

            if (geometryTriples.Count == 0)
            {
                return new List<object>
                {
                    new
                    {
                        Message =
                            "A geometry link exists, but the linked resource has no details in the merged graph.",
                        GeometryNode = geometryNode.ToString(),
                        GeometryNodeType = geometryNode.NodeType.ToString()
                    }
                };
            }

            return geometryTriples
                .Select(triple => new
                {
                    Predicate = triple.Predicate.ToString(),
                    Object = triple.Object.ToString(),
                    ObjectType = triple.Object.NodeType.ToString()
                })
                .Cast<object>()
                .ToList();
        }

    private static List<object> GetLinkedResourceDetails(
    IGraph graph,
    string subjectUri,
    string predicateUri)
        {
            if (!Uri.TryCreate(
                    subjectUri,
                    UriKind.Absolute,
                    out var parsedSubjectUri))
            {
                return new List<object>();
            }

            var subjectNode = graph.CreateUriNode(parsedSubjectUri);

            var linkedResourceUri = GetUriObject(
                graph,
                subjectNode,
                predicateUri);

            if (string.IsNullOrWhiteSpace(linkedResourceUri))
            {
                return new List<object>();
            }

            return GetSubjectDetails(
                graph,
                linkedResourceUri);
        }

    private static List<object> GetLinkedGeometryDetails(
    IGraph graph,
    string subjectUri)
        {
            if (!Uri.TryCreate(
                    subjectUri,
                    UriKind.Absolute,
                    out var parsedSubjectUri))
            {
                return new List<object>();
            }

            var subjectNode = graph.CreateUriNode(parsedSubjectUri);

            var hasGeometryPredicate = graph.CreateUriNode(
                new Uri(
                    "http://www.opengis.net/ont/geosparql#hasGeometry"));

            var geometryTriple = graph
                .GetTriplesWithSubjectPredicate(
                    subjectNode,
                    hasGeometryPredicate)
                .FirstOrDefault();

            if (geometryTriple == null)
            {
                return new List<object>
                {
                    new
                    {
                        Message =
                            "No geosparql:hasGeometry triple was found.",
                        SubjectUri = subjectUri
                    }
                };
            }

            var geometryNode = geometryTriple.Object;

            var geometryTriples = graph
                .GetTriplesWithSubject(geometryNode)
                .ToList();

            if (geometryTriples.Count == 0)
            {
                return new List<object>
                {
                    new
                    {
                        Message =
                            "A geometry link exists, but the linked resource has no details in the merged graph.",
                        GeometryNode = geometryNode.ToString(),
                        GeometryNodeType =
                            geometryNode.NodeType.ToString()
                    }
                };
            }

            return geometryTriples
                .Select(triple => new
                {
                    Predicate = triple.Predicate.ToString(),
                    Object = triple.Object.ToString(),
                    ObjectType = triple.Object.NodeType.ToString()
                })
                .Cast<object>()
                .ToList();
        }

    private static List<object> GetOperationalPointCoordinateReferences(
    IGraph graph,
    string? operationalPointUri)
        {
            if (string.IsNullOrWhiteSpace(operationalPointUri) ||
                !Uri.TryCreate(
                    operationalPointUri,
                    UriKind.Absolute,
                    out var parsedOperationalPointUri))
            {
                return new List<object>();
            }

            var operationalPointNode =
                graph.CreateUriNode(parsedOperationalPointUri);

            var netReferenceUris = GetUriObjects(
                graph,
                operationalPointNode,
                $"{EraNamespace}netReference");

            var results = new List<object>();

            foreach (var netReferenceUri in netReferenceUris)
            {
                if (!Uri.TryCreate(
                        netReferenceUri,
                        UriKind.Absolute,
                        out var parsedReferenceUri))
                {
                    continue;
                }

                var referenceNode =
                    graph.CreateUriNode(parsedReferenceUri);

                var latitudeText = GetLiteralObject(
                    graph,
                    referenceNode,
                    "http://www.w3.org/2003/01/geo/wgs84_pos#lat");

                var longitudeText = GetLiteralObject(
                    graph,
                    referenceNode,
                    "http://www.w3.org/2003/01/geo/wgs84_pos#long");

                var label = GetLiteralObject(
                    graph,
                    referenceNode,
                    "http://www.w3.org/2000/01/rdf-schema#label");

                var lrsCoordinateUri = GetUriObject(
                    graph,
                    referenceNode,
                    $"{EraNamespace}hasLrsCoordinate");

                var latitude = ParseNullableDouble(latitudeText);
                var longitude = ParseNullableDouble(longitudeText);

                results.Add(new
                {
                    NetPointReferenceUri = netReferenceUri,
                    Label = label,
                    Latitude = latitude,
                    Longitude = longitude,
                    LrsCoordinateUri = lrsCoordinateUri
                });
            }

            return results;
        }

    private static double? ParseNullableDouble(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return double.TryParse(
                value,
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var result)
                ? result
                : null;
        }

    private static object? GetSectionEndpointCoordinates(
    IGraph graph,
    string sectionUri)
        {
            if (!Uri.TryCreate(
                    sectionUri,
                    UriKind.Absolute,
                    out var parsedSectionUri))
            {
                return null;
            }

            var sectionNode =
                graph.CreateUriNode(parsedSectionUri);

            var startOperationalPointUri = GetUriObject(
                graph,
                sectionNode,
                $"{EraNamespace}opStart");

            var endOperationalPointUri = GetUriObject(
                graph,
                sectionNode,
                $"{EraNamespace}opEnd");

            var sectionLabel = GetLiteralObject(
                graph,
                sectionNode,
                "http://www.w3.org/2000/01/rdf-schema#label");

            var lengthText = GetLiteralObject(
                graph,
                sectionNode,
                $"{EraNamespace}lengthOfSectionOfLine");

            return new
            {
                SectionUri = sectionUri,
                SectionLabel = sectionLabel,
                LengthKm = ParseNullableDouble(lengthText),

                StartOperationalPoint = new
                {
                    Uri = startOperationalPointUri,
                    Label = GetResourceLabel(
                        graph,
                        startOperationalPointUri),
                    CoordinateReferences =
                        GetOperationalPointCoordinateReferences(
                            graph,
                            startOperationalPointUri)
                },

                EndOperationalPoint = new
                {
                    Uri = endOperationalPointUri,
                    Label = GetResourceLabel(
                        graph,
                        endOperationalPointUri),
                    CoordinateReferences =
                        GetOperationalPointCoordinateReferences(
                            graph,
                            endOperationalPointUri)
                }
            };
        }
}