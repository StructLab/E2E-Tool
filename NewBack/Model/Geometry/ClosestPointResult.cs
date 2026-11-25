using GeoModel.Geometry;

namespace Model.Geometry
{
    public class ClosestPointResult
    {
        public Point3d Point { get; set; } = new Point3d();

        // 3D distance from the requested point to the curve
        public double Distance { get; set; }

        // OffsetOnTrack from the beginning of this curve
        public double DistanceAlongCurve { get; set; }

        // OffsetOnTrack from beginning of the whole PolyLine3D
        public double DistanceAlongTrack { get; set; }
    }
}
