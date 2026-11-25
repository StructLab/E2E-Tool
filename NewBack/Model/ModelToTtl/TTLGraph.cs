
using VDS.RDF.Parsing;
using VDS.RDF.Writing;
using VDS.RDF;
using VDS.RDF.Shacl.Validation;
using VDS.RDF.Shacl;

namespace ModelToTtl
{
    public class TTLGraph
    {
        public IGraph G { get; set; }
        string TtlFilePath { get; set; }

  
        public TTLGraph(string output, params string [] nameSpaces) {

    
            G = new VDS.RDF.Graph();
            // Default namespace ":"
            //G.NamespaceMap.AddNamespace("", new Uri("http://example.com/ns/"));

            // ERA ontology
            G.NamespaceMap.AddNamespace("era", new Uri("http://data.europa.eu/949/"));
            G.NamespaceMap.AddNamespace("concepts", new Uri("http://data.europa.eu/949/concepts/"));
            // Standard RDF namespaces
            G.NamespaceMap.AddNamespace("rdf", new Uri(NamespaceMapper.RDF));
            G.NamespaceMap.AddNamespace("rdfs", new Uri(NamespaceMapper.RDFS));
            G.NamespaceMap.AddNamespace("xsd", new Uri(XmlSpecsHelper.NamespaceXmlSchema));

            // ERA controlled vocabulary
            //G.NamespaceMap.AddNamespace(
            //    "era-nv-rinf",
            //    new Uri("http://data.europa.eu/949/concepts/navigabilities/rinf/")
            //);

            this.TtlFilePath = output;
        }
        public void Write(string fileName) {

         
            // Write Turtle
            new CompressingTurtleWriter().Save(G, $"{TtlFilePath}/{fileName}.ttl");

        
            // Create JSON-LD writer
            var writer = new JsonLdWriter();
            // Create a TripleStore and add your graph
            TripleStore store = new TripleStore();
            store.Add(G);
            // Save as JSON-LD
            writer.Save(store, $"{TtlFilePath}/{fileName}.jsonld");


            // RDF/XML writer
            RdfXmlWriter rdfWriter = new RdfXmlWriter();

            // Save to file
            rdfWriter.Save(G, $"{TtlFilePath}/{fileName}.rdf");


            //Validate(fileName);
        }

        public void AddNodeList(IEnumerable<INode> nodes)
        {
            G.AssertList(nodes);
        }
        public void AddTriple(INode subject, INode predicate, INode obj)
        {
            G.Assert(subject, predicate,obj);
        }

        public void Validate(string file)
        {
            // Load data graph
            VDS.RDF.Graph dataGraph = new VDS.RDF.Graph();
            FileLoader.Load(dataGraph, $"{TtlFilePath}/{file}.ttl");

            // Load SHACL shapes graph
            VDS.RDF.Graph shapesGraph = new VDS.RDF.Graph();
            FileLoader.Load(shapesGraph, $"{TtlFilePath}/infra-dataprep-shapes_v1.3_new.ttl");

            // Create SHACL shapes
            ShapesGraph shapes = new ShapesGraph(shapesGraph);

            // Validate
            Report report = shapes.Validate(dataGraph);

            if (report.Conforms)
            {
                Console.WriteLine("✅ Data conforms to SHACL schema.");
            }
            else
            {
                Console.WriteLine("❌ Data does NOT conform.");
                foreach (var result in report.Results)
                {
                    Console.WriteLine(result.Message);
                }
            }
        }
    }
}
