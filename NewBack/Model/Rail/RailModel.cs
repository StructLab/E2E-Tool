using GeoModel.Geometry;
using GeoModel.Rail.TrackObjects;
using Graph;
using Model.Graph;

namespace GeoModel.Rail
{
    public class RailModel
    {
        public List<Track> Tracks { get; } = new();

        public void AddTrack(Track track)
        {
            Tracks.Add(track);
        }
        public Track AttachTrackObject(TrackObject obj)
        {
            Track? nearestTrack = null;
            double nearestDistance = double.MaxValue;
            double distanceOnTrack = 0;

            foreach (var track in Tracks)
            {
                var result = track.FindClosestPoint(obj.Location);

                if (result.Distance < nearestDistance)
                {
                    nearestDistance = result.Distance;
                    nearestTrack = track;
                    distanceOnTrack = result.DistanceAlongTrack;
                }
            }

            if (nearestTrack == null)
                throw new InvalidOperationException("No track found.");

            obj.AttachToTrack(nearestTrack, distanceOnTrack);

            return nearestTrack;
        }
        public Track? FindClosestTrack(
        Point3d location,
        Track? exclude = null)
        {
            Track? closestTrack = null;
            double closestDistance = double.MaxValue;

            foreach (var track in Tracks)
            {
                if (track == exclude)
                    continue;

                var closestPoint = track.Geometry.FindClosestPoint(location);

                double distance = closestPoint.Point.DistanceTo(location);

                if (distance < closestDistance)
                {
                    closestDistance = distance;
                    closestTrack = track;
                }
            }

            return closestTrack;
        }
        public UndirectedWeightedGraphT<IGraphNode> BuildTrackGraph(
        IEnumerable<Track> tracks)
        {
            var graph = new UndirectedWeightedGraphT<IGraphNode>();

            foreach (var track in tracks)
            {
                // Add track itself
                graph.AdjacencyList.TryAdd(
                    track,
                    new List<(IGraphNode, double)>());

                // Add objects
                foreach (var obj in track.Objects)
                {
                    graph.AdjacencyList.TryAdd(
                        obj,
                        new List<(IGraphNode, double)>());
                }

                // Sort objects according to their position on the track
                var objects = track.Objects
                    .OrderBy(x => x.Distance)
                    .ToList();

                // Connect objects along the track
                for (int i = 0; i < objects.Count - 1; i++)
                {
                    var a = objects[i];
                    var b = objects[i + 1];

                    double distance = b.Distance - a.Distance;

                    graph.AddEdgeTwoWay(a, b, distance);
                }
            }

            return graph;
        }
    }
}
