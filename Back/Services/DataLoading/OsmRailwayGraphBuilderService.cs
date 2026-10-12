namespace RailTool.Services.DataLoading;

public class OsmRailwayGraphBuilderService
{
    private const double CoordinatePrecision = 1_000_000d;

    public OsmRailwayGraph Build(
        IReadOnlyList<OsmRailwayLine> railwayLines)
    {
        var graph = new OsmRailwayGraph();

        foreach (var line in railwayLines)
        {
            if (line.Points.Count < 2)
            {
                continue;
            }

            for (var index = 0;
                 index < line.Points.Count - 1;
                 index++)
            {
                var startCoordinate = line.Points[index];
                var endCoordinate = line.Points[index + 1];

                var startNode = GetOrCreateNode(
                    graph,
                    startCoordinate);

                var endNode = GetOrCreateNode(
                    graph,
                    endCoordinate);

                var lengthMeters = CalculateDistanceMeters(
                    startCoordinate.Latitude,
                    startCoordinate.Longitude,
                    endCoordinate.Latitude,
                    endCoordinate.Longitude);

                AddEdge(
                    startNode,
                    endNode,
                    lengthMeters,
                    line.Id);

                AddEdge(
                    endNode,
                    startNode,
                    lengthMeters,
                    line.Id);
            }
        }

        return graph;
    }

    private static OsmGraphNode GetOrCreateNode(
        OsmRailwayGraph graph,
        OsmCoordinate coordinate)
    {
        var nodeId = CreateNodeId(
            coordinate.Longitude,
            coordinate.Latitude);

        if (graph.Nodes.TryGetValue(
                nodeId,
                out var existingNode))
        {
            return existingNode;
        }

        var node = new OsmGraphNode
        {
            Id = nodeId,
            Longitude = coordinate.Longitude,
            Latitude = coordinate.Latitude
        };

        graph.Nodes[nodeId] = node;

        return node;
    }

    private static void AddEdge(
        OsmGraphNode source,
        OsmGraphNode target,
        double lengthMeters,
        string? railwayLineId)
    {
        var alreadyExists = source.Edges.Any(edge =>
            edge.Target.Id == target.Id &&
            edge.RailwayLineId == railwayLineId);

        if (alreadyExists)
        {
            return;
        }

        source.Edges.Add(new OsmGraphEdge
        {
            Target = target,
            Length = lengthMeters,
            RailwayLineId = railwayLineId
        });
    }

    private static string CreateNodeId(
        double longitude,
        double latitude)
    {
        var normalizedLongitude = Math.Round(
            longitude * CoordinatePrecision);

        var normalizedLatitude = Math.Round(
            latitude * CoordinatePrecision);

        return $"{normalizedLongitude}:{normalizedLatitude}";
    }

    private static double CalculateDistanceMeters(
        double latitude1,
        double longitude1,
        double latitude2,
        double longitude2)
    {
        const double earthRadiusMeters = 6_371_000d;

        var latitude1Radians =
            DegreesToRadians(latitude1);

        var latitude2Radians =
            DegreesToRadians(latitude2);

        var latitudeDelta =
            DegreesToRadians(latitude2 - latitude1);

        var longitudeDelta =
            DegreesToRadians(longitude2 - longitude1);

        var haversine =
            Math.Sin(latitudeDelta / 2) *
            Math.Sin(latitudeDelta / 2) +
            Math.Cos(latitude1Radians) *
            Math.Cos(latitude2Radians) *
            Math.Sin(longitudeDelta / 2) *
            Math.Sin(longitudeDelta / 2);

        var angularDistance =
            2 * Math.Atan2(
                Math.Sqrt(haversine),
                Math.Sqrt(1 - haversine));

        return earthRadiusMeters * angularDistance;
    }

    private static double DegreesToRadians(
        double value)
    {
        return value * Math.PI / 180d;
    }
}