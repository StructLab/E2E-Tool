using System.Globalization;
using VDS.RDF;

namespace RailTool.Services.DataLoading;

public class OsmToEraRdfService
{
    private const string GeoNamespace =
        "http://www.opengis.net/ont/geosparql#";

    private const string RdfNamespace =
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

    public IGraph CreateGeometryGraph(
        string geometryUri,
        IReadOnlyList<OsmGraphNode> path)
    {
        if (string.IsNullOrWhiteSpace(geometryUri))
        {
            throw new ArgumentException(
                "Geometry URI is required.",
                nameof(geometryUri));
        }

        if (path == null || path.Count < 2)
        {
            throw new ArgumentException(
                "At least two path nodes are required.",
                nameof(path));
        }

        var graph = new Graph();

        graph.NamespaceMap.AddNamespace(
            "geo",
            new Uri(GeoNamespace));

        graph.NamespaceMap.AddNamespace(
            "rdf",
            new Uri(RdfNamespace));

        var geometryNode = graph.CreateUriNode(
            new Uri(geometryUri));

        var rdfTypeNode = graph.CreateUriNode(
            new Uri($"{RdfNamespace}type"));

        var geometryTypeNode = graph.CreateUriNode(
            new Uri($"{GeoNamespace}Geometry"));

        var asWktNode = graph.CreateUriNode(
            new Uri($"{GeoNamespace}asWKT"));

        var wktDatatype = new Uri(
            $"{GeoNamespace}wktLiteral");

        var wkt = CreateLineStringWkt(path);

        graph.Assert(
            geometryNode,
            rdfTypeNode,
            geometryTypeNode);

        graph.Assert(
            geometryNode,
            asWktNode,
            graph.CreateLiteralNode(
                wkt,
                wktDatatype));

        return graph;
    }

    private static string CreateLineStringWkt(
        IReadOnlyList<OsmGraphNode> path)
    {
        var coordinates = string.Join(
            ", ",
            path.Select(node =>
                string.Format(
                    CultureInfo.InvariantCulture,
                    "{0} {1}",
                    node.Longitude,
                    node.Latitude)));

        return $"LINESTRING ({coordinates})";
    }
}