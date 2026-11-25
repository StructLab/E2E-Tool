using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.Rail.TrackObjects
{
    public class Elevation : TrackObject
    {
        public Elevation(string id, Track track, double distance) : base(id, track, distance)
        {
        }
    }
}
