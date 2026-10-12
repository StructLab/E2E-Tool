using GeoModel.Geometry;
using GeoModel.Rail;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.Graph
{
    public class TrackEndpoint : IGraphNode
    {
        public Track Track { get; }

        public bool IsStart { get; }

        public Point3d Location =>
            IsStart
                ? Track.Geometry.Start
                : Track.Geometry.End;

        public TrackEndpoint(Track track, bool isStart)
        {
            Track = track;
            IsStart = isStart;
        }

        public override string ToString()
        {
            return $"{Track.Id} {(IsStart ? "Start" : "End")}";
        }
    }
}
