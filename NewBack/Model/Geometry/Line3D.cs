using Model.Geometry;

namespace GeoModel.Geometry
{
    public class Line3D : Curve3D
    {
        public override Point3d Start { get; }
        public override Point3d End { get; }

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

        public Line3D(Point3d start, Point3d end)
        {
            Start = start;
            End = end;
        }

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
        public override Point3d TangentAt(double distance)
        {
            double length = Length;

            return new Point3d(
                (End.X - Start.X) / length,
                (End.Y - Start.Y) / length,
                (End.Z - Start.Z) / length
            );
        }
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
        public override Curve3D Reverse()
        {
            return new Line3D(End, Start);
        }
    }
}
