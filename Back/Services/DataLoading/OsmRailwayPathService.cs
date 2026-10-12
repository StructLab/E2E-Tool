    namespace RailTool.Services.DataLoading;

    public class OsmRailwayPathService
    {
        public OsmGraphNode? FindNearestNode(
            OsmRailwayGraph graph,
            double longitude,
            double latitude)
        {
            OsmGraphNode? nearestNode = null;
            var smallestDistance = double.MaxValue;

            foreach (var node in graph.Nodes.Values)
            {
                var distance = CalculateDistanceMeters(
                    latitude,
                    longitude,
                    node.Latitude,
                    node.Longitude);

                if (distance >= smallestDistance)
                {
                    continue;
                }

                smallestDistance = distance;
                nearestNode = node;
            }

            return nearestNode;
        }

        public IReadOnlyList<OsmGraphNode> FindNearestNodes(
        OsmRailwayGraph graph,
        double longitude,
        double latitude,
        int count = 5)
        {
            return graph.Nodes.Values
                .Select(node => new
                {
                    Node = node,
                    Distance = CalculateDistanceMeters(
                        latitude,
                        longitude,
                        node.Latitude,
                        node.Longitude)
                })
                .OrderBy(candidate => candidate.Distance)
                .Take(count)
                .Select(candidate => candidate.Node)
                .ToList();
        }

        public IReadOnlyList<OsmGraphNode> FindShortestPath(
        OsmRailwayGraph graph,
        OsmGraphNode startNode,
        OsmGraphNode endNode)
        {
            var distances = new Dictionary<string, double>();
            var previousNodes = new Dictionary<string, OsmGraphNode?>();
            var queue = new PriorityQueue<OsmGraphNode, double>();

            foreach (var node in graph.Nodes.Values)
            {
                distances[node.Id] = double.MaxValue;
                previousNodes[node.Id] = null;
            }

            distances[startNode.Id] = 0;
            queue.Enqueue(startNode, 0);

            while (queue.Count > 0)
            {
                var currentNode = queue.Dequeue();

                if (currentNode.Id == endNode.Id)
                {
                    break;
                }

                var currentDistance = distances[currentNode.Id];

                foreach (var edge in currentNode.Edges)
                {
                    var candidateDistance =
                        currentDistance + edge.Length;

                    if (candidateDistance >=
                        distances[edge.Target.Id])
                    {
                        continue;
                    }

                    distances[edge.Target.Id] =
                        candidateDistance;

                    previousNodes[edge.Target.Id] =
                        currentNode;

                    queue.Enqueue(
                        edge.Target,
                        candidateDistance);
                }
            }

            if (startNode.Id != endNode.Id &&
                previousNodes[endNode.Id] == null)
            {
                return Array.Empty<OsmGraphNode>();
            }

            var path = new List<OsmGraphNode>();

            OsmGraphNode? current = endNode;

            while (current != null)
            {
                path.Add(current);

                if (current.Id == startNode.Id)
                {
                    break;
                }

                current = previousNodes[current.Id];
            }

            path.Reverse();

            return path;
        }

        public OsmPathCandidate? FindBestPathCandidate(
        OsmRailwayGraph graph,
        double startLongitude,
        double startLatitude,
        double endLongitude,
        double endLatitude,
        double expectedLengthMeters,
        int candidateCount = 5)
        {
            var startCandidates = FindNearestNodes(
                graph,
                startLongitude,
                startLatitude,
                candidateCount);

            var endCandidates = FindNearestNodes(
                graph,
                endLongitude,
                endLatitude,
                candidateCount);

            OsmPathCandidate? bestCandidate = null;

            foreach (var startNode in startCandidates)
            {
                foreach (var endNode in endCandidates)
                {
                    var path = FindShortestPath(
                        graph,
                        startNode,
                        endNode);

                    if (path.Count == 0)
                    {
                        continue;
                    }

                    var pathLengthMeters =
                        CalculatePathLengthMeters(path);

                    var differenceFromExpected =
                        Math.Abs(
                            pathLengthMeters -
                            expectedLengthMeters);

                    var candidate = new OsmPathCandidate
                    {
                        StartNode = startNode,
                        EndNode = endNode,
                        Path = path,
                        LengthMeters = pathLengthMeters,
                        DifferenceFromExpectedMeters =
                            differenceFromExpected
                    };

                    if (bestCandidate == null ||
                        candidate.DifferenceFromExpectedMeters <
                        bestCandidate.DifferenceFromExpectedMeters)
                    {
                        bestCandidate = candidate;
                    }
                }
            }

            return bestCandidate;
        }
        public double CalculateDistanceMeters(
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

            var latitudeDifference =
                DegreesToRadians(latitude2 - latitude1);

            var longitudeDifference =
                DegreesToRadians(longitude2 - longitude1);

            var haversine =
                Math.Sin(latitudeDifference / 2) *
                Math.Sin(latitudeDifference / 2) +
                Math.Cos(latitude1Radians) *
                Math.Cos(latitude2Radians) *
                Math.Sin(longitudeDifference / 2) *
                Math.Sin(longitudeDifference / 2);

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

        public double CalculatePathLengthMeters(
        IReadOnlyList<OsmGraphNode> path)
        {
            if (path.Count < 2)
            {
                return 0;
            }

            var total = 0d;

            for (var index = 0;
                index < path.Count - 1;
                index++)
            {
                total += CalculateDistanceMeters(
                    path[index].Latitude,
                    path[index].Longitude,
                    path[index + 1].Latitude,
                    path[index + 1].Longitude);
            }

            return total;
        }
    }

    public class OsmPathCandidate
{
    public required OsmGraphNode StartNode { get; init; }

    public required OsmGraphNode EndNode { get; init; }

    public required IReadOnlyList<OsmGraphNode> Path { get; init; }

    public double LengthMeters { get; init; }

    public double DifferenceFromExpectedMeters { get; init; }
}