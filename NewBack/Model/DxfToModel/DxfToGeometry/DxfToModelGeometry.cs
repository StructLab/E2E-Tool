using GeoModel.Geometry;
using netDxf.Entities;

namespace Model.DxfToModel.DxfToGeometry
{
    public static class DxfToModelGeometry
    {
        public static Line3D ToLine3D(this Line line)
        {
            var pointA = new Point3d(line.StartPoint.X, line.StartPoint.Y, line.StartPoint.Z);
            var pointB = new Point3d(line.EndPoint.X, line.EndPoint.Y, line.EndPoint.Z);

            return new Line3D(pointA,pointB);
        }
        public static Arc3D ToArc3D(this Arc arc)
        {
            var start = arc.ToPolyline2D(2).Vertexes.First();
            var end = arc.ToPolyline2D(2).Vertexes.Last();
            var pointA = new Point3d(start.Position.X, start.Position.Y, 0);
            var pointB = new Point3d(end.Position.X, end.Position.Y, 0);

            return new Arc3D(pointA, pointB, arc.Radius);
        }
        public static PolyLine3D ToPolyline(this Polyline2D poly)
        {
            var curves = poly.Explode()
                .Select<EntityObject, Curve3D>(x => x switch
                {
                    Line l => l.ToLine3D(),
                    Arc a => a.ToArc3D(),
                    _ => throw new NotSupportedException(
                        $"Unsupported entity type: {x.GetType().Name}")
                })
                .ToList();

            return new PolyLine3D(curves);
        }
    }
}
