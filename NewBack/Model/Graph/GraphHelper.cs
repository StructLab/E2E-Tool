using GeoModel.Geometry;
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using Graph;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.Graph
{
    public static class GraphHelper
    {
        public static UndirectedWeightedGraphT<IGraphNode> CreateGraph(
        IEnumerable<Track> tracks,
        double tolerance = 0.01)
        {
            var graph = new UndirectedWeightedGraphT<IGraphNode>();

            var trackList = tracks.ToList();

            // Store the graph nodes belonging to each track
            var trackNodes = new Dictionary<
                Track,
                (IGraphNode Start, IGraphNode End, List<TrackObject> Objects)>();

            // ---------------------------------------------------------
            // 1. Create nodes and connections inside each track
            // ---------------------------------------------------------

            foreach (var track in trackList)
            {
                var start = new TrackEndpoint(track, true);
                var end = new TrackEndpoint(track, false);

                var objects = track.Objects
                    .OrderBy(x => x.Distance)
                    .ToList();

                trackNodes[track] = (start, end, objects);

                // Add start/end
                graph.AdjacencyList.TryAdd(
                    start,
                    new List<(IGraphNode, double)>());

                graph.AdjacencyList.TryAdd(
                    end,
                    new List<(IGraphNode, double)>());

                // Add objects
                foreach (var obj in objects)
                {
                    graph.AdjacencyList.TryAdd(
                        obj,
                        new List<(IGraphNode, double)>());
                }

                // -----------------------------------------------------
                // Start -> first object
                // -----------------------------------------------------

                if (objects.Count > 0)
                {
                    graph.AddEdgeTwoWay(
                        start,
                        objects[0],
                        objects[0].Distance);

                    // -------------------------------------------------
                    // Object -> Object
                    // -------------------------------------------------

                    for (int i = 0; i < objects.Count - 1; i++)
                    {
                        var current = objects[i];
                        var next = objects[i + 1];

                        double distance =
                            next.Distance - current.Distance;

                        graph.AddEdgeTwoWay(
                            current,
                            next,
                            distance);
                    }

                    // -------------------------------------------------
                    // Last object -> End
                    // -------------------------------------------------

                    graph.AddEdgeTwoWay(
                        objects[^1],
                        end,
                        track.Geometry.Length - objects[^1].Distance);
                }
                else
                {
                    // No objects on track
                    graph.AddEdgeTwoWay(
                        start,
                        end,
                        track.Geometry.Length);
                }
            }

            // ---------------------------------------------------------
            // 2. Connect tracks through their endpoints
            // ---------------------------------------------------------

            for (int i = 0; i < trackList.Count; i++)
            {
                for (int j = i + 1; j < trackList.Count; j++)
                {
                    var trackA = trackList[i];
                    var trackB = trackList[j];

                    var nodesA = trackNodes[trackA];
                    var nodesB = trackNodes[trackB];

                    ConnectIfClose(
                        graph,
                        nodesA.Start,
                        nodesB.Start,
                        tolerance);

                    ConnectIfClose(
                        graph,
                        nodesA.Start,
                        nodesB.End,
                        tolerance);

                    ConnectIfClose(
                        graph,
                        nodesA.End,
                        nodesB.Start,
                        tolerance);

                    ConnectIfClose(
                        graph,
                        nodesA.End,
                        nodesB.End,
                        tolerance);
                }
            }

            return graph;
        }

        private static void ConnectIfClose(
            UndirectedWeightedGraphT<IGraphNode> graph,
            IGraphNode a,
            IGraphNode b,
            double tolerance)
        {
            if (GetLocation(a).DistanceTo(GetLocation(b)) <= tolerance)
            {
                graph.AddEdgeTwoWay(a, b, 0);
            }
        }

        private static Point3d GetLocation(IGraphNode node)
        {
            return node switch
            {
                TrackEndpoint endpoint => endpoint.Location,

                TrackObject obj => obj.Location,

                _ => throw new InvalidOperationException(
                    $"Unknown graph node type: {node.GetType().Name}")
            };
        }
        public static void AddTrackToGraph(
    UndirectedWeightedGraphT<IGraphNode> graph,
    Track track,
    double tolerance = 0.01)
        {
            var start = new TrackEndpoint(track, true);
            var end = new TrackEndpoint(track, false);

            graph.AdjacencyList.TryAdd(
                start,
                new List<(IGraphNode, double)>());

            graph.AdjacencyList.TryAdd(
                end,
                new List<(IGraphNode, double)>());

            var objects = track.Objects
                .OrderBy(x => x.Distance)
                .ToList();

            // No objects on the track
            if (objects.Count == 0)
            {
                graph.AddEdgeTwoWay(
                    start,
                    end,
                    track.Geometry.Length);
            }
            else
            {
                // Add objects
                foreach (var obj in objects)
                {
                    graph.AdjacencyList.TryAdd(
                        obj,
                        new List<(IGraphNode, double)>());
                }

                // Start -> first object
                graph.AddEdgeTwoWay(
                    start,
                    objects[0],
                    objects[0].Distance);

                // Object -> object
                for (int i = 0; i < objects.Count - 1; i++)
                {
                    var current = objects[i];
                    var next = objects[i + 1];

                    graph.AddEdgeTwoWay(
                        current,
                        next,
                        next.Distance - current.Distance);
                }

                // Last object -> end
                graph.AddEdgeTwoWay(
                    objects[^1],
                    end,
                    track.Geometry.Length - objects[^1].Distance);
            }

            // Connect the new track to existing tracks
            ConnectTrackToExistingTracks(
                graph,
                track,
                start,
                end,
                tolerance);
        }
        private static void ConnectTrackToExistingTracks(
    UndirectedWeightedGraphT<IGraphNode> graph,
    Track newTrack,
    TrackEndpoint newStart,
    TrackEndpoint newEnd,
    double tolerance)
{
    var existingEndpoints = graph.AdjacencyList.Keys
        .OfType<TrackEndpoint>()
        .Where(x => !ReferenceEquals(x.Track, newTrack))
        .ToList();

    foreach (var existing in existingEndpoints)
    {
        if (newStart.Location.DistanceTo(existing.Location) <= tolerance)
        {
            graph.AddEdgeTwoWay(
                newStart,
                existing,
                0);
        }

        if (newEnd.Location.DistanceTo(existing.Location) <= tolerance)
        {
            graph.AddEdgeTwoWay(
                newEnd,
                existing,
                0);
        }
    }
}
        public static void AddTrackObjectToGraph(
        UndirectedWeightedGraphT<IGraphNode> graph,
        TrackObject obj)
        {
            if (obj.Track == null)
                throw new InvalidOperationException(
                    $"TrackObject '{obj.Id}' has no Track.");

            var track = obj.Track;

            // Update position on the track
            obj.UpdateDistance();

            // Add object to graph
            graph.AdjacencyList.TryAdd(
                obj,
                new List<(IGraphNode, double)>());

            // Get all nodes belonging to this track
            var nodes = graph.AdjacencyList.Keys
                .Where(node => node switch
                {
                    TrackEndpoint endpoint =>
                        ReferenceEquals(endpoint.Track, track),

                    TrackObject trackObject =>
                        ReferenceEquals(trackObject.Track, track),

                    _ => false
                })
                .OrderBy(GetDistance)
                .ToList();

            int index = nodes.IndexOf(obj);

            if (index <= 0 || index >= nodes.Count - 1)
                throw new InvalidOperationException(
                    "The new object must be between two existing track nodes.");

            var previous = nodes[index - 1];
            var next = nodes[index + 1];

            // Remove previous connection
            graph.RemoveEdgeTwoWay((previous, next));

            // Connect previous -> object
            graph.AddEdgeTwoWay(
                previous,
                obj,
                obj.Distance - GetDistance(previous));

            // Connect object -> next
            graph.AddEdgeTwoWay(
                obj,
                next,
                GetDistance(next) - obj.Distance);
        }

        private static double GetDistance(IGraphNode node)
        {
            return node switch
            {
                TrackEndpoint endpoint =>
                    endpoint.IsStart
                        ? 0
                        : endpoint.Track.Geometry.Length,

                TrackObject trackObject =>
                    trackObject.Distance,

                _ => throw new InvalidOperationException(
                    $"Unsupported graph node type: {node.GetType().Name}")
            };
        }
    }
}
