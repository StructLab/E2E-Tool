using GeoModel.Geometry;

namespace GeoModel.Rail.TrackObjects
{
    public class BufferStop : TrackObject
    {
        public BufferStop(
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
