using GeoModel.Geometry;

namespace GeoModel.Rail.TrackObjects
{
    public class AxleCounter : TrackObject
    {
        public AxleCounter(
            string id,
            Point3d location,
            double rotation,
            RailModel railModel)
            : base(id, location, rotation)
        {
            railModel.AttachTrackObject(this);
        }
    }
}
