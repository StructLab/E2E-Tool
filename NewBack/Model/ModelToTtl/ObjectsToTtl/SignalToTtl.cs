using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF;
using ModelToTtl;

namespace Model.ModelToTtl.ObjectsToTtl
{
    public class SignalToTtl(TTLGraph tTLGraph, Signal signal)
    {
        public IUriNode ToTtl()
        {
            var topologicalId = new TopologicalCoordinate(tTLGraph, signal.OffsetOnTrack, signal.Track.Id).RegisterToGraph();
            var dir = signal.Direction == TrackDirection.Positive ? "00" : "01";
            var appliesToDir = new Uri($"http://data.europa.eu/949/concepts/orientations/{dir}");
            NetPointReference netPointReference = new NetPointReference(tTLGraph, topologicalId, appliesToDir);

            var netPointReferenceId = netPointReference.RegisterToGraph();
            ETCSMarker eTCSMarker = new ETCSMarker(tTLGraph, signal.Name, netPointReferenceId);

            return eTCSMarker.RegisterToGraph();
        }
    }
}
