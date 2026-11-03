using Model.Geometry;

namespace GeoModel.Geometry
{
    /// <summary>
    /// Represents a three-dimensional polyline consisting of connected curve segments.
    /// </summary>
    public class PolyLine3D
    {
        /// <summary>
        /// Gets the collection of curve segments that form the polyline.
        /// </summary>
        public List<Curve3D> Segments { get; } = new();

        /// <summary>
        /// Gets the total length of the polyline by summing the lengths
        /// of all its curve segments.
        /// </summary>
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

        /// <summary>
        /// Gets the starting point of the first segment in the polyline.
        /// </summary>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the polyline contains no segments.
        /// </exception>
        public Point3d Start =>
        Segments.Count > 0
        ? Segments[0].Start
        : throw new InvalidOperationException("PolyLine3D contains no segments.");

        /// <summary>
        /// Gets the ending point of the last segment in the polyline.
        /// </summary>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the polyline contains no segments.
        /// </exception>
        public Point3d End =>
            Segments.Count > 0
                ? Segments[^1].End
                : throw new InvalidOperationException("PolyLine3D contains no segments.");

        /// <summary>
        /// Adds a curve segment to the polyline.
        /// </summary>
        /// <param name="segment">The curve segment to add.</param>
        public void Add(Curve3D segment)
        {
            Segments.Add(segment);
        }

        /// <summary>
        /// Reorders and reverses curve segments when necessary to connect
        /// them into a continuous polyline.
        /// </summary>
        /// <remarks>
        /// Segments are considered connected when the distance between
        /// their joining endpoints is within a tolerance of 0.001.
        /// </remarks>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the remaining segments cannot be connected.
        /// </exception>
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

        /// <summary>
        /// Gets the point located at a specified distance along the polyline.
        /// </summary>
        /// <param name="distance">
        /// The distance measured from the beginning of the polyline.
        /// </param>
        /// <returns>The point at the specified distance along the polyline.</returns>
        /// <exception cref="ArgumentOutOfRangeException">
        /// Thrown when the distance is less than zero or greater than
        /// the total polyline length.
        /// </exception>
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

        /// <summary>
        /// Gets the tangent direction at a specified distance along the polyline.
        /// </summary>
        /// <param name="distance">
        /// The distance measured from the beginning of the polyline.
        /// </param>
        /// <returns>The tangent direction at the specified distance.</returns>
        /// <exception cref="ArgumentOutOfRangeException">
        /// Thrown when the distance is less than zero or greater than
        /// the total polyline length.
        /// </exception>
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

        /// <summary>
        /// Finds the closest point on the polyline to a specified point.
        /// </summary>
        /// <param name="point">The point used to calculate the closest location.</param>
        /// <returns>
        /// A result containing the closest point, its distance from the
        /// specified point, and its distance along the polyline.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the polyline contains no segments.
        /// </exception>
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

        /// <summary>
        /// Gets the distance from the beginning of the polyline to the
        /// beginning of a specified segment.
        /// </summary>
        /// <param name="segment">The segment whose position is requested.</param>
        /// <returns>The distance along the polyline to the start of the segment.</returns>
        /// <exception cref="ArgumentException">
        /// Thrown when the specified segment does not belong to the polyline.
        /// </exception>
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

        /// <summary>
        /// Calculates the azimuth of a curve segment in degrees.
        /// The azimuth is measured clockwise from the positive Y direction.
        /// </summary>
        /// <param name="segment">The curve segment whose azimuth is calculated.</param>
        /// <returns>The azimuth angle in degrees, in the range from 0 to 360.</returns>
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
