using GeoModel.Geometry;
using System.Globalization;
using VDS.RDF;
using VDS.RDF.Parsing;

namespace ModelToERA.ERAontology
{
    public static class Helper
    {
        public static void AddType(this IGraph g, IUriNode subject, string name, string type)
        {
            var rdfType = g.CreateUriNode("rdf:type");
            var _object = g.CreateUriNode($"era:{type}");

            g.Assert(subject, rdfType, _object);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, string? value)
        {
            if (value == null) return;
            ;

            var pred = g.CreateUriNode($"era:{predicate}");
            if(Guid.TryParse(value, out _))
            {
                var va = g.CreateUriNode($"era:{value}"); g.Assert(subject, pred, va);
            }
            else
            {
                ILiteralNode va = g.CreateLiteralNode(
                value.ToString(),
                UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypeString)
            );
                g.Assert(subject, pred, va);
            }
          ;
        }

        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, IUriNode? value)
        {
            if (value == null) return;

            var pred = g.CreateUriNode($"era:{predicate}");

            g.Assert(subject, pred, value);
            
         
        }
        public static void AddProperty(
     this IGraph g,
     IUriNode subject,
     string predicate,
     Uri? value)
        {
            if (value is null) return;

            var pred = g.CreateUriNode($"era:{predicate}");
            var obj = g.CreateUriNode(value);

            g.Assert(subject, pred, obj);
        }

        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, int? value)
        {
            if (value == null) return;

            var pred = g.CreateUriNode($"era:{predicate}");
            ILiteralNode va = g.CreateLiteralNode(
            value.ToString(),
            UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypeInt)
            );
            g.Assert(subject, pred, va);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, int? value, bool positiveInt)
        {
            if (value == null) return;

            var pred = g.CreateUriNode($"era:{predicate}");
            ILiteralNode va = g.CreateLiteralNode(
            value.ToString(),
            UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypePositiveInteger)
            );
            g.Assert(subject, pred, va);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, uint? value)
        {
            if (value == null) return;

            var pred = g.CreateUriNode($"era:{predicate}");
            ILiteralNode va = g.CreateLiteralNode(
            value.ToString(),
            UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypeUnsignedInt)
            );
            g.Assert(subject, pred, va);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, double? value)
        {
            if (value == null) return;

            var pred = g.CreateUriNode($"era:{predicate}");
            ILiteralNode va = g.CreateLiteralNode(
            value.ToString().Replace(",","."),
            UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypeDouble)
            );
            g.Assert(subject, pred, va);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, bool? value)
        {
            if (value == null) return;

            var pred = g.CreateUriNode($"era:{predicate}");
            ILiteralNode va = g.CreateLiteralNode(
            value.ToString()?.ToLower(),
            UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypeBoolean)
            );
            g.Assert(subject, pred, va);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, string [] value)
        {

            var pred = g.CreateUriNode($"era:{predicate}");
            // Add each as a URI object
            foreach (var v in value)
            {
                var vObject = g.CreateUriNode($"era:{v}");
                g.Assert(subject, pred, vObject);
            }
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, IUriNode[] value)
        {

            var pred = g.CreateUriNode($"era:{predicate}");
            // Add each as a URI object
            foreach (var v in value)
            {
                g.Assert(subject, pred, v);
            }
        }
        public static void AddPropertyList(this IGraph g, IUriNode subject, string predicate, List<string> value)
        {

            var pred = g.CreateUriNode($"era:{predicate}");
            // Add each as a URI object
            var values = value.Select(v => g.CreateUriNode($"era:{v}"));
            var valuesNode = g.AssertList(values);
            g.Assert(subject, pred, valuesNode);
        }
        public static void AddPropertyList(this IGraph g, IUriNode subject, string predicate, List<IUriNode> value)
        {

            var pred = g.CreateUriNode($"era:{predicate}");
            var values = g.AssertList(value);
            g.Assert(subject, pred, values);
        }
        public static void AddProperty(this IGraph g, IUriNode subject, string predicate, DateTime dateTime)
        {
            var pred = g.CreateUriNode($"era:{predicate}");

            var time = g.CreateLiteralNode(
                dateTime.ToString("o"), // ISO 8601 format
                UriFactory.Create(XmlSpecsHelper.XmlSchemaDataTypeDateTime)
            );

            g.Assert(subject, pred, time);
        }
        public static string UriNameToLower(this string g)
        {
            return g.Substring(0, 1).ToLower() + g.Substring(1);
        }
        public static List<IUriNode> GetSubjectsStartingWith(
    IGraph graph,
    string prefix)
        {
            return graph.Triples
                .Select(t => t.Subject)
                .OfType<IUriNode>()
                .Where(s => s.Uri.ToString().StartsWith(
                    prefix,
                    StringComparison.OrdinalIgnoreCase))
                .Distinct()
                .ToList();
        }
        public static IUriNode? GetSubject(IGraph graph, string uri)
        {
            var subject = graph.CreateUriNode(new Uri(uri));

            var triple = graph
                .GetTriplesWithSubject(subject)
                .FirstOrDefault();

            return triple != null ? subject : null;
        }
        public static INode? GetPredicateValue(
       IGraph graph,
       string subjectUri,
       string predicateName)
        {
            var subject = GetSubject(graph, subjectUri);

            if (subject == null)
                return null;

            var predicate = graph.CreateUriNode(
                new Uri($"{predicateName}"));

            return graph
                .GetTriplesWithSubjectPredicate(subject, predicate)
                .FirstOrDefault()
                ?.Object;
        }
        public static List<INode> GetPredicateListValues(
    IGraph graph,
    string subjectUri,
    string predicateName)
        {
            var subject = GetSubject(graph, subjectUri);

            if (subject == null)
                return [];

            var predicate = graph.CreateUriNode(
                new Uri($"{predicateName}"));

            var listNode = graph
                .GetTriplesWithSubjectPredicate(subject, predicate)
                .FirstOrDefault()
                ?.Object;

            if (listNode == null)
                return [];

            return graph.GetListItems(listNode).ToList();
        }

        public static List<INode> GetPredicateValues(
    IGraph graph,
    string subjectUri,
    string predicateName)
        {
            var subject = GetSubject(graph, subjectUri);

            if (subject == null)
                return [];

            var predicate = graph.CreateUriNode(
                new Uri($"{predicateName}"));

            return graph
                .GetTriplesWithSubjectPredicate(subject, predicate)
                .Select(t => t.Object)
                .ToList();
        }


        public static IEnumerable<IUriNode> GetPredicateValue(IGraph graph, string predicateUri)
        {
            var predicate = graph.CreateUriNode(new Uri(predicateUri));

            var elements = graph
            .GetTriplesWithPredicate(predicate)
            .SelectMany(t => t.Object is IUriNode uri
                ? new[] { uri }
                : Array.Empty<IUriNode>())
            .Distinct();

            return elements;
        }
        public static IEnumerable<Point3d> GetCoordinates(this IUriNode uriNode, IGraph graph)
        {

            const string coordinatesUri = "http://data.europa.eu/949/coordinates";

            var coordinates = Helper
                .GetPredicateListValues(graph, uriNode.Uri.AbsoluteUri.Replace("linearElementGeometry", "linearElementProjection"), coordinatesUri)
                .Select(x => ((IUriNode)x).GetCoordinate(graph));


            return coordinates;
        }
        public static Point3d GetCoordinate(this IUriNode uriNode, IGraph graph)
        {


            const string x = "http://data.europa.eu/949/x";
            const string y = "http://data.europa.eu/949/y";
            const string z = "http://data.europa.eu/949/z";

            var xValue = Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, x).GetDoubleValue();
            var yValue = Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, y).GetDoubleValue();
            var zValue = Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, z).GetDoubleValue();

            return new Point3d(xValue ?? 0, yValue ?? 0, zValue ?? 0);
        }
        public static bool? GetBoolValue(this INode? node)
        {
            if (node is not ILiteralNode literal)
                return null;

            return bool.TryParse(literal.Value, out var value)
                ? value
                : null;
        }

        public static double? GetDoubleValue(this INode? node)
        {
            if (node is not ILiteralNode literal)
                return null;

            return double.TryParse(
                literal.Value,
                NumberStyles.Float,
                CultureInfo.InvariantCulture,
                out var value)
                ? value
                : null;
        }
    }
}
