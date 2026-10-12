using VDS.RDF;
namespace RailTool.Services.DataLoading;

public class RinfOsmMatchCandidate
{
    public required OsmRailwayPoint Point { get; init; }

    public int Score { get; init; }
}

public class RinfOsmMatcherService
{
    public IReadOnlyList<RinfOsmMatchCandidate> FindPointMatches(
    string rinfName,
    IReadOnlyList<OsmRailwayPoint> osmPoints,
    int limit = 5)
{
    if (string.IsNullOrWhiteSpace(rinfName))
    {
        return Array.Empty<RinfOsmMatchCandidate>();
    }

    var normalizedRinfName = NormalizeName(rinfName);

    return osmPoints
        .Select(point => new RinfOsmMatchCandidate
        {
            Point = point,
            Score = CalculateNameScore(
                normalizedRinfName,
                NormalizeName(point.Name))
        })
        .Where(candidate => candidate.Score > 0)
        .OrderByDescending(candidate => candidate.Score)
        .ThenBy(candidate => candidate.Point.Name)
        .Take(limit)
        .ToList();
}

    private static int CalculateNameScore(
        string rinfName,
        string osmName)
    {
        if (string.IsNullOrWhiteSpace(osmName))
        {
            return 0;
        }

        if (rinfName == osmName)
        {
            return 100;
        }

        if (rinfName.Contains(osmName) ||
            osmName.Contains(rinfName))
        {
            return 70;
        }

        var rinfWords = rinfName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .ToHashSet();

        var osmWords = osmName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .ToHashSet();

        return rinfWords.Intersect(osmWords).Count() * 10;
    }

    public IReadOnlyList<object> MatchOperationalPoints( 
    IGraph graph,
    IReadOnlyList<OsmRailwayPoint> osmPoints)
{
    const string eraNamespace = "http://data.europa.eu/949/";

    var rdfType =
        graph.CreateUriNode(
            new Uri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"));

    var operationalPointType =
        graph.CreateUriNode(
            new Uri($"{eraNamespace}OperationalPoint"));

    var labelPredicate =
        graph.CreateUriNode(
            new Uri("http://www.w3.org/2000/01/rdf-schema#label"));

    var matches = new List<object>();

    foreach (var triple in graph.GetTriplesWithPredicateObject(
                 rdfType,
                 operationalPointType))
    {
        var label = graph
            .GetTriplesWithSubjectPredicate(
                triple.Subject,
                labelPredicate)
            .FirstOrDefault()
            ?.Object.ToString();

        if (string.IsNullOrWhiteSpace(label))
            continue;

        var candidates =
            FindPointMatches(label, osmPoints);

        matches.Add(new
        {
            OperationalPointUri = triple.Subject.ToString(),
            RinfName = label,
            BestMatch = candidates.FirstOrDefault(),
            CandidateCount = candidates.Count
        });
    }

    return matches;
}

    private static string NormalizeName(string value)
    {
        var name = value.ToLowerInvariant();

        var validityIndex = name.IndexOf(
            "(from ",
            StringComparison.Ordinal);

        if (validityIndex >= 0)
        {
            name = name[..validityIndex];
        }

        return name
            .Replace("hauptbahnhof", "hbf")
            .Replace("(saale)", string.Empty)
            .Replace(",", " ")
            .Replace("-", " ")
            .Trim();
    }
}
