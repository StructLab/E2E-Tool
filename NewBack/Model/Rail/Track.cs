using GeoModel.Geometry;
using GeoModel.Rail.TrackObjects;
using Model.Geometry;
using Model.Graph;

namespace GeoModel.Rail
{
    public class Track : IGraphNode
    {
        public string Id { get; set; }

        public PolyLine3D Geometry { get; set; }

        public Track(string id, PolyLine3D geometry)
        {
            Id = id;
            Geometry = geometry;
        }

        public double Length => Geometry.Length;
        private readonly List<TrackObject> _objects = new();

        public IReadOnlyList<TrackObject> Objects => _objects;
        internal void AddObject(TrackObject obj)
        {
            _objects.Add(obj);
        }

        internal void RemoveObject(TrackObject obj)
        {
            _objects.Remove(obj);
        }
        public Point3d PointAt(double distance)
        {
            return Geometry.PointAt(distance);
        }

        public Point3d TangentAt(double distance)
        {
            return Geometry.TangentAt(distance);
        }
        public ClosestPointResult FindClosestPoint(Point3d point)
        {
            return Geometry.FindClosestPoint(point);
        }
        public double GetDistance(Point3d location)
        {
            var result = Geometry.FindClosestPoint(location);

            return result.Point.DistanceTo(location);
        }
    }
}
