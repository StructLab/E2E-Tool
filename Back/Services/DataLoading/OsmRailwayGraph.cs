namespace RailTool.Services.DataLoading;

public class OsmRailwayGraph
{
    public Dictionary<string, OsmGraphNode> Nodes { get; }
        = new();
}

public class OsmGraphNode
{
    public required string Id { get; init; }

    public required double Longitude { get; init; }

    public required double Latitude { get; init; }

    public List<OsmGraphEdge> Edges { get; }
        = new();
}

public class OsmGraphEdge
{
    public required OsmGraphNode Target { get; init; }

    public required double Length { get; init; }

    public string? RailwayLineId { get; init; }
}