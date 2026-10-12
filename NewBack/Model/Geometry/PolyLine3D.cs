using Model.Geometry;

namespace GeoModel.Geometry
{
    public class PolyLine3D
    {
        public List<Curve3D> Segments { get; } = new();

        public double Length
        {
            get
            {
                double length = 0;

                foreach (var segment in Segments)
                    length += segment.Length;

                return length;
            }
        }
        public Point3d Start =>
        Segments.Count > 0
        ? Segments[0].Start
        : throw new InvalidOperationException("PolyLine3D contains no segments.");

        public Point3d End =>
            Segments.Count > 0
                ? Segments[^1].End
                : throw new InvalidOperationException("PolyLine3D contains no segments.");

        public void Add(Curve3D segment)
        {
            Segments.Add(segment);
        }
        public void Chain()
        {
            if (Segments.Count <= 1)
                return;

            var remaining = new List<Curve3D>(Segments);
            var chained = new List<Curve3D>();

            // Start with the first segment
            var current = remaining[0];

            remaining.RemoveAt(0);
            chained.Add(current);

            const double tolerance = 0.001;

            while (remaining.Count > 0)
            {
                bool found = false;

                for (int i = 0; i < remaining.Count; i++)
                {
                    var candidate = remaining[i];

                    // Current.End -> Candidate.Start
                    if (current.End.DistanceTo(candidate.Start) <= tolerance)
                    {
                        chained.Add(candidate);
                        current = candidate;
                        remaining.RemoveAt(i);
                        found = true;
                        break;
                    }

                    // Candidate.End -> Current.End
                    // Candidate needs to be reversed
                    if (current.End.DistanceTo(candidate.End) <= tolerance)
                    {
                        // We need a reversed curve here
                        var reversed = candidate.Reverse();

                        chained.Add(reversed);
                        current = reversed;
                        remaining.RemoveAt(i);
                        found = true;
                        break;
                    }
                }

                if (!found)
                {
                    throw new InvalidOperationException(
                        $"Could not chain the remaining segments. " +
                        $"Current end: {current.End}");
                }
            }

            Segments.Clear();
            Segments.AddRange(chained);
        }
        public Point3d PointAt(double distance)
        {
            if (distance < 0 || distance > Length)
                throw new ArgumentOutOfRangeException(nameof(distance));

            double currentDistance = 0;

            foreach (var segment in Segments)
            {
                if (distance <= currentDistance + segment.Length)
                {
                    double localDistance =
                        distance - currentDistance;

                    return segment.PointAt(localDistance);
                }

                currentDistance += segment.Length;
            }

            return Segments[^1].End;
        }
        public Point3d TangentAt(double distance)
        {
            if (distance < 0 || distance > Length)
                throw new ArgumentOutOfRangeException(nameof(distance));

            double currentDistance = 0;

            foreach (var segment in Segments)
            {
                if (distance <= currentDistance + segment.Length)
                {
                    double localDistance =
                        distance - currentDistance;

                    return segment.TangentAt(localDistance);
                }

                currentDistance += segment.Length;
            }

            return Segments[^1].TangentAt(Segments[^1].Length);
        }
        public ClosestPointResult FindClosestPoint(Point3d point)
        {
            ClosestPointResult? closest = null;

            double distanceAlongTrack = 0;

            foreach (var segment in Segments)
            {
                var result = segment.FindClosestPoint(point);

                double distanceFromStart =
                    distanceAlongTrack + result.DistanceAlongCurve;

                if (closest == null || result.Distance < closest.Distance)
                {
                    closest = new ClosestPointResult
                    {
                        Point = result.Point,
                        Distance = result.Distance,
                        DistanceAlongTrack = distanceFromStart
                    };
                }

                distanceAlongTrack += segment.Length;
            }

            if (closest == null)
                throw new InvalidOperationException(
                    "PolyLine3D contains no segments.");

            return closest;
        }
        public double Pos(Curve3D segment)
        {
            double distance = 0;

            foreach (var current in Segments)
            {
                if (ReferenceEquals(current, segment))
                    return distance;

                distance += current.Length;
            }

            throw new ArgumentException(
                "The segment does not belong to this PolyLine3D.",
                nameof(segment));
        }
        public double Azimuth(Curve3D segment)
        {
            var tangent = segment.TangentAt(0);

            double azimuth = Math.Atan2(tangent.X, tangent.Y)
                             * 180.0 / Math.PI;

            if (azimuth < 0)
                azimuth += 360.0;

            return azimuth;
        }
    }
}
