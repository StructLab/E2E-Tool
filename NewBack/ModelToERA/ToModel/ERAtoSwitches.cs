using ModelToERA.ERAontology;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF;

namespace ToModel
{
    public class ERAtoSwitches(IGraph graph)
    {
        const string eraUri = "http://data.europa.eu/949/";

        public List<Model.Rail.TrackObjects.Switch> Switches()
        {
            var functionalElementProjections = FunctionalElementProjections()
                .Select(x => (x, Helper.GetPredicateValue(graph, x.Uri.AbsoluteUri, "http://data.europa.eu/949/elementRef")))
                .Where(x => Helper.GetPredicateValue(graph, ((IUriNode)x.Item2).Uri.AbsoluteUri, "http://data.europa.eu/949/switch") != null);

            var switches = functionalElementProjections.Select(x => (((IUriNode)x.x).Uri.AbsoluteUri.Split("/").Last(), x.x.GetCoordinate(graph)));

            return switches.Select(x => new Model.Rail.TrackObjects.Switch(x.Item2)).ToList();

        }
        private List<IUriNode> FunctionalElementProjections()
        {
            const string subjectUri = "http://data.europa.eu/949/functionalElementProjection";
            var functionalElementProjections = Helper.GetSubjectsStartingWith(graph, subjectUri).ToList();
            return functionalElementProjections;
        }
    }
}
