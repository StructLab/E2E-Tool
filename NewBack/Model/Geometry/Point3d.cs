using System.Diagnostics;

namespace GeoModel.Geometry
{
    [DebuggerDisplay("({X}, {Y}, {Z})")]
    public class Point3d
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }

        public Point3d()
        {
        }

        public Point3d(double x, double y, double z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public double DistanceTo(Point3d b)
        {
            double dx = X - b.X;
            double dy = Y - b.Y;
            double dz = Z - b.Z;

            return Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }
        public bool Equals(Point3d other, double tolerance = 1e-2)
        {
            if (other == null)
                return false;

            return DistanceTo(other) <= tolerance;
        }
    }
}
