using Rail;
using VDS.RDF;

namespace RailTool.Services.DataLoading
{
    public class RailModelState
    {
        public RailModel Current { get; set; } = new RailModel(new(), new(), new(), new());
        public RDF.TTLGraph Graph { get;  set; }
        public void Set(RailModel model, RDF.TTLGraph graph)
        {
            Current = model;
            Graph = graph;
        }
    }
}
