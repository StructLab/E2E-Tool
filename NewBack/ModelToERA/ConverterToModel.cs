using GeoModel.Rail;
using ModelToERA.ERAontology;
using ModelToERA.ToERA;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using ToModel;
using VDS.RDF;
using VDS.RDF.Ontology;
using OntologyGraph = VDS.RDF.Ontology.OntologyGraph;

namespace ModelToERA
{
    public class ConverterToModel(ERAontology.OntologyGraph graph)
    {
        public RailModel RailModel { get; set; } = new RailModel();

        public void Tracks()
        {
            LinearElementsToTracks().ForEach(x => RailModel.AddTrack(x));
        }
        public void Switches()
        {
            ERAtoSwitches eRAtoSwitches = new ERAtoSwitches(graph.G);
            var switchs = eRAtoSwitches.Switches();
            switchs.ForEach(x => x.ConnectToTracks(RailModel.Tracks));
            new SwitchToERA(graph, switchs.First()).ToERA();
        }
        private List<Track> LinearElementsToTracks()
        {
            List<Track> tracks = new List<Track>();

            const string subjectUri = "http://data.europa.eu/949/linearElementGeometry";
            var linearElementGeometrys = ModelToERA.ERAontology.Helper.GetSubjectsStartingWith(graph.G, subjectUri).ToList();
            foreach (var linearElementGeometry in linearElementGeometrys)
            {
                var track = new ToModel.ERAtoTrack(graph.G).LinearElementGeometry((IUriNode)linearElementGeometry);
                tracks.Add(track);
            }
            return tracks;
        }
       
    }
}
