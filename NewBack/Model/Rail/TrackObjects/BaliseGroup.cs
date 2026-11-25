using GeoModel.Geometry;
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.Rail.TrackObjects
{
    public class BaliseGroup : TrackObject
    {
        public List<Balise> Balises { get; set; }
        public BaliseGroup(
            string id,
            Track track,
            double distance)
            : base(id, track, distance)
        {
        }

        public BaliseGroup(
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
