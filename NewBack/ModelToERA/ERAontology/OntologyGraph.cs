using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF;
using VDS.RDF.Parsing;

namespace ModelToERA.ERAontology
{
    public class OntologyGraph
    {
        public IGraph G { get; set; } = CreateGraph();

        private static IGraph CreateGraph()
        {
            var graph = new VDS.RDF.Graph();

            graph.NamespaceMap.AddNamespace(
                "era",
                new Uri("http://data.europa.eu/949/"));

            graph.NamespaceMap.AddNamespace(
                "concepts",
                new Uri("http://data.europa.eu/949/concepts/"));

            graph.NamespaceMap.AddNamespace(
                "rdf",
                new Uri(NamespaceMapper.RDF));

            graph.NamespaceMap.AddNamespace(
                "rdfs",
                new Uri(NamespaceMapper.RDFS));

            graph.NamespaceMap.AddNamespace(
                "xsd",
                new Uri(XmlSpecsHelper.NamespaceXmlSchema));

            return graph;
        }

        public static IGraph LoadGraph(string filePath)
        {
            IGraph graph = CreateGraph();

            FileLoader.Load(graph, filePath);

            return graph;
        }
    }
}
