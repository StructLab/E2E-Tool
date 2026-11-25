using VDS.RDF;
using VDS.RDF.Parsing;

namespace ModelToTtl
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
    }
}
