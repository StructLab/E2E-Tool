namespace GeoModel.Geometry
{
    using Model.Geometry;
    using System.Diagnostics;

    [DebuggerDisplay("Start = {Start}, End = {End}, Length = {Length}")]
    public abstract class Curve3D
    {
        public abstract Point3d Start { get; }
        public abstract Point3d End { get; }

        public abstract double Length { get; }

        public abstract Point3d PointAt(double distance);
        public abstract Point3d TangentAt(double distance);
        public abstract ClosestPointResult FindClosestPoint(Point3d point);
        public abstract Curve3D Reverse();
    }
}
