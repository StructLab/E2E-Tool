using Model.Geometry;

namespace GeoModel.Geometry
{
    public class Arc3D : Curve3D
    {
        public override Point3d Start { get; }
        public override Point3d End { get; }

        public double Radius { get; }

        public Point3d Center { get; private set; } = new Point3d(0, 0, 0);

        public double StartAngle { get; private set; }
        public double SweepAngle { get; private set; }

        public override double Length =>
            Math.Abs(Radius * SweepAngle);

        public Arc3D(Point3d start, Point3d end, double radius)
        {
            Start = start;
            End = end;
            Radius = radius;

            Calculate();
        }

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

        private static double NormalizeAngle(double angle)
        {
            angle %= 2 * Math.PI;

            if (angle < 0)
                angle += 2 * Math.PI;

            return angle;
        }

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
        public override Curve3D Reverse()
        {
            return new Arc3D(
                  End,
                  Start,
                  -Radius);
        }
    }
}
