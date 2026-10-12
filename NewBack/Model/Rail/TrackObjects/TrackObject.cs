using GeoModel.Geometry;
using Model.Graph;

namespace GeoModel.Rail.TrackObjects
{
    public abstract class TrackObject : IGraphNode
    {
        public string Id { get; set; }

        public Track? Track { get; set; } 
        public Point3d Location { get; set; } = new Point3d();
        public double Orientation { get; set; }
        public TrackDirection Direction { get; set; }
        /// <summary>
        /// Position along the track in meters.
        /// </summary>
        public double Distance { get; set; }

        protected TrackObject(
            string id,
            Track track,
            double distance)
        {
            Id = id;
            Track = track;
            Distance = distance;
        }
        public TrackObject(string id, Point3d location, double orientation)
        {
            Id = id;
            Location = location;
            Orientation = orientation;
        }

        public void AttachToTrack(Track track, double distance)
        {
            Track = track;
            Distance = distance;
            track.AddObject(this);
        }
        internal void DetachFromTrack()
        {
            Track?.RemoveObject(this);

            Track = null;
        }
        public void Reattach(RailModel railModel)
        {
            if (Track == null)
                return;

            double currentOffset = Track.Geometry
                .FindClosestPoint(Location).Point
                .DistanceTo(Location);

            var candidate = railModel.FindClosestTrack(Location, Track);

            if (candidate == null)
                return;

            double candidateOffset = candidate.Geometry
                .FindClosestPoint(Location).Point
                .DistanceTo(Location);

            if (candidateOffset >= currentOffset)
                return;

            DetachFromTrack();

            double distance = candidate.GetDistance(Location);

            AttachToTrack(candidate, distance);
        }
        public void MoveTo(Point3d location, RailModel railModel)
        {
            Location = location;

            var candidate = railModel.FindClosestTrack(location);

            if (candidate == null)
            {
                DetachFromTrack();
                return;
            }

            var result = candidate.Geometry.FindClosestPoint(location);

            // If already attached to this track, just update the distance
            if (Track == candidate)
            {
                Distance = result.DistanceAlongTrack;
                return;
            }

            DetachFromTrack();

            AttachToTrack(
                candidate,
                result.DistanceAlongTrack);
        }
        public bool IsSameDirection
        {
            get
            {
                if (Track == null)
                    return false;

                Point3d objectDirection = new Point3d(
                    Math.Cos(Orientation),
                    Math.Sin(Orientation),
                    0);

                Point3d trackDirection = Track.TangentAt(Distance);

                double dot =
                    objectDirection.X * trackDirection.X +
                    objectDirection.Y * trackDirection.Y;

                return dot >= 0;
            }
        }
        public void UpdateDistance()
        {
            if (Track == null)
                throw new InvalidOperationException(
                    $"TrackObject '{Id}' has no Track.");

            Distance = Track.Geometry
                .FindClosestPoint(Location)
                .DistanceAlongTrack;
        }
        public Point3d? Point =>
            Track?.PointAt(Distance);

        public Point3d? Tangent =>
            Track?.TangentAt(Distance);
    }
}
