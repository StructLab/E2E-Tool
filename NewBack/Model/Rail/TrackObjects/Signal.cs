using GeoModel.Geometry;

namespace GeoModel.Rail.TrackObjects
{
    public class Signal : TrackObject
    {
        public Signal(
            string id,
            Track track,
            double distance)
            : base(id, track, distance)
        {
        }

        public Signal(
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
