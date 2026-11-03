using Model.Geometry;

namespace GeoModel.Geometry
{
    /// <summary>
    /// Represents a circular arc in three-dimensional space.
    /// </summary>
    public class Arc3D : Curve3D
    {
        /// <summary>
        /// Gets the starting point of the arc.
        /// </summary>
        public override Point3d Start { get; }

        /// <summary>
        /// Gets the ending point of the arc.
        /// </summary>
        public override Point3d End { get; }

        /// <summary>
        /// Gets the signed radius of the arc.
        /// The sign determines the direction of the arc.
        /// </summary>
        public double Radius { get; }

        /// <summary>
        /// Gets the centre point of the arc.
        /// </summary>
        public Point3d Center { get; private set; } = new Point3d(0, 0, 0);

        /// <summary>
        /// Gets the starting angle of the arc in radians.
        /// </summary>
        public double StartAngle { get; private set; }

        /// <summary>
        /// Gets the angular sweep of the arc in radians.
        /// </summary>
        public double SweepAngle { get; private set; }

        /// <summary>
        /// Gets the length of the arc, calculated from its radius and sweep angle.
        /// </summary>
        public override double Length =>
            Math.Abs(Radius * SweepAngle);

        /// <summary>
        /// Initializes a circular arc using its start point, end point and signed radius.
        /// Calculates the centre and angular properties of the arc.
        /// </summary>
        /// <param name="start">The starting point of the arc.</param>
        /// <param name="end">The ending point of the arc.</param>
        /// <param name="radius">The signed radius used to determine the arc direction.</param>
        /// <exception cref="ArgumentException">
        /// Thrown when the radius is too small for the distance between the endpoints.
        /// </exception>
        public Arc3D(Point3d start, Point3d end, double radius)
        {
            Start = start;
            End = end;
            Radius = radius;

            Calculate();
        }

        /// <summary>
        /// Calculates the centre, starting angle and sweep angle of the arc
        /// using its start point, end point and radius.
        /// </summary>

        private void Calculate()
        {
            double r = Math.Abs(Radius);

            double dx = End.X - Start.X;
            double dy = End.Y - Start.Y;

            double chord = Math.Sqrt(dx * dx + dy * dy);

            if (chord > 2 * r)
                throw new ArgumentException(
                    "Radius is too small for the start/end points.");

            double midX = (Start.X + End.X) / 2.0;
            double midY = (Start.Y + End.Y) / 2.0;

            double h = Math.Sqrt(
                r * r - chord * chord / 4.0);

            double perpX = -dy / chord;
            double perpY = dx / chord;

            double direction = Radius > 0 ? -1 : 1;

            Center = new Point3d(
                midX + direction * perpX * h,
                midY + direction * perpY * h,
                Start.Z
            );

            StartAngle = Math.Atan2(
                Start.Y - Center.Y,
                Start.X - Center.X);

            double endAngle = Math.Atan2(
                End.Y - Center.Y,
                End.X - Center.X);

            if (Radius > 0)
            {
                // Clockwise
                SweepAngle = StartAngle - endAngle;

                if (SweepAngle < 0)
                    SweepAngle += 2 * Math.PI;
            }
            else
            {
                // Counter-clockwise
                SweepAngle = endAngle - StartAngle;

                if (SweepAngle < 0)
                    SweepAngle += 2 * Math.PI;
            }
        }

        /// <summary>
        /// Calculates a point on the arc at the specified distance from its start.
        /// </summary>
        /// <param name="distance">The distance measured along the arc.</param>
        /// <returns>The calculated point on the arc.</returns>
        /// <exception cref="ArgumentOutOfRangeException">
        /// Thrown when the distance is negative or greater than the arc length.
        /// </exception>
        public override Point3d PointAt(double distance)
        {
            if (distance < 0 || distance > Length)
                throw new ArgumentOutOfRangeException(nameof(distance));

            double t = distance / Length;

            double angle;

            if (Radius > 0)
                angle = StartAngle - SweepAngle * t;
            else
                angle = StartAngle + SweepAngle * t;

            return new Point3d(
                Center.X + Math.Cos(angle) * Math.Abs(Radius),
                Center.Y + Math.Sin(angle) * Math.Abs(Radius),
                Start.Z + (End.Z - Start.Z) * t
            );
        }

        /// <summary>
        /// Calculates the tangent direction of the arc at the specified distance.
        /// </summary>
        /// <param name="distance">The distance measured along the arc.</param>
        /// <returns>The tangent direction vector at the specified position.</returns>
        /// <exception cref="ArgumentOutOfRangeException">
        /// Thrown when the distance is negative or greater than the arc length.
        /// </exception>
        public override Point3d TangentAt(double distance)
        {
            if (distance < 0 || distance > Length)
                throw new ArgumentOutOfRangeException(nameof(distance));

            double t = distance / Length;

            double angle;

            if (Radius > 0)
                angle = StartAngle - SweepAngle * t;
            else
                angle = StartAngle + SweepAngle * t;

            double sign = Radius > 0 ? -1.0 : 1.0;

            return new Point3d(
                sign * -Math.Sin(angle),
                sign * Math.Cos(angle),
                0
            );
        }

        /// <summary>
        /// Finds the closest point on the arc to the specified input point.
        /// Uses radial projection when the projected point lies within the arc;
        /// otherwise, compares the two endpoints.
        /// </summary>
        /// <param name="point">The input point used for the closest-point calculation.</param>
        /// <returns>
        /// The closest point, its distance from the input point,
        /// and its distance along the arc.
        /// </returns>
        public override ClosestPointResult FindClosestPoint(Point3d point)
        {
            double radius = Math.Abs(Radius);

            double dx = point.X - Center.X;
            double dy = point.Y - Center.Y;

            double distanceFromCenter =
                Math.Sqrt(dx * dx + dy * dy);

            // Point is exactly at the center.
            // There is no unique radial direction.
            if (distanceFromCenter < 1e-12)
            {
                return ClosestEndpoint(point);
            }

            // Angle from center to point
            double angle = Math.Atan2(dy, dx);

            // Normalize angle
            angle = NormalizeAngle(angle);

            double startAngle = NormalizeAngle(StartAngle);

            double angleFromStart;

            if (Radius > 0)
            {
                // Clockwise
                angleFromStart =
                    NormalizeAngle(startAngle - angle);
            }
            else
            {
                // Counter-clockwise
                angleFromStart =
                    NormalizeAngle(angle - startAngle);
            }

            // Is the projected radial point inside the arc?
            if (angleFromStart <= SweepAngle)
            {
                double signedAngle;

                if (Radius > 0)
                    signedAngle = -angleFromStart;
                else
                    signedAngle = angleFromStart;

                double closestAngle =
                    startAngle + signedAngle;

                Point3d closestPoint = new Point3d(
                    Center.X + radius * Math.Cos(closestAngle),
                    Center.Y + radius * Math.Sin(closestAngle),
                    Start.Z
                );

                return new ClosestPointResult
                {
                    Point = closestPoint,
                    Distance = Math.Abs(distanceFromCenter - radius),
                    DistanceAlongCurve =
                        radius * angleFromStart
                };
            }

            // Projection is outside the arc.
            // Check both endpoints.
            return ClosestEndpoint(point);
        }

        /// <summary>
        /// Determines which endpoint of the arc is closer to the specified point
        /// and returns the corresponding closest-point result.
        /// </summary>
        /// <param name="point">The input point to compare with the endpoints.</param>
        /// <returns>The closest endpoint and its distance information.</returns>
        private ClosestPointResult ClosestEndpoint(Point3d point)
        {
            double startDistance = Distance(point, Start);
            double endDistance = Distance(point, End);

            if (startDistance <= endDistance)
            {
                return new ClosestPointResult
                {
                    Point = Start,
                    Distance = startDistance,
                    DistanceAlongCurve = 0
                };
            }

            return new ClosestPointResult
            {
                Point = End,
                Distance = endDistance,
                DistanceAlongCurve = Length
            };
        }

        /// <summary>
        /// Normalizes an angle to the range from zero to 2π radians.
        /// </summary>
        /// <param name="angle">The angle in radians.</param>
        /// <returns>The normalized angle.</returns>

        private static double NormalizeAngle(double angle)
        {
            angle %= 2 * Math.PI;

            if (angle < 0)
                angle += 2 * Math.PI;

            return angle;
        }

        /// <summary>
        /// Calculates the Euclidean distance between two points
        /// in three-dimensional space.
        /// </summary>
        /// <param name="a">The first point.</param>
        /// <param name="b">The second point.</param>
        /// <returns>The distance between the two points.</returns>

        private static double Distance(Point3d a, Point3d b)
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
        /// Creates a new arc with the start and end points swapped
        /// and the radius sign reversed to change the arc direction.
        /// </summary>
        /// <returns>A new arc representing the reversed direction.</returns>
        public override Curve3D Reverse()
        {
            return new Arc3D(
                  End,
                  Start,
                  -Radius);
        }
    }
}
