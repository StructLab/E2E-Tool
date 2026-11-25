
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using ModelToTtl;
using VDS.RDF;

namespace Model.ModelToTtl.ObjectsToTtl
{
    public class AxleCounterToTtl(TTLGraph tTLGraph,AxleCounter axleCounter)
    {
        public IUriNode ToTtl()
        {
            var pos = axleCounter.OffsetOnTrack * axleCounter.Track.Geometry.Length;
            var trackId = axleCounter.Track.Id;
            var topologicalId = new TopologicalCoordinate(tTLGraph,pos, trackId).RegisterToGraph();

            var type = new Uri("http://data.europa.eu/949/concepts/train-detection/10");
            var dir = new Uri("http://data.europa.eu/949/concepts/orientations/02");
            TrainDetector trainDetector = new TrainDetector(tTLGraph, axleCounter.Name, topologicalId, type, dir);

            return trainDetector.RegisterToGraph();
        }
    }
}
