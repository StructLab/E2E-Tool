using GeoModel.Geometry;
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using Model.Rail.TrackObjects;
using netDxf.Entities;

namespace Model.DxfToModel.DxfToGeometry
{
    public static class DxfToModelObject
    {
        public static Switch ToSwitch(this Insert insert,RailModel railModel)
        {
            var location = new Point3d(insert.Position.X, insert.Position.Y, 0);
            return new Switch(location, railModel);
        }
        public static Signal ToSignal(this Insert insert, RailModel railModel)
        {
            var location = new Point3d(insert.Position.X, insert.Position.Y, 0);
            return new Signal(string.Empty,location, insert.Rotation,railModel);
        }
        public static AxleCounter ToAxleCounter(this Insert insert, RailModel railModel)
        {
            var location = new Point3d(insert.Position.X, insert.Position.Y, 0);
            return new AxleCounter(string.Empty, location, insert.Rotation, railModel);
        }
        public static BaliseGroup ToBaliseGroup(this Insert insert, RailModel railModel)
        {
            var location = new Point3d(insert.Position.X, insert.Position.Y, 0);
            return new BaliseGroup(string.Empty, location, insert.Rotation, railModel);
        }
    }
}
