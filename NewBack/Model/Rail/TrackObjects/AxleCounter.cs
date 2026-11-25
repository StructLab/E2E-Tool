using GeoModel.Geometry;
using Model.Rail.Concepts;

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
        public void CreateTVPS(RailModel railModel)
        {
            var otherAxleCounters = this.Track?.Objects.OfType<AxleCounter>().Where(x=>x != this).ToList();

            if (otherAxleCounters == null) return;
            if (otherAxleCounters.Count == 0) return;

            var before = otherAxleCounters.Where(x => x.OffsetOnTrack < this.OffsetOnTrack).FirstOrDefault();
            var after = otherAxleCounters.Where(x => x.OffsetOnTrack > this.OffsetOnTrack).FirstOrDefault();

            TVPSbefore(before,railModel);
            TVPSafter(after, railModel);

            return;
        }
        private void TVPSbefore(AxleCounter? before,RailModel railModel)
        {
            if (before != null)
            {
                var tvps = new TVPS(railModel);
                tvps.AxleCounters.Add(before);
                tvps.AxleCounters.Add(this);

                var avalaibleTVPS = railModel.TVPS.Where(x => x.AxleCounters.Except(tvps.AxleCounters).Count() == 0);

                if (avalaibleTVPS.Any()) return;

                railModel.TVPS.Add(tvps);
                
            }
        }
        private void TVPSafter(AxleCounter? after, RailModel railModel)
        {

            if (after != null)
            {
                var tvps = new TVPS(railModel);
                tvps.AxleCounters.Add(this);
                tvps.AxleCounters.Add(after);

                var avalaibleTVPS = railModel.TVPS.Where(x => x.AxleCounters.Except(tvps.AxleCounters).Count() == 0);

                if (avalaibleTVPS.Any()) return;

                railModel.TVPS.Add(tvps);
            }
        }
    }
}
