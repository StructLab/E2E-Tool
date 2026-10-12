using System.Globalization;
using VDS.RDF;

namespace RailTool.Services.DataLoading;

public class RdfToTtlNormalizationService
{
    private static readonly Uri XsdDouble =
        new("http://www.w3.org/2001/XMLSchema#double");

    private static readonly Uri RdfType =
        new("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

    private static readonly Uri EraSwitch =
        new("http://data.europa.eu/949/Switch");

    private static readonly Uri EraLeftBranch =
        new("http://data.europa.eu/949/leftBranch");

    private static readonly Uri EraRightBranch =
        new("http://data.europa.eu/949/rightBranch");

    private static readonly Uri EraElementA =
        new("http://data.europa.eu/949/elementA");

    private static readonly Uri EraElementB =
        new("http://data.europa.eu/949/elementB");

    private static readonly Uri EraIsOnOriginOfElementA =
        new("http://data.europa.eu/949/isOnOriginOfElementA");

    private static readonly Uri EraIsOnOriginOfElementB =
        new("http://data.europa.eu/949/isOnOriginOfElementB");

    public IGraph Normalize(IGraph sourceGraph)
    {
        ArgumentNullException.ThrowIfNull(sourceGraph);

        // Work on a copy so that the original imported
        // RDF graph remains untouched.
        var normalizedGraph = new Graph();

        normalizedGraph.Merge(
            sourceGraph,
            true
        );

        // 1. Normalize datatype lexical values.
        NormalizeDoubleLiterals(normalizedGraph);

        // 2. Normalize switches that contain multiple
        // physical branch pairs under one RDF subject.
        NormalizeSwitches(normalizedGraph);

        // 3. Add missing identifiers to all final switch resources.
        NormalizeSwitchIdentifiers(normalizedGraph);

        return normalizedGraph;
    }

    // =========================================================
    // NUMERIC NORMALIZATION
    // =========================================================

    private static void NormalizeDoubleLiterals(
        IGraph graph)
    {
        var triples =
            graph.Triples.ToList();

        var changedCount = 0;

        foreach (var triple in triples)
        {
            if (triple.Object is not ILiteralNode literal)
            {
                continue;
            }

            if (literal.DataType != XsdDouble)
            {
                continue;
            }

            var normalizedValue =
                NormalizeDoubleLexicalValue(
                    literal.Value
                );

            if (normalizedValue == null ||
                normalizedValue == literal.Value)
            {
                continue;
            }

            graph.Retract(triple);

            var newLiteral =
                graph.CreateLiteralNode(
                    normalizedValue,
                    XsdDouble
                );

            graph.Assert(
                new Triple(
                    triple.Subject,
                    triple.Predicate,
                    newLiteral
                )
            );

            changedCount++;
        }

        Console.WriteLine(
            $"Numeric normalization completed. " +
            $"xsd:double values changed = {changedCount}"
        );
    }

private int NormalizeSwitchIdentifiers(IGraph graph)
{
    var rdfType =
        graph.CreateUriNode(
            new Uri(
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            )
        );

    var switchClass =
        graph.CreateUriNode(
            new Uri(
                "http://data.europa.eu/949/Switch"
            )
        );

    var idPredicate =
        graph.CreateUriNode(
            new Uri(
                "http://data.europa.eu/949/id"
            )
        );

    var switches =
        graph
            .GetTriplesWithPredicateObject(
                rdfType,
                switchClass
            )
            .Select(t => t.Subject)
            .OfType<IUriNode>()
            .Distinct()
            .ToList();

    int added = 0;

    foreach (var sw in switches)
    {
        var existingId =
            graph
                .GetTriplesWithSubjectPredicate(
                    sw,
                    idPredicate
                )
                .FirstOrDefault();

        if (existingId != null)
            continue;

        var uri = sw.Uri.ToString();

        var id =
            Uri.UnescapeDataString(
                uri
                    .TrimEnd('/')
                    .Split('/')
                    .Last()
            );

        if (string.IsNullOrWhiteSpace(id))
            continue;

        graph.Assert(
            sw,
            idPredicate,
            graph.CreateLiteralNode(id)
        );

        added++;
    }

    Console.WriteLine(
        $"Switch identifier normalization completed. IDs added = {added}"
    );

    return added;
}

    private static string? NormalizeDoubleLexicalValue(
        string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        // Already valid using XSD / invariant notation.
        if (double.TryParse(
                value,
                NumberStyles.Float,
                CultureInfo.InvariantCulture,
                out _))
        {
            return value;
        }

        // Some source RDF values use decimal commas.
        var decimalPointValue =
            value.Replace(',', '.');

        if (!double.TryParse(
                decimalPointValue,
                NumberStyles.Float,
                CultureInfo.InvariantCulture,
                out _))
        {
            // Do not guess if the value still cannot
            // safely be interpreted.
            return value;
        }

        return decimalPointValue;
    }

    // =========================================================
    // SWITCH NORMALIZATION
    // =========================================================

    private static void NormalizeSwitches(
        IGraph graph)
    {
        var rdfType =
            graph.CreateUriNode(RdfType);

        var switchClass =
            graph.CreateUriNode(EraSwitch);

        var leftBranchPredicate =
            graph.CreateUriNode(EraLeftBranch);

        var rightBranchPredicate =
            graph.CreateUriNode(EraRightBranch);

        var switchSubjects =
            graph
                .GetTriplesWithPredicateObject(
                    rdfType,
                    switchClass
                )
                .Select(t => t.Subject)
                .Distinct()
                .ToList();

        var splitSwitchCount = 0;
        var createdSwitchCount = 0;

        foreach (var switchSubject in switchSubjects)
        {
            var leftBranches =
                graph
                    .GetTriplesWithSubjectPredicate(
                        switchSubject,
                        leftBranchPredicate
                    )
                    .Select(t => t.Object)
                    .Distinct()
                    .ToList();

            var rightBranches =
                graph
                    .GetTriplesWithSubjectPredicate(
                        switchSubject,
                        rightBranchPredicate
                    )
                    .Select(t => t.Object)
                    .Distinct()
                    .ToList();

            // This switch already follows the target structure.
            if (leftBranches.Count == 1 &&
                rightBranches.Count == 1)
            {
                continue;
            }

            // We only transform cases where the graph contains
            // the same number of left and right branch relations.
            if (leftBranches.Count == 0 ||
                rightBranches.Count == 0 ||
                leftBranches.Count != rightBranches.Count)
            {
                Console.WriteLine(
                    $"Switch normalization skipped for " +
                    $"{switchSubject}: " +
                    $"left={leftBranches.Count}, " +
                    $"right={rightBranches.Count}"
                );

                continue;
            }

            var branchPairs =
                FindBranchPairs(
                    graph,
                    leftBranches,
                    rightBranches
                );

            // Do not guess if topology does not give us
            // one unambiguous pair for every branch.
            if (branchPairs == null ||
                branchPairs.Count != leftBranches.Count)
            {
                Console.WriteLine(
                    $"Switch normalization skipped for " +
                    $"{switchSubject}: " +
                    $"branch pairing was ambiguous."
                );

                continue;
            }

            // Splitting requires a URI so that every resulting
            // switch receives its own stable RDF identifier.
            if (switchSubject is not IUriNode switchUriNode)
            {
                Console.WriteLine(
                    $"Switch normalization skipped for " +
                    $"{switchSubject}: switch has no URI."
                );

                continue;
            }

            SplitSwitch(
                graph,
                switchUriNode,
                branchPairs,
                leftBranchPredicate,
                rightBranchPredicate
            );

            splitSwitchCount++;

            // Original switch remains as the first physical
            // switch. Additional pairs receive new URI resources.
            createdSwitchCount +=
                branchPairs.Count - 1;
        }

        Console.WriteLine(
            $"Switch normalization completed. " +
            $"Resources split = {splitSwitchCount}, " +
            $"new switch resources created = {createdSwitchCount}"
        );
    }

    // =========================================================
    // FIND LEFT/RIGHT BRANCH PAIRS
    // =========================================================

    private static List<BranchPair>? FindBranchPairs(
        IGraph graph,
        List<INode> leftBranches,
        List<INode> rightBranches)
    {
        var pairs =
            new List<BranchPair>();

        var usedRightBranches =
            new HashSet<INode>();

        // Sort only to make the generated result deterministic.
        var orderedLeftBranches =
            leftBranches
                .OrderBy(NodeSortValue)
                .ToList();

        foreach (var leftBranch in orderedLeftBranches)
        {
            var matchingRightBranches =
                rightBranches
                    .Where(
                        rightBranch =>
                            !usedRightBranches.Contains(
                                rightBranch
                            ) &&
                            RelationsShareSameElementEnd(
                                graph,
                                leftBranch,
                                rightBranch
                            )
                    )
                    .ToList();

            // There must be exactly one topology-based match.
            if (matchingRightBranches.Count != 1)
            {
                return null;
            }

            var rightBranch =
                matchingRightBranches[0];

            usedRightBranches.Add(
                rightBranch
            );

            pairs.Add(
                new BranchPair(
                    leftBranch,
                    rightBranch
                )
            );
        }

        if (usedRightBranches.Count !=
            rightBranches.Count)
        {
            return null;
        }

        return pairs;
    }

    // =========================================================
    // NET RELATION TOPOLOGY
    // =========================================================

    private static bool RelationsShareSameElementEnd(
        IGraph graph,
        INode firstRelation,
        INode secondRelation)
    {
        var firstEndpoints =
            GetRelationEndpoints(
                graph,
                firstRelation
            );

        var secondEndpoints =
            GetRelationEndpoints(
                graph,
                secondRelation
            );

        foreach (var first in firstEndpoints)
        {
            foreach (var second in secondEndpoints)
            {
                if (first.Element.Equals(
                        second.Element
                    ) &&
                    first.IsOnOrigin ==
                    second.IsOnOrigin)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static List<RelationEndpoint>
        GetRelationEndpoints(
            IGraph graph,
            INode relation)
    {
        var result =
            new List<RelationEndpoint>();

        AddRelationEndpoint(
            graph,
            relation,
            EraElementA,
            EraIsOnOriginOfElementA,
            result
        );

        AddRelationEndpoint(
            graph,
            relation,
            EraElementB,
            EraIsOnOriginOfElementB,
            result
        );

        return result;
    }

    private static void AddRelationEndpoint(
        IGraph graph,
        INode relation,
        Uri elementPredicateUri,
        Uri originPredicateUri,
        List<RelationEndpoint> result)
    {
        var elementPredicate =
            graph.CreateUriNode(
                elementPredicateUri
            );

        var originPredicate =
            graph.CreateUriNode(
                originPredicateUri
            );

        var element =
            graph
                .GetTriplesWithSubjectPredicate(
                    relation,
                    elementPredicate
                )
                .Select(t => t.Object)
                .SingleOrDefault();

        var originLiteral =
            graph
                .GetTriplesWithSubjectPredicate(
                    relation,
                    originPredicate
                )
                .Select(t => t.Object)
                .OfType<ILiteralNode>()
                .SingleOrDefault();

        if (element == null ||
            originLiteral == null)
        {
            return;
        }

        if (!TryParseBoolean(
                originLiteral.Value,
                out var isOnOrigin))
        {
            return;
        }

        result.Add(
            new RelationEndpoint(
                element,
                isOnOrigin
            )
        );
    }

    private static bool TryParseBoolean(
        string value,
        out bool result)
    {
        if (bool.TryParse(
                value,
                out result))
        {
            return true;
        }

        if (value == "1")
        {
            result = true;
            return true;
        }

        if (value == "0")
        {
            result = false;
            return true;
        }

        result = false;
        return false;
    }

    // =========================================================
    // SPLIT ONE COLLAPSED SWITCH INTO SEPARATE RDF RESOURCES
    // =========================================================

    private static void SplitSwitch(
        IGraph graph,
        IUriNode originalSwitch,
        List<BranchPair> branchPairs,
        IUriNode leftBranchPredicate,
        IUriNode rightBranchPredicate)
    {
        // Capture the original triples before modifying anything.
        var originalSubjectTriples =
            graph
                .GetTriplesWithSubject(
                    originalSwitch
                )
                .ToList();

        var incomingTriples =
            graph
                .GetTriplesWithObject(
                    originalSwitch
                )
                .ToList();

        // Remove all existing left/right branches from
        // the original collapsed resource.
        var oldBranchTriples =
            originalSubjectTriples
                .Where(
                    t =>
                        t.Predicate.Equals(
                            leftBranchPredicate
                        ) ||
                        t.Predicate.Equals(
                            rightBranchPredicate
                        )
                )
                .ToList();

        graph.Retract(
            oldBranchTriples
        );

        // -----------------------------------------------------
        // First physical switch keeps the original URI.
        // -----------------------------------------------------

        graph.Assert(
            new Triple(
                originalSwitch,
                leftBranchPredicate,
                branchPairs[0].Left
            )
        );

        graph.Assert(
            new Triple(
                originalSwitch,
                rightBranchPredicate,
                branchPairs[0].Right
            )
        );

        // -----------------------------------------------------
        // Remaining physical switches receive new unique URIs.
        // -----------------------------------------------------

        for (var i = 1;
             i < branchPairs.Count;
             i++)
        {
            var newSwitchUri =
                CreateUniqueSplitSwitchUri(
                    graph,
                    originalSwitch.Uri,
                    i + 1
                );

            var newSwitch =
                graph.CreateUriNode(
                    newSwitchUri
                );

            // Copy all original switch properties except
            // leftBranch and rightBranch.
            foreach (var triple in originalSubjectTriples)
            {
                if (triple.Predicate.Equals(
                        leftBranchPredicate
                    ) ||
                    triple.Predicate.Equals(
                        rightBranchPredicate
                    ))
                {
                    continue;
                }

                graph.Assert(
                    new Triple(
                        newSwitch,
                        triple.Predicate,
                        triple.Object
                    )
                );
            }

            // Add the correct physical branch pair.
            graph.Assert(
                new Triple(
                    newSwitch,
                    leftBranchPredicate,
                    branchPairs[i].Left
                )
            );

            graph.Assert(
                new Triple(
                    newSwitch,
                    rightBranchPredicate,
                    branchPairs[i].Right
                )
            );

            // If something such as FunctionalArea referenced
            // the original switch, the newly separated switch
            // belongs to the same collection.
            foreach (var incomingTriple in
                     incomingTriples)
            {
                graph.Assert(
                    new Triple(
                        incomingTriple.Subject,
                        incomingTriple.Predicate,
                        newSwitch
                    )
                );
            }
        }
    }

    private static Uri CreateUniqueSplitSwitchUri(
        IGraph graph,
        Uri originalUri,
        int number)
    {
        var baseValue =
            originalUri.AbsoluteUri;

        var candidate =
            new Uri(
                $"{baseValue}-split-{number}"
            );

        var counter =
            number;

        while (graph.ContainsTriple(
                   new Triple(
                       graph.CreateUriNode(
                           candidate
                       ),
                       graph.CreateUriNode(
                           RdfType
                       ),
                       graph.CreateUriNode(
                           EraSwitch
                       )
                   )
               ))
        {
            counter++;

            candidate =
                new Uri(
                    $"{baseValue}-split-{counter}"
                );
        }

        return candidate;
    }

    private static string NodeSortValue(
        INode node)
    {
        return node switch
        {
            IUriNode uriNode =>
                uriNode.Uri.AbsoluteUri,

            ILiteralNode literalNode =>
                literalNode.Value,

            _ =>
                node.ToString()
        };
    }

    private sealed record BranchPair(
        INode Left,
        INode Right
    );

    private sealed record RelationEndpoint(
        INode Element,
        bool IsOnOrigin
    );
}