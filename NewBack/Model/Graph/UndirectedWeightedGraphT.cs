using System;
using System.Collections.Generic;
using System.Linq;

namespace Graph
{
    /// <summary>
    /// Compares graph nodes to determine their ordering in a sorted collection.
    /// </summary>
    /// <typeparam name="T">The type of the graph nodes.</typeparam>
    public class OrderedSetComparer<T> : IComparer<(double dist, T node)>
    {
        /// <summary>
        /// Compares two entries based on their node values.
        /// </summary>
        /// <param name="x">The first entry to compare.</param>
        /// <param name="y">The second entry to compare.</param>
        /// <returns>A value indicating the relative order of the two node values.</returns>
        public int Compare((double, T) x, (double, T) y)
        {
            return Comparer<object>.Default.Compare(x.Item2, y.Item2);
        }
    }

    /// <summary>
    /// Represents an undirected weighted graph using an adjacency list.
    /// Each node can be connected to other nodes through weighted edges.
    /// </summary>
    /// <typeparam name="T">
    /// The type of values used to represent the graph nodes.
    /// </typeparam>
    public class UndirectedWeightedGraphT<T>
    {

        /// <summary>
        /// Gets the adjacency list containing each node and its neighbouring
        /// nodes with their corresponding edge weights.
        /// </summary>
        public Dictionary<T, List<(T, double)>> AdjacencyList { get; private set; }

        /// <summary>
        /// Gets the collection of edges identified by their keys,
        /// with each edge containing its two nodes and weight.
        /// </summary>
        public Dictionary<string, (T, T, double)> EdgesWithNodes { get; private set; }

        /// <summary>
        /// Represents a condition used to determine whether an edge
        /// between two nodes is allowed.
        /// </summary>
        /// <param name="fromNode">The source node of the edge.</param>
        /// <param name="toNode">The destination node of the edge.</param>
        /// <returns>
        /// True if the edge satisfies the condition; otherwise, false.
        /// </returns>
        public delegate bool EdgeCondition(T fromNode, T toNode);

        /// <summary>
        /// Initializes a new empty undirected weighted graph.
        /// </summary>
        public UndirectedWeightedGraphT()
        {
            AdjacencyList = new Dictionary<T, List<(T, double)>>();
            EdgesWithNodes = new Dictionary<string, (T, T, double)>();
        }

        /// <summary>
        /// Initializes an undirected weighted graph using the supplied edges.
        /// Each edge is added in both directions.
        /// </summary>
        /// <param name="edgesWithNodes">
        /// A dictionary containing edge identifiers, connected nodes and edge weights.
        /// </param>
        public UndirectedWeightedGraphT(Dictionary<string, (T, T, double)> edgesWithNodes)
        {
            AdjacencyList = new Dictionary<T, List<(T, double)>>();
            EdgesWithNodes = edgesWithNodes;
            CreateUndirectedGraph();
        }

        // Builds the adjacency list by adding every supplied edge in both directions.
        private void CreateUndirectedGraph()
        {
            foreach (var edge in EdgesWithNodes)
            {
                AddEdge(edge.Value.Item1, edge.Value.Item2, edge.Value.Item3);
                AddEdge(edge.Value.Item2, edge.Value.Item1, edge.Value.Item3);
            }
        }

        /// <summary>
        /// Adds a one-way connection from the source node to the destination node.
        /// </summary>
        /// <param name="fromNode">The source node of the connection.</param>
        /// <param name="toNode">The destination node of the connection.</param>
        /// <param name="weight">The weight assigned to the connection.</param>
        public void AddEdge(T fromNode, T toNode, double weight)
        {
            if (!AdjacencyList.ContainsKey(fromNode))
            {
                AdjacencyList[fromNode] = new List<(T, double)>();
            }
            AdjacencyList[fromNode].Add((toNode, weight));
        }

        /// <summary>
        /// Adds a connection between two nodes in both directions using the specified weight.
        /// </summary>
        /// <param name="fromNode">The first node in the connection.</param>
        /// <param name="toNode">The second node in the connection.</param>
        /// <param name="weight">The weight assigned to both directions of the connection.</param>
        public void AddEdgeTwoWay(T fromNode, T toNode, double weight)
        {
            AddEdge(fromNode, toNode, weight);
            AddEdge(toNode, fromNode, weight);
        }

        /// <summary>
        /// Removes the connection between two nodes in both directions.
        /// </summary>
        /// <param name="edge">A tuple containing the two nodes whose connection should be removed.</param>
        public void RemoveEdgeTwoWay((T nodeA, T nodeB) edge)
        {
            if (AdjacencyList.ContainsKey(edge.nodeA))
                AdjacencyList[edge.nodeA].RemoveAll(e => EqualityComparer<T>.Default.Equals(e.Item1, edge.nodeB));

            if (AdjacencyList.ContainsKey(edge.nodeB))
                AdjacencyList[edge.nodeB].RemoveAll(e => EqualityComparer<T>.Default.Equals(e.Item1, edge.nodeA));
        }

        /// <summary>
        /// Finds all available paths between the specified start and end nodes.
        /// </summary>
        /// <param name="start">The node where the path begins.</param>
        /// <param name="end">The node where the path ends.</param>
        /// <returns>A list containing all discovered paths. Each path is represented as a list of nodes.</returns>
        public List<List<T>> AllRoutesFromStartToEndNodes(T start, T end)
        {
            var paths = new List<List<T>>();
            var currentPath = new List<T>();

            if (!AdjacencyList.ContainsKey(start) || !AdjacencyList.ContainsKey(end))
                return paths;

            DFS(start, end, currentPath, paths);
            return paths;
        }

        /// <summary>
        /// Uses depth-first search to find paths from the current node to the target node.
        /// </summary>
        /// <param name="current">The node currently being explored.</param>
        /// <param name="end">The target node where the path should finish.</param>
        /// <param name="currentPath">The path currently being explored.</param>
        /// <param name="paths">The collection of completed paths.</param>
        private void DFS(T current, T end, List<T> currentPath, List<List<T>> paths)
        {
            // Add the current node to the path being explored.
            currentPath.Add(current);
            if (EqualityComparer<T>.Default.Equals(current, end))
            {
                paths.Add(new List<T>(currentPath));
            }
            else
            {
                // If the target node is reached, save a copy of the completed path.
                if (AdjacencyList.ContainsKey(current))
                {
                    foreach (var neighbor in AdjacencyList[current])
                    {
                        // Explore each neighbour that has not already appeared in the current path.
                        if (!currentPath.Contains(neighbor.Item1))
                        {
                            DFS(neighbor.Item1, end, currentPath, paths);
                        }
                    }
                }
            }
            // Backtrack by removing the current node before returning to the previous node.
            currentPath.RemoveAt(currentPath.Count - 1);
        }

        /// <summary>
        /// Finds closed loops in the specified undirected graph.
        /// Duplicate loops containing the same nodes in different orders are filtered out.
        /// </summary>
        /// <param name="graph">The graph in which closed loops should be searched.</param>
        /// <returns>A list of unique closed loops, with each loop represented as a list of nodes.</returns>
        public List<List<T>> FindClosedLoops(UndirectedWeightedGraphT<T> graph)
        {
            var loops = new List<List<T>>();
            var visitedEdges = new HashSet<(T, T)>();

            // Explore the graph from each node to discover closed loops.
            foreach (var start in graph.AdjacencyList.Keys.ToList())
            {
                DFSLoops(graph, start, start, new List<T>(), visitedEdges, loops);
            }

            // Remove duplicate loops (same nodes in different orders)
            var uniqueLoops = new List<List<T>>();
            foreach (var loop in loops)
            {
                // Normalize each loop by sorting its nodes using their hash codes.
                var normalized = loop.OrderBy(v => v.GetHashCode()).ToList();

                // Add the loop only if an equivalent loop has not already been collected.
                if (!uniqueLoops.Any(l => l.OrderBy(v => v.GetHashCode()).SequenceEqual(normalized)))
                {
                    uniqueLoops.Add(loop);
                }
            }

            // Return the collection of unique loops.
            return uniqueLoops;
        }

        /// <summary>
        /// Uses depth-first search to explore the graph and identify closed loops.
        /// </summary>
        /// <param name="graph">The graph being explored.</param>
        /// <param name="current">The node currently being visited.</param>
        /// <param name="start">The starting node of the loop search.</param>
        /// <param name="path">The current path being explored.</param>
        /// <param name="visitedEdges">The edges already visited in the current search path.</param>
        /// <param name="loops">The collection in which discovered loops are stored.</returns>
        private static void DFSLoops(
        UndirectedWeightedGraphT<T> graph,
        T current,
        T start,
        List<T> path,
        HashSet<(T, T)> visitedEdges,
        List<List<T>> loops)
        {
            // Add the current node to the path being explored.
            path.Add(current);

            if (!graph.AdjacencyList.ContainsKey(current))
            {
                path.RemoveAt(path.Count - 1);
                return;
            }

            foreach (var (neighbor, _) in graph.AdjacencyList[current])
            {
                var edge = (current, neighbor);
                var reverseEdge = (neighbor, current);

                // Skip edges already visited in this path
                if (visitedEdges.Contains(edge) || visitedEdges.Contains(reverseEdge))
                    continue;

                if (EqualityComparer<T>.Default.Equals(neighbor, start) && path.Count > 2)
                {
                    // Found a loop
                    loops.Add(new List<T>(path));
                }
                else if (!path.Contains(neighbor))
                {
                    // Mark the edge as visited before exploring the neighbour recursively.
                    visitedEdges.Add(edge);
                    DFSLoops(graph, neighbor, start, path, visitedEdges, loops);

                    // Remove the edge after recursion to allow other paths to explore it.
                    visitedEdges.Remove(edge);
                }
            }

            // Remove the current node when backtracking to the previous node.
            path.RemoveAt(path.Count - 1);
        }

        /// <summary>
        /// Finds a shortest path between the specified start and end nodes based on edge weights.
        /// </summary>
        /// <param name="start">The node where the path begins.</param>
        /// <param name="end">The target node where the path ends.</param>
        /// <returns>A list of nodes representing the shortest path, or an empty list when no path is found.</returns>
        public List<T> ShortestRoutesFromStartToEndNodes(T start, T end)
        {
            var distances = new Dictionary<T, double>();
            var previous = new Dictionary<T, T>();
            var priorityQueue = new SortedSet<(double distance, T node)>();

            // Initialize all node distances and previous references.
            foreach (var node in AdjacencyList.Keys)
            {
                distances[node] = double.MaxValue;
                previous[node] = default;
            }

            // Set the starting node's distance to zero and add it to the priority queue.
            distances[start] = 0;
            priorityQueue.Add((0, start));

            while (priorityQueue.Count > 0)
            {
                // Process the node with the smallest recorded distance.
                var (currentDistance, currentNode) = priorityQueue.Min;
                priorityQueue.Remove(priorityQueue.Min);

                if (EqualityComparer<T>.Default.Equals(currentNode, end))
                    break;

                foreach (var (neighbor, weight) in AdjacencyList[currentNode])
                {
                    // Calculate the new distance through the current node.
                    double distance = currentDistance + weight;
                    if (distance < distances[neighbor])
                    {
                        priorityQueue.Remove((distances[neighbor], neighbor));
                        distances[neighbor] = distance;
                        previous[neighbor] = currentNode;

                        // Add the neighbour with its updated distance for further exploration.
                        priorityQueue.Add((distance, neighbor));
                    }
                }
            }

            // Reconstruct the shortest path by following the previous node references backwards.
            var path = new List<T>();
            for (T at = end; !EqualityComparer<T>.Default.Equals(at, default) && !EqualityComparer<T>.Default.Equals(at, start); at = previous[at])
            {
                path.Add(at);
            }

            // Add the starting node and reverse the path to obtain start-to-end order.
            path.Add(start);
            path.Reverse();

            // Return an empty list if no path to the destination was found.
            return path.Count == 1 && !EqualityComparer<T>.Default.Equals(path[0], start) ? new List<T>() : path;
        }


        /// <summary>
        /// Finds the first path that contains all required nodes. If the path doesn't contain all required nodes, it will try another path.
        /// </summary>
        /// <param name="start">The node where the path begins.</param>
        /// <param name="end">The node where the path ends.</param>
        /// <param name="requiredNodes">The set of nodes that must be included in each returned path.</param>
        /// <returns>A list of paths containing all required nodes.</returns>
        /// <summary>
        /// Finds all paths from start to end nodes. Only returns paths that contain all the required nodes.
        /// </summary>
        /// <param name="start">The node where the path begins.</param>
        /// <param name="end">The node where the path ends.</param>
        /// <param name="requiredNodes">The set of nodes that must be included in each returned path.</param>
        /// <returns>A list of paths containing all required nodes.</returns>
        public List<List<T>> AllRoutesFromStartToEndNodes(T start, T end, HashSet<T> requiredNodes)
        {
            var paths = new List<List<T>>();
            var currentPath = new List<T>();

            if (!AdjacencyList.ContainsKey(start) || !AdjacencyList.ContainsKey(end))
                return paths;

            DFS(start, end, currentPath, paths, requiredNodes);
            return paths;
        }

        /// <summary>
        /// Helper DFS function that explores all paths from start to end and checks if they contain required nodes.
        /// </summary>
        /// <param name="currentNode">The node currently being explored.</param>
        /// <param name="endNode">The target node where the path should finish.</param>
        /// <param name="currentPath">The path currently being explored.</param>
        /// <param name="paths">The collection of valid paths found.</param>
        /// <param name="requiredNodes">The nodes that must appear in a valid path.</param>
        private void DFS(T currentNode, T endNode, List<T> currentPath, List<List<T>> paths, HashSet<T> requiredNodes)
        {
            // Add the current node to the path
            currentPath.Add(currentNode);

            // If we reached the end node, check if the path contains all required nodes
            if (EqualityComparer<T>.Default.Equals(currentNode, endNode))
            {
                // Check if the path contains all required nodes
                if (requiredNodes.All(node => currentPath.Contains(node)))
                {
                    paths.Add(new List<T>(currentPath)); // Add a copy of the path to the result
                }
            }
            else
            {
                // Explore all neighbors
                foreach (var (neighbor, _) in AdjacencyList[currentNode])
                {
                    // Avoid revisiting nodes
                    if (!currentPath.Contains(neighbor))
                    {
                        DFS(neighbor, endNode, currentPath, paths, requiredNodes);
                    }
                }
            }

            // Backtrack: Remove the current node from the path
            currentPath.RemoveAt(currentPath.Count - 1);
        }

        /// <summary>
        /// Finds a path between two nodes using breadth-first search.
        /// </summary>
        /// <param name="start">The node where the search begins.</param>
        /// <param name="end">The target node where the search should finish.</param>
        /// <returns>The discovered path as a list of nodes, or null if no path is found.</returns>
        public List<T> ShortestPathBFS(T start, T end)
        {
            if (start == null || end == null) return new List<T> { };

            if (start.Equals(end)) return new List<T> { start };

            var visited = new HashSet<T>();
            var parent = new Dictionary<T, T>();
            var queue = new Queue<T>();

            // Initialize the BFS search with the starting node.
            queue.Enqueue(start);
            visited.Add(start);
            parent[start] = default;

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();

                if (current.Equals(end))
                {
                    return ReconstructPath(start, end, parent);
                }

                foreach (var neighbor in AdjacencyList[current])
                {
                    if (!visited.Contains(neighbor.Item1))
                    {
                        // Mark the neighbour as visited and record its parent.
                        visited.Add(neighbor.Item1);
                        parent[neighbor.Item1] = current;

                        // Add the neighbour to the queue for further exploration.
                        queue.Enqueue(neighbor.Item1);
                    }
                }
            }

            return null; // No path found
        }

        /// <summary>
        /// Finds a lowest-weight path while applying a validation condition to each candidate connection.
        /// </summary>
        /// <param name="start">The node where the search begins.</param>
        /// <param name="end">The target node where the path should finish.</param>
        /// <param name="validation">An optional function that determines whether a connection is allowed, using the grandparent, parent and neighbour nodes.</param>
        /// <returns>The path with the lowest calculated weight, or null if no valid path is found.</returns>
        public List<T> ShortestPathBFS(T start, T end, Func<T, T, T, bool> validation = null)
        {
            if (start == null || end == null)
                return new List<T>();

            if (start.Equals(end))
            {
                validation?.Invoke(default, default, start);
                return new List<T> { start };
            }

            var distances = new Dictionary<T, double>();
            var previous = new Dictionary<T, T>();
            var queue = new SortedSet<(double dist, T node)>(Comparer<(double dist, T node)>.Create((a, b) =>
            {
                int cmp = a.dist.CompareTo(b.dist); // primary sort by distance
                if (cmp != 0) return cmp;
                // secondary sort by hash code
                int hashA = a.node?.GetHashCode() ?? 0;
                int hashB = b.node?.GetHashCode() ?? 0;
                return hashA.CompareTo(hashB);
            }));

            // Initialize all node distances and previous references.
            foreach (var node in AdjacencyList.Keys)
            {
                distances[node] = double.MaxValue;
                previous[node] = default;
            }
            // Set the starting node's distance to zero and add it to the queue.
            distances[start] = 0;
            queue.Add((0, start));

            while (queue.Count > 0)
            {
                // Remove the node with the smallest recorded distance from the queue.
                var (dist, current) = queue.Min;
                queue.Remove(queue.Min);

                if (current.Equals(end))
                    return ReconstructPath(start, end, previous);
                var adjacents = AdjacencyList[current];
                foreach (var (neighbor, weight) in adjacents)
                {
                    // Retrieve the parent and grandparent nodes for connection validation.
                    var parentNode = current;
                    var grandParentNode = previous.ContainsKey(parentNode) ? previous[parentNode] : default;

                    // Skip the connection if it does not satisfy the validation condition.
                    if (validation != null && !validation(grandParentNode, parentNode, neighbor))
                        continue;

                    // Calculate the new distance through the current node.
                    double newDist = dist + weight;

                    if (newDist < distances[neighbor])
                    {
                        queue.Remove((distances[neighbor], neighbor));
                        distances[neighbor] = newDist;
                        previous[neighbor] = current;

                        // Add the neighbour with its updated distance for further exploration.
                        queue.Add((newDist, neighbor));
                    }
                }
            }

            return null; // No path found
        }

        /// <summary>
        /// Finds a lowest-weight path and stops when the supplied condition is satisfied
        /// or when the target node is reached.
        /// </summary>
        /// <param name="start">The node where the search begins.</param>
        /// <param name="end">The target node where the search should finish.</param>
        /// <param name="stopCondition">An optional function that determines whether the search should stop at a node.</param>
        /// <returns>The discovered path to the matching node or target node, or null if no path is found.</returns>
        public List<T> ShortestPathBFS(T start, T end, Func<T, bool> stopCondition = null)
        {
            if (start == null || end == null)
                return new List<T>();

            if (start.Equals(end))
            {
                stopCondition?.Invoke(start);
                return new List<T> { start };
            }

            var distances = new Dictionary<T, double>();
            var previous = new Dictionary<T, T>();
            var queue = new SortedSet<(double dist, T node)>(Comparer<(double dist, T node)>.Create((a, b) =>
            {
                int cmp = a.dist.CompareTo(b.dist); // primary sort by distance
                if (cmp != 0) return cmp;
                // secondary sort by hash code
                int hashA = a.node?.GetHashCode() ?? 0;
                int hashB = b.node?.GetHashCode() ?? 0;
                return hashA.CompareTo(hashB);
            }));

            // Initialize all node distances and previous references.
            foreach (var node in AdjacencyList.Keys)
            {
                distances[node] = double.MaxValue;
                previous[node] = default;
            }

            // Set the starting node's distance to zero and add it to the queue.
            distances[start] = 0;
            queue.Add((0, start));

            while (queue.Count > 0)
            {
                // Remove the node with the smallest recorded distance from the queue.
                var (dist, current) = queue.Min;
                queue.Remove(queue.Min);

                if (stopCondition != null && stopCondition(current))
                    return ReconstructPath(start, current, previous);

                if (current.Equals(end))
                    return ReconstructPath(start, end, previous);

                foreach (var (neighbor, weight) in AdjacencyList[current])
                {
                    // Calculate the new distance through the current node.
                    double newDist = dist + weight;
                    if (newDist < distances[neighbor])
                    {
                        queue.Remove((distances[neighbor], neighbor));
                        distances[neighbor] = newDist;
                        previous[neighbor] = current;
                        queue.Add((newDist, neighbor));
                    }
                }
            }

            return null; // No path found
        }

        /// <summary>
        /// Finds a path using breadth-first search while preventing expansion through nodes
        /// that match the specified type.
        /// </summary>
        /// <param name="start">The node where the search begins.</param>
        /// <param name="end">The target node where the path should finish.</param>
        /// <param name="stopAtType">The type of neighbour nodes that should not be added to the search queue.</param>
        /// <returns>The discovered path as a list of nodes, or null if no path is found.</returns>
        public List<T> ShortestPathBFS(T start, T end, Type stopAtType)
        {
            if (start.Equals(end)) return new List<T> { start };

            var visited = new HashSet<T>();
            var parent = new Dictionary<T, T>();
            var queue = new Queue<T>();

            queue.Enqueue(start);
            visited.Add(start);
            parent[start] = default;

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();

                if (current.Equals(end))
                {
                    return ReconstructPath(start, end, parent);
                }

                foreach (var neighbor in AdjacencyList[current])
                {
                    var neighborNode = neighbor.Item1;

                    if (!visited.Contains(neighborNode))
                    {
                        // Stop expanding if the node is of a given type
                        if (stopAtType != null && stopAtType.IsInstanceOfType(neighborNode))
                        {
                            continue; // skip this neighbor, do not enqueue it
                        }

                        // Mark the neighbour as visited and record its parent.
                        visited.Add(neighborNode);
                        parent[neighborNode] = current;

                        // Add the neighbour to the queue for further BFS exploration.
                        queue.Enqueue(neighborNode);
                    }
                }
            }

            return null; // No path found
        }

        /// <summary>
        /// Finds paths from the starting node until a node matching one of the specified types is reached.
        /// The matching node is included in the returned path.
        /// </summary>
        /// <param name="start">The node where the search begins.</param>
        /// <param name="stopTypes">The types of nodes at which path exploration should stop.</param>
        /// <returns>A list of paths ending at nodes that match one of the specified types.</returns>
        public List<List<T>> Paths(T start, IEnumerable<Type> stopTypes)
        {
            var resultPaths = new List<List<T>>();

            if (!AdjacencyList.ContainsKey(start))
                return resultPaths;

            var queue = new Queue<(T node, List<T> path)>();
            var visited = new HashSet<T>();

            queue.Enqueue((start, new List<T> { start }));
            visited.Add(start);

            while (queue.Count > 0)
            {
                var (current, path) = queue.Dequeue();

                // If current node matches any stop type and is not the start node
                if (stopTypes != null && stopTypes.Any(type => type.IsInstanceOfType(current)) && !current.Equals(start))
                {
                    resultPaths.Add(path);
                    continue; // Do not explore further from this node
                }

                foreach (var (neighbor, _) in AdjacencyList[current])
                {
                    if (!path.Contains(neighbor)) // allow branching paths; avoid cycles
                    {
                        // Create a new path by appending the neighbouring node.
                        var newPath = new List<T>(path) { neighbor };

                        // Add the new path to the queue for further exploration.
                        queue.Enqueue((neighbor, newPath));
                    }
                }
            }
            // Return all paths ending at nodes matching the specified types.
            return resultPaths;
        }

        /// <summary>
        /// Finds paths from the starting node until a node satisfies the specified condition.
        /// The matching node is included in the returned path.
        /// </summary>
        /// <param name="start">The node where the search begins.</param>
        /// <param name="stopCondition">A function that determines whether a node marks the end of a path.</param>
        /// <returns>A list of paths ending at nodes that satisfy the condition.</returns>
        public List<List<T>> Paths(T start, Func<T, bool> stopCondition)
        {
            var resultPaths = new List<List<T>>();

            if (!AdjacencyList.ContainsKey(start))
                return resultPaths;

            var queue = new Queue<(T node, List<T> path)>();

            queue.Enqueue((start, new List<T> { start }));

            while (queue.Count > 0)
            {
                var (current, path) = queue.Dequeue();

                if (stopCondition != null && stopCondition(current) && !current.Equals(start))
                {
                    // Condition met: save the path and do not go deeper from here
                    resultPaths.Add(path);
                    continue;
                }

                if (!AdjacencyList.ContainsKey(current))
                    continue; // no neighbors

                foreach (var (neighbor, _) in AdjacencyList[current])
                {
                    if (!path.Contains(neighbor)) // avoid cycles
                    {
                        // Create a new path by appending the neighbouring node.
                        var newPath = new List<T>(path) { neighbor };

                        // Add the new path to the queue for further exploration.
                        queue.Enqueue((neighbor, newPath));
                    }
                }
            }

            // Return all paths that satisfy the stop condition.
            return resultPaths;
        }

        /// <summary>
        /// Explores paths from the starting node and returns paths that satisfy the stop condition
        /// without reusing previously accepted endpoint nodes.
        /// </summary>
        /// <param name="start">The node where exploration begins.</param>
        /// <param name="stopCondition">A function that determines whether the current node and path form a valid endpoint.</param>
        /// <param name="maxIterations">The maximum number of queued paths to process. Defaults to 10000.</param>
        /// <returns>A list of accepted, non-overlapping paths.</returns>

        public List<List<T>> ExploreNotOverlapping(
     T start,
     Func<T, List<T>, bool> stopCondition,
     int maxIterations = 10000)
        {
            var resultPaths = new List<List<T>>();

            // End nodes that are already used (cannot be reused or passed through)
            var blockedEndNodes = new HashSet<T>();

            if (!AdjacencyList.ContainsKey(start))
                return resultPaths;

            var queue = new Queue<(T node, List<T> path)>();
            queue.Enqueue((start, new List<T> { start }));

            int iterations = 0;

            while (queue.Count > 0)
            {
                // Stop exploration when the maximum number of iterations is reached.
                if (iterations++ >= maxIterations)
                    break;

                var (current, path) = queue.Dequeue();

                // If we reached a valid end node
                if (!current.Equals(start) && stopCondition(current, path))
                {

                    // Only accept if this endpoint was not used before
                    if (!blockedEndNodes.Any(x => path.Contains(x)))
                    {
                        blockedEndNodes.Add(current);
                        resultPaths.Add(path);
                    }

                    continue;
                }

                if (!AdjacencyList.TryGetValue(current, out var neighbors))
                    continue;

                foreach (var (neighbor, _) in neighbors)
                {
                    // ❌ cannot go through already used end nodes
                    if (blockedEndNodes.Contains(neighbor))
                        continue;

                    // ❌ prevent cycles in current path
                    if (path.Contains(neighbor))
                        continue;

                    var newPath = new List<T>(path) { neighbor };
                    queue.Enqueue((neighbor, newPath));
                }
            }

            // Return all accepted non-overlapping paths.
            return resultPaths;
        }

        /// <summary>
        /// Explores paths from the starting node and collects paths that satisfy the stop condition.
        /// </summary>
        /// <param name="start">The node where exploration begins.</param>
        /// <param name="stopCondition">A function that determines whether a node matches the search condition.</param>
        /// <param name="stopAtFirstMatch">Indicates whether exploration should stop after the first matching path is found.</param>
        /// <param name="maxNeighborExpansions">The optional maximum number of nodes whose neighbours can be expanded.</param>
        /// <returns>A list of paths ending at nodes that satisfy the stop condition.</returns>
        public List<List<T>> Explore(
     T start,
     Func<T, bool> stopCondition,
     bool stopAtFirstMatch = false,
     int? maxNeighborExpansions = null   // <-- NEW parameter
        )
        {
            var resultPaths = new List<List<T>>();
            var globallyVisited = new HashSet<T>();
            if (!AdjacencyList.ContainsKey(start))
                return resultPaths;

            var queue = new Queue<(T node, List<T> path)>();
            queue.Enqueue((start, new List<T> { start }));

            int expansions = 0;  // number of neighbor expansions so far

            while (queue.Count > 0)
            {
                var (current, path) = queue.Dequeue();

                if (globallyVisited.Contains(current))
                    continue;

                bool isStart = current.Equals(start);

                // ✔ stopCondition matched
                if (stopCondition(current) && !isStart)
                {
                    resultPaths.Add(path);

                    foreach (var node in path)
                        globallyVisited.Add(node);

                    if (stopAtFirstMatch)
                        return resultPaths;

                    continue;
                }

                if (!AdjacencyList.ContainsKey(current))
                    continue;

                // ✔ increment expansion counter
                expansions++;

                // ✔ hard stop when neighbor expansion limit reached
                if (maxNeighborExpansions.HasValue && expansions > maxNeighborExpansions.Value)
                    return resultPaths;

                foreach (var (neighbor, _) in AdjacencyList[current])
                {
                    // Avoid revisiting nodes already present in the current path.
                    if (!path.Contains(neighbor)) // prevent local cycles
                    {
                        var newPath = new List<T>(path) { neighbor };
                        queue.Enqueue((neighbor, newPath));
                    }
                }
            }

            return resultPaths;
        }


        /// <summary>
        /// Reconstructs a path by following the parent references from the end node.
        /// </summary>
        /// <param name="start">The starting node of the path.</param>
        /// <param name="end">The ending node of the path.</param>
        /// <param name="parent">A dictionary containing the parent of each discovered node.</param>
        /// <returns>The reconstructed path in start-to-end order.</returns>
        private List<T> ReconstructPath(T start, T end, Dictionary<T, T> parent)
        {
            var path = new List<T>();

            // Follow the parent references backwards from the end node.
            for (T at = end; !EqualityComparer<T>.Default.Equals(at, default); at = parent[at])
            {
                path.Add(at);
            }

            // Reverse the path to obtain start-to-end order.
            path.Reverse();
            return path;
        }

        /// <summary>
        /// Finds a path from the start node to the end node through the specified intermediate nodes
        /// in their supplied order.
        /// </summary>
        /// <param name="start">The node where the complete path begins.</param>
        /// <param name="end">The final destination node.</param>
        /// <param name="intermediateNodes">The nodes that must be visited between the start and end nodes, in order.</param>
        /// <param name="validation">An optional function used to validate connections between nodes.</param>
        /// <returns>The combined path through all specified nodes, or null if a required path segment cannot be found.</returns>
        public List<T> FindShortestPathThroughNodes(T start, T end, List<T> intermediateNodes, Func<T, T, T, bool> validation = null)
        {
            var nodes = new List<T> { start };
            nodes.AddRange(intermediateNodes);
            nodes.Add(end);

            var fullPath = new List<T>();

            // Find a shortest path between each pair of consecutive required nodes.
            for (int i = 0; i < nodes.Count - 1; i++)
            {
                var shortestPath = ShortestPathBFS(nodes[i], nodes[i + 1], validation);

                // Return null if any required path segment cannot be found.
                if (shortestPath == null || shortestPath.Count == 0)
                {
                    Console.WriteLine("No path found between some nodes.");
                    return null;
                }

                if (fullPath.Count == 0)
                {
                    fullPath.AddRange(shortestPath);
                }
                else
                {
                    // Remove the last node from the previous segment to avoid duplication
                    fullPath.RemoveAt(fullPath.Count - 1);
                    fullPath.AddRange(shortestPath);
                }
            }

            return fullPath;
        }
    }
}
