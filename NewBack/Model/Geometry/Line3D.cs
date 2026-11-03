using Model.Geometry;

namespace GeoModel.Geometry
{
    /// <summary>
    /// Represents a straight line segment in three-dimensional space.
    /// </summary>
    public class Line3D : Curve3D
    {
        /// <summary>
        /// Gets the starting point of the line segment.
        /// </summary>
        public override Point3d Start { get; }
        /// <summary>
        /// Gets the ending point of the line segment.
        /// </summary>
        public override Point3d End { get; }

        /// <summary>
        /// Gets the Euclidean length of the line segment.
        /// </summary>
        public override double Length
        {
            get
            {
                double dx = End.X - Start.X;
                double dy = End.Y - Start.Y;
                double dz = End.Z - Start.Z;

                return Math.Sqrt(
                    dx * dx +
                    dy * dy +
                    dz * dz
                );
            }
        }
        /// <summary>
        /// Initializes a new line segment using its start and end points.
        /// </summary>
        /// <param name="start">The starting point of the line.</param>
        /// <param name="end">The ending point of the line.</param>

        public Line3D(Point3d start, Point3d end)
        {
            Start = start;
            End = end;
        }

        /// <summary>
        /// Calculates a point at the specified distance from the start of the line.
        /// </summary>
        /// <param name="distance">The distance measured along the line.</param>
        /// <returns>The point at the specified distance.</returns>
        /// <exception cref="ArgumentOutOfRangeException">
        /// Thrown when the distance is negative or greater than the line length.
        /// </exception>

        public override Point3d PointAt(double distance)
        {
            if (distance < 0 || distance > Length)
                throw new ArgumentOutOfRangeException(nameof(distance));

            double t = distance / Length;

            return new Point3d(
                Start.X + (End.X - Start.X) * t,
                Start.Y + (End.Y - Start.Y) * t,
                Start.Z + (End.Z - Start.Z) * t
            );
        }

        /// <summary>
        /// Calculates the unit direction vector of the line.
        /// </summary>
        /// <param name="distance">
        /// The distance along the line at which the tangent is requested.
        /// </param>
        /// <returns>The normalized direction vector of the line.</returns>
        public override Point3d TangentAt(double distance)
        {
            double length = Length;

            return new Point3d(
                (End.X - Start.X) / length,
                (End.Y - Start.Y) / length,
                (End.Z - Start.Z) / length
            );
        }

        /// <summary>
        /// Finds the closest point on the line segment to the specified point.
        /// </summary>
        /// <param name="point">The point used for the closest-point calculation.</param>
        /// <returns>
        /// The closest point, its distance from the input point,
        /// and its distance along the line.
        /// </returns>
        public override ClosestPointResult FindClosestPoint(Point3d point)
        {
            double dx = End.X - Start.X;
            double dy = End.Y - Start.Y;
            double dz = End.Z - Start.Z;

            double lengthSquared =
                dx * dx +
                dy * dy +
                dz * dz;

            if (lengthSquared == 0)
            {
                return new ClosestPointResult
                {
                    Point = Start,
                    Distance = Distance(Start, point),
                    DistanceAlongCurve = 0
                };
            }

            // Projection parameter
            double t =
                ((point.X - Start.X) * dx +
                 (point.Y - Start.Y) * dy +
                 (point.Z - Start.Z) * dz)
                / lengthSquared;

            // Clamp to the line segment
            t = Math.Max(0, Math.Min(1, t));

            Point3d closestPoint = new Point3d(
                Start.X + t * dx,
                Start.Y + t * dy,
                Start.Z + t * dz
            );

            return new ClosestPointResult
            {
                Point = closestPoint,
                Distance = Distance(point, closestPoint),
                DistanceAlongCurve = t * Length
            };
        }

        /// <summary>
        /// Calculates the Euclidean distance between two points in three-dimensional space.
        /// </summary>
        /// <param name="a">The first point.</param>
        /// <param name="b">The second point.</param>
        /// <returns>The distance between the two points.</returns>
        private double Distance(Point3d a, Point3d b)
        {
            double dx = a.X - b.X;
            double dy = a.Y - b.Y;
            double dz = a.Z - b.Z;

            return Math.Sqrt(
                dx * dx +
                dy * dy +
                dz * dz);
        }

        /// <summary>
        /// Creates a new line segment with the start and end points swapped.
        /// </summary>
        /// <returns>A new line segment in the opposite direction.</returns>
        public override Curve3D Reverse()
        {
            return new Line3D(End, Start);
        }
    }
}
