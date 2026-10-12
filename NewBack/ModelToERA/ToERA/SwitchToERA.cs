using GeoModel.Rail;
using ModelToERA.ERAontology;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF;

namespace ModelToERA.ToERA
{
    public class SwitchToERA(OntologyGraph graph, Model.Rail.TrackObjects.Switch @switch)
    {
        public void ToERA()
        {
            var leftTrack = graph.G.AllNodes
                .FirstOrDefault(node =>
                    node is IUriNode uriNode &&
                    uriNode.Uri.AbsoluteUri.Contains("linearElement/") &&
                    uriNode.Uri.AbsoluteUri.Split('/').Last()
                        .Equals(@switch.LeftTrack.Id));

            var rightTrack = graph.G.AllNodes
                .FirstOrDefault(node =>
                    node is IUriNode uriNode &&
                    uriNode.Uri.AbsoluteUri.Contains("linearElement/") &&
                    uriNode.Uri.AbsoluteUri.Split('/').Last()
                        .Equals(@switch.RightTrack.Id));

            if (leftTrack == null || rightTrack == null)
            {
                throw new InvalidOperationException(
                    $"Could not find left or right track for switch '{@switch.Id}'.");
            }

            Switch switchTTL = new Switch(
                graph,
                @switch.Id,
                (IUriNode)leftTrack,
                (IUriNode)rightTrack);
            switchTTL.RegisterToGraph();
        }
    }
}
