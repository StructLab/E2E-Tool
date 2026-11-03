
using Graph;
using Xunit;

namespace Model.Tests;

public class UndirectedWeightedGraphTTests
{
    /// <summary>
    /// Verifies that the default constructor creates an empty graph
    /// with initialized adjacency list and edge collections.
    /// </summary>
    [Fact]
    public void Constructor_CreatesEmptyGraph()
    {
        // Arrange: Create a new graph without providing any edges.
        var graph = new UndirectedWeightedGraphT<string>();

        // Act: Retrieve the graph's adjacency list and edge collection.
        var adjacencyList = graph.AdjacencyList;
        var edges = graph.EdgesWithNodes;

        // Assert: Verify that both collections are initialized and empty.
        Assert.NotNull(adjacencyList);
        Assert.NotNull(edges);
        Assert.Empty(adjacencyList);
        Assert.Empty(edges);
    }

    /// <summary>
    /// Verifies that the constructor creates connections in both directions
    /// from the supplied edge collection.
    /// </summary>
    [Fact]
    public void Constructor_WithExistingEdges_CreatesConnectionsInBothDirections()
    {
        // Arrange: Define an edge connecting node A to node B with weight 5.
        var edges = new Dictionary<string, (string, string, double)>
        {
            ["edge1"] = ("A", "B", 5)
        };

        // Act: Create a graph using the supplied edge collection.
        var graph = new UndirectedWeightedGraphT<string>(edges);

        // Assert: Verify that the connection exists from A to B.
        Assert.Contains(graph.AdjacencyList["A"],
            edge => edge.Item1 == "B" && edge.Item2 == 5);

        Assert.Contains(graph.AdjacencyList["B"],
            edge => edge.Item1 == "A" && edge.Item2 == 5);
    }

    /// <summary>
    /// Verifies that AddEdge adds a connection from the specified source node
    /// to the destination node without automatically adding a reverse connection.
    /// </summary>
    [Fact]
    public void AddEdge_AddsNeighbourToFromNode()
    {
        // Arrange: Create an empty graph.
        var graph = new UndirectedWeightedGraphT<string>();

        // Act: Add a connection from A to B with weight 5.
        graph.AddEdge("A", "B", 5);

        // Assert: Verify that the source node A exists in the adjacency list.
        Assert.True(graph.AdjacencyList.ContainsKey("A"));

        // Assert: Verify that B is stored as a neighbour of A with weight 5.
        Assert.Contains(
            graph.AdjacencyList["A"],
            edge => edge.Item1 == "B" && edge.Item2 == 5
        );
        // Assert: Verify that no separate adjacency entry was created for B.
        Assert.False(graph.AdjacencyList.ContainsKey("B"));
    }

    /// <summary>
    /// Verifies that AddEdgeTwoWay adds reciprocal connections
    /// between two nodes with the specified weight.
    /// </summary>
    [Fact]
    public void AddEdgeTwoWay_AddsNeighbourInBothDirections()
    {
        // Arrange: Create an empty graph.
        var graph = new UndirectedWeightedGraphT<string>();

        // Act: Add a two-way connection between A and B with weight 5.
        graph.AddEdgeTwoWay("A", "B", 5);

        // Assert: Verify that B is a neighbour of A with weight 5.
        Assert.Contains(
            graph.AdjacencyList["A"],
            edge => edge.Item1 == "B" && edge.Item2 == 5
        );

        // Assert: Verify that A is a neighbour of B with weight 5.
        Assert.Contains(
            graph.AdjacencyList["B"],
            edge => edge.Item1 == "A" && edge.Item2 == 5
        );
    }

    [Fact]
    public void RemoveEdgeTwoWay_RemovesConnectionInBothDirections()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 5);

        // Act
        graph.RemoveEdgeTwoWay(("A", "B"));

        // Assert
        Assert.DoesNotContain(
            graph.AdjacencyList["A"],
            edge => edge.Item1 == "B"
        );

        Assert.DoesNotContain(
            graph.AdjacencyList["B"],
            edge => edge.Item1 == "A"
        );
    }

    //All routes between two nodes
    [Fact]
    public void AllRoutesFromStartToEndNodes_ReturnsAllAvailableRoutes()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("A", "C", 1);
        graph.AddEdgeTwoWay("B", "D", 1);
        graph.AddEdgeTwoWay("C", "D", 1);

        // Act
        var routes = graph.AllRoutesFromStartToEndNodes("A", "D");

        // Assert
        Assert.Equal(2, routes.Count);

        Assert.Contains(routes,
            path => path.SequenceEqual(new[] { "A", "B", "D" }));

        Assert.Contains(routes,
            path => path.SequenceEqual(new[] { "A", "C", "D" }));
    }

    //No route exists
    [Fact]
    public void AllRoutesFromStartToEndNodes_WhenNoRouteExists_ReturnsEmptyList()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("C", "D", 1);

        // Act
        var routes = graph.AllRoutesFromStartToEndNodes("A", "D");

        // Assert
        Assert.Empty(routes);
    }

    //Start and end are the same node
    [Fact]
    public void AllRoutesFromStartToEndNodes_WhenStartEqualsEnd_ReturnsSingleNodeRoute()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);

        // Act
        var routes = graph.AllRoutesFromStartToEndNodes("A", "A");

        // Assert
        Assert.Single(routes);
        Assert.Equal(new[] { "A" }, routes[0]);
    }

    //shortest-path
    [Fact]
    public void ShortestRoutesFromStartToEndNodes_ReturnsLowestWeightRoute()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 5);
        graph.AddEdgeTwoWay("B", "D", 5);
        graph.AddEdgeTwoWay("A", "C", 2);
        graph.AddEdgeTwoWay("C", "D", 2);

        // Act
        var path = graph.ShortestRoutesFromStartToEndNodes("A", "D");

        // Assert
        Assert.Equal(new[] { "A", "C", "D" }, path);
    }

    //Required nodes
    [Fact]
    public void AllRoutesFromStartToEndNodes_WithRequiredNodes_ReturnsOnlyMatchingRoutes()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("A", "C", 1);
        graph.AddEdgeTwoWay("B", "D", 1);
        graph.AddEdgeTwoWay("C", "D", 1);

        var requiredNodes = new HashSet<string> { "B" };

        // Act
        var routes = graph.AllRoutesFromStartToEndNodes(
            "A", "D", requiredNodes);

        // Assert
        Assert.Single(routes);
        Assert.Contains("B", routes[0]);
        Assert.Equal(new[] { "A", "B", "D" }, routes[0]);
    }

    //Basic BFS finds a path
    [Fact]
    public void ShortestPathBFS_WhenPathExists_ReturnsPath()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "C", 1);
        graph.AddEdgeTwoWay("A", "C", 5);

        // Act
        var path = graph.ShortestPathBFS("A", "C");

        // Assert
        Assert.Equal(new[] { "A", "C" }, path);
    }

    //BFS when no path exists
    [Fact]
    public void ShortestPathBFS_WhenNoPathExists_ReturnsNull()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("C", "D", 1);

        // Act
        var path = graph.ShortestPathBFS("A", "D");

        // Assert
        Assert.Null(path);
    }

    //BFS with validation callback
    [Fact]
    public void ShortestPathBFS_WithValidation_RejectsInvalidConnection()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "D", 1);
        graph.AddEdgeTwoWay("A", "C", 2);
        graph.AddEdgeTwoWay("C", "D", 2);

        // Act
        var path = graph.ShortestPathBFS(
            "A",
            "D",
            (grandParent, parent, neighbor) => neighbor != "B"
        );

        // Assert
        Assert.Equal(new[] { "A", "C", "D" }, path);
    }

    //BFS with stop condition
    [Fact]
    public void ShortestPathBFS_WithStopCondition_StopsAtMatchingNode()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "C", 1);
        graph.AddEdgeTwoWay("C", "D", 1);

        // Act
        var path = graph.ShortestPathBFS(
            "A", "D", node => node == "B"
        );

        // Assert
        Assert.Equal(new[] { "A", "B" }, path);
    }

    //BFS with stop-at type
    private class SpecialNode
    {
        public string Name { get; }

        public SpecialNode(string name)
        {
            Name = name;
        }
    }

    [Fact]
    public void ShortestPathBFS_WithStopAtType_DoesNotExpandMatchingNode()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<object>();

        var start = new object();
        var blocked = new SpecialNode("Blocked");
        var end = new object();

        graph.AddEdgeTwoWay(start, blocked, 1);
        graph.AddEdgeTwoWay(blocked, end, 1);

        // Act
        var path = graph.ShortestPathBFS(start, end, typeof(SpecialNode));

        // Assert
        Assert.Null(path);
    }

    //Paths Stop at a matching type
    [Fact]
    public void Paths_WithStopTypes_IncludesMatchingNodeAndStopsThere()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<object>();

        var start = new object();
        var special = new SpecialNode("Special");
        var end = new object();

        graph.AddEdgeTwoWay(start, special, 1);
        graph.AddEdgeTwoWay(special, end, 1);

        // Act
        var paths = graph.Paths(start, new[] { typeof(SpecialNode) });

        // Assert
        Assert.Single(paths);
        Assert.Equal(new object[] { start, special }, paths[0]);
    }

    //Stop at a predicate
    [Fact]
    public void Paths_WithStopCondition_IncludesMatchingNode()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "C", 1);

        // Act
        var paths = graph.Paths("A", node => node == "B");

        // Assert
        Assert.Single(paths);
        Assert.Equal(new[] { "A", "B" }, paths[0]);
    }

    //graph Explore finds matching endpoints
    [Fact]
    public void Explore_ReturnsPathsToMatchingNodes()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("A", "C", 1);

        // Act
        var paths = graph.Explore("A", node => node == "B" || node == "C");

        // Assert
        Assert.Equal(2, paths.Count);
        Assert.Contains(paths, path => path.SequenceEqual(new[] { "A", "B" }));
        Assert.Contains(paths, path => path.SequenceEqual(new[] { "A", "C" }));
    }

    //Explore stops at the first match
    [Fact]
    public void Explore_WithStopAtFirstMatch_ReturnsOneMatchingPath()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("A", "C", 1);

        // Act
        var paths = graph.Explore(
            "A",
            node => node == "B" || node == "C",
            stopAtFirstMatch: true
        );

        // Assert
        Assert.Single(paths);
    }

    //Explore with an expansion limit
    [Fact]
    public void Explore_WithZeroExpansionLimit_ReturnsNoPaths()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);

        // Act
        var paths = graph.Explore(
            "A",
            node => node == "B",
            maxNeighborExpansions: 0
        );

        // Assert
        Assert.Empty(paths);
    }

    //ExploreNotOverlapping
    [Fact]
    public void ExploreNotOverlapping_ReturnsMatchingEndpointPath()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("A", "C", 1);

        // Act
        var paths = graph.ExploreNotOverlapping(
            "A",
            (node, path) => node == "B" || node == "C"
        );

        // Assert
        Assert.Equal(2, paths.Count);
        Assert.Contains(paths, path => path.SequenceEqual(new[] { "A", "B" }));
        Assert.Contains(paths, path => path.SequenceEqual(new[] { "A", "C" }));
    }

    //closed loop
    [Fact]
    public void FindClosedLoops_WhenTriangleExists_ReturnsLoop()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "C", 1);
        graph.AddEdgeTwoWay("C", "A", 1);

        // Act
        var loops = graph.FindClosedLoops(graph);

        // Assert
        Assert.NotEmpty(loops);
        Assert.Contains(loops, loop =>
            loop.Count == 3 &&
            loop.ToHashSet().SetEquals(new[] { "A", "B", "C" }));
    }

    [Fact]
    public void FindClosedLoops_WhenNoCycleExists_ReturnsEmptyList()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();
        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "C", 1);

        // Act
        var loops = graph.FindClosedLoops(graph);

        // Assert
        Assert.Empty(loops);
    }

    //intermediate nodes route must visit B before reaching D.
    [Fact]
    public void FindShortestPathThroughNodes_IncludesIntermediateNodes()
    {
        // Arrange
        var graph = new UndirectedWeightedGraphT<string>();

        graph.AddEdgeTwoWay("A", "B", 1);
        graph.AddEdgeTwoWay("B", "C", 1);
        graph.AddEdgeTwoWay("C", "D", 1);

        var intermediateNodes = new List<string> { "B", "C" };

        // Act
        var path = graph.FindShortestPathThroughNodes(
            "A", "D", intermediateNodes);

        // Assert
        Assert.Equal(new[] { "A", "B", "C", "D" }, path);
    }
}
