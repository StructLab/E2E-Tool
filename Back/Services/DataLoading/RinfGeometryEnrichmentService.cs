using System.Globalization;
using System.Text.RegularExpressions;
using VDS.RDF;

namespace RailTool.Services.DataLoading;

public class RinfGeometryEnrichmentService
{
    private const string EraNamespace =
        "http://data.europa.eu/949/";

    private const string GeoNamespace =
        "http://www.opengis.net/ont/geosparql#";

    private const string RdfType =
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

    private const string RdfsLabel =
        "http://www.w3.org/2000/01/rdf-schema#label";

    private const string LatitudePredicate =
        "http://www.w3.org/2003/01/geo/wgs84_pos#lat";

    private const string LongitudePredicate =
        "http://www.w3.org/2003/01/geo/wgs84_pos#long";

    private readonly OsmRailwayPathService _pathService;
    private readonly OsmToEraRdfService _rdfService;

    public RinfGeometryEnrichmentService(
        OsmRailwayPathService pathService,
        OsmToEraRdfService rdfService)
    {
        _pathService = pathService;
        _rdfService = rdfService;
    }

    public RinfGeometryEnrichmentResult Enrich(
        IGraph rinfGraph,
        OsmRailwayGraph osmGraph,
        int preferredYear = 2026)
    {
        var result = new RinfGeometryEnrichmentResult();

        var sectionTypeNode = rinfGraph.CreateUriNode(
            new Uri($"{EraNamespace}SectionOfLine"));

        var rdfTypeNode = rinfGraph.CreateUriNode(
            new Uri(RdfType));

        var sectionUris = rinfGraph
            .GetTriplesWithPredicateObject(
                rdfTypeNode,
                sectionTypeNode)
            .Select(triple => triple.Subject)
            .OfType<IUriNode>()
            .Select(node => node.Uri.AbsoluteUri)
            .Distinct()
            .ToList();

        foreach (var sectionUri in sectionUris)
        {
            var sectionNode = rinfGraph.CreateUriNode(
                new Uri(sectionUri));

            var sectionLabel = GetLiteral(
                rinfGraph,
                sectionNode,
                RdfsLabel);

            if (!MatchesPreferredYear(
                    sectionLabel,
                    preferredYear))
            {
                continue;
            }

            try
            {
                var sectionResult = EnrichSection(
                    rinfGraph,
                    osmGraph,
                    sectionNode,
                    sectionUri,
                    sectionLabel);

                if (sectionResult.Success)
                {
                    result.EnrichedSections.Add(
                        sectionResult);
                }
                else
                {
                    result.UnresolvedSections.Add(
                        sectionResult);
                }
            }
            catch (Exception exception)
            {
                result.UnresolvedSections.Add(
                    new RinfSectionGeometryResult
                    {
                        SectionUri = sectionUri,
                        SectionLabel = sectionLabel,
                        Success = false,
                        Message = exception.Message
                    });
            }
        }

        return result;
    }

    private RinfSectionGeometryResult EnrichSection(
        IGraph rinfGraph,
        OsmRailwayGraph osmGraph,
        INode sectionNode,
        string sectionUri,
        string? sectionLabel)
    {
        var startOpUri = GetUri(
            rinfGraph,
            sectionNode,
            $"{EraNamespace}opStart");

        var endOpUri = GetUri(
            rinfGraph,
            sectionNode,
            $"{EraNamespace}opEnd");

        var netReferenceUri = GetUri(
            rinfGraph,
            sectionNode,
            $"{EraNamespace}netReference");

        var lengthText = GetLiteral(
            rinfGraph,
            sectionNode,
            $"{EraNamespace}lengthOfSectionOfLine");

        var lengthKm = ParseDouble(lengthText);

        if (startOpUri == null ||
            endOpUri == null ||
            netReferenceUri == null ||
            lengthKm == null)
        {
            return Failure(
                sectionUri,
                sectionLabel,
                "Section is missing start, end, net reference or length.");
        }

        var startCoordinate = GetOperationalPointCoordinate(
            rinfGraph,
            startOpUri);

        var endCoordinate = GetOperationalPointCoordinate(
            rinfGraph,
            endOpUri);

        if (startCoordinate == null ||
            endCoordinate == null)
        {
            return Failure(
                sectionUri,
                sectionLabel,
                "One or both operational points have no usable coordinates.");
        }

        var netReferenceNode = rinfGraph.CreateUriNode(
            new Uri(netReferenceUri));

        var geometryUri = GetUri(
            rinfGraph,
            netReferenceNode,
            $"{GeoNamespace}hasGeometry");

        if (geometryUri == null)
        {
            return Failure(
                sectionUri,
                sectionLabel,
                "NetLinearReference has no geometry URI.");
        }

        var expectedLengthMeters =
            lengthKm.Value * 1000d;

        var bestCandidate =
            _pathService.FindBestPathCandidate(
                osmGraph,
                startCoordinate.Longitude,
                startCoordinate.Latitude,
                endCoordinate.Longitude,
                endCoordinate.Latitude,
                expectedLengthMeters,
                candidateCount: 8);

        if (bestCandidate == null)
        {
            return Failure(
                sectionUri,
                sectionLabel,
                "No connected OSM railway path was found.");
        }

        var geometryGraph =
            _rdfService.CreateGeometryGraph(
                geometryUri,
                bestCandidate.Path);

        rinfGraph.Merge(
            geometryGraph,
            true);

        return new RinfSectionGeometryResult
        {
            SectionUri = sectionUri,
            SectionLabel = sectionLabel,
            NetReferenceUri = netReferenceUri,
            GeometryUri = geometryUri,
            ExpectedLengthMeters =
                expectedLengthMeters,
            ActualLengthMeters =
                bestCandidate.LengthMeters,
            DifferenceMeters =
                bestCandidate.DifferenceFromExpectedMeters,
            Success = true,
            Coordinates = bestCandidate.Path
                .Select(node => new RinfDrawableCoordinate
                {
                    Longitude = node.Longitude,
                    Latitude = node.Latitude
                })
                .ToList()
        };
    }

    private static RinfCoordinate? GetOperationalPointCoordinate(
        IGraph graph,
        string operationalPointUri)
    {
        var opNode = graph.CreateUriNode(
            new Uri(operationalPointUri));

        var netReferencePredicate =
            graph.CreateUriNode(
                new Uri(
                    $"{EraNamespace}netReference"));

        var referenceNodes = graph
            .GetTriplesWithSubjectPredicate(
                opNode,
                netReferencePredicate)
            .Select(triple => triple.Object)
            .OfType<IUriNode>()
            .ToList();

        foreach (var referenceNode in referenceNodes)
        {
            var latitude = ParseDouble(
                GetLiteral(
                    graph,
                    referenceNode,
                    LatitudePredicate));

            var longitude = ParseDouble(
                GetLiteral(
                    graph,
                    referenceNode,
                    LongitudePredicate));

            if (latitude != null &&
                longitude != null)
            {
                return new RinfCoordinate
                {
                    Latitude = latitude.Value,
                    Longitude = longitude.Value
                };
            }
        }

        return null;
    }

    private static string? GetUri(
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
            .FirstOrDefault();
    }

    private static string? GetLiteral(
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
            .OfType<ILiteralNode>()
            .Select(node => node.Value)
            .FirstOrDefault();
    }

    private static double? ParseDouble(
        string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return double.TryParse(
            value,
            NumberStyles.Float,
            CultureInfo.InvariantCulture,
            out var parsed)
            ? parsed
            : null;
    }

    private static bool MatchesPreferredYear(
        string? label,
        int preferredYear)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            return true;
        }

        var containsYearRange =
            Regex.IsMatch(
                label,
                @"from\s+\d{4}-\d{2}-\d{2}",
                RegexOptions.IgnoreCase);

        if (!containsYearRange)
        {
            return true;
        }

        return label.Contains(
            $"from {preferredYear}-",
            StringComparison.OrdinalIgnoreCase);
    }

    private static RinfSectionGeometryResult Failure(
        string sectionUri,
        string? sectionLabel,
        string message)
    {
        return new RinfSectionGeometryResult
        {
            SectionUri = sectionUri,
            SectionLabel = sectionLabel,
            Success = false,
            Message = message
        };
    }
}

public class RinfGeometryEnrichmentResult
{
    public List<RinfSectionGeometryResult>
        EnrichedSections { get; } = new();

    public List<RinfSectionGeometryResult>
        UnresolvedSections { get; } = new();
}

public class RinfSectionGeometryResult
{
    public string SectionUri { get; init; } = "";

    public string? SectionLabel { get; init; }

    public string? NetReferenceUri { get; init; }

    public string? GeometryUri { get; init; }

    public bool Success { get; init; }

    public string? Message { get; init; }

    public double ExpectedLengthMeters { get; init; }

    public double ActualLengthMeters { get; init; }

    public double DifferenceMeters { get; init; }

    public List<RinfDrawableCoordinate>
        Coordinates { get; init; } = new();
}

public class RinfDrawableCoordinate
{
    public double Longitude { get; init; }

    public double Latitude { get; init; }
}

public class RinfCoordinate
{
    public double Longitude { get; init; }

    public double Latitude { get; init; }
}