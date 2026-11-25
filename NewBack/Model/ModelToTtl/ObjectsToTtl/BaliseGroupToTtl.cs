
using ModelToTtl;
using VDS.RDF;

namespace Model.ModelToTtl.ObjectsToTtl
{
    public class BaliseGroupToTtl(TTLGraph tTLGraph, Model.Rail.TrackObjects.BaliseGroup bG)
    {
        public IUriNode ToTtl()
        {
            List<IUriNode> balises = new List<IUriNode>();
            var increment = 6 / bG.Track?.Geometry.Length ?? 0;
            for (int i = 0; i < bG.Balises.Count; i++)
            {
                var topoPoint = new TopologicalCoordinate(tTLGraph,(bG.OffsetOnTrack + increment * i) * bG.Track.Geometry.Length, bG.Track.Id).RegisterToGraph();
                Balise balise = new Balise(tTLGraph, topoPoint);
                balises.Add(balise.RegisterToGraph());

            }
            var bgFunction = "location";
            var linkOrientationDirection = "both";

            BaliseGroup baliseGroup = new BaliseGroup(tTLGraph, 2, 97, balises, bgFunction, linkOrientationDirection);

            return baliseGroup.RegisterToGraph();
        }
    }
}
