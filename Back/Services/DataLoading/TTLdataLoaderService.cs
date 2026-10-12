using CCSTMSturtle.Model.Helpers;
using CCSTMSturtle.RDF;
using Rail;
using VDS.RDF;

namespace RailTool.Services.DataLoading
{
    public class TTLdataLoaderService : IDataLoader
    {
        public RailModel Load(string filePath)
        {
            Graph graph = new Graph();
            graph.LoadFromFile(filePath);
            var rdtToRail = new RDFtoRailModel(graph);
            rdtToRail.ToRail();

            return rdtToRail.RailModel;
        }
    }
}
