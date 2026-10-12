using System;
using System.Collections.Generic;
using System.Linq;

namespace Graph
{
    public class OrderedSetComparer<T> : IComparer<(double dist, T node)>
    {
        public int Compare((double, T) x, (double, T) y)
        {
            return Comparer<object>.Default.Compare(x.Item2, y.Item2);
        }
    }
    public class UndirectedWeightedGraphT<T>
    {
        public Dictionary<T, List<(T, double)>> AdjacencyList { get; private set; }
        public Dictionary<string, (T, T, double)> EdgesWithNodes { get; private set; }

        public delegate bool EdgeCondition(T fromNode, T toNode);
        public UndirectedWeightedGraphT()
        {
            AdjacencyList = new Dictionary<T, List<(T, double)>>();
            EdgesWithNodes = new Dictionary<string, (T, T, double)>();
        }

        public UndirectedWeightedGraphT(Dictionary<string, (T, T, double)> edgesWithNodes)
        {
            AdjacencyList = new Dictionary<T, List<(T, double)>>();
            EdgesWithNodes = edgesWithNodes;
            CreateUndirectedGraph();
        }

        private void CreateUndirectedGraph()
        {
            foreach (var edge in EdgesWithNodes)
            {
                AddEdge(edge.Value.Item1, edge.Value.Item2, edge.Value.Item3);
                AddEdge(edge.Value.Item2, edge.Value.Item1, edge.Value.Item3);
            }
        }

        public void AddEdge(T fromNode, T toNode, double weight)
        {
            if (!AdjacencyList.ContainsKey(fromNode))
            {
                AdjacencyList[fromNode] = new List<(T, double)>();
            }
            AdjacencyList[fromNode].Add((toNode, weight));
        }
        public void AddEdgeTwoWay(T fromNode, T toNode, double weight)
        {
            AddEdge(fromNode, toNode, weight);
            AddEdge(toNode, fromNode, weight);
        }
       
        public void RemoveEdgeTwoWay((T nodeA, T nodeB) edge)
        {
            if (AdjacencyList.ContainsKey(edge.nodeA))
                AdjacencyList[edge.nodeA].RemoveAll(e => EqualityComparer<T>.Default.Equals(e.Item1, edge.nodeB));

            if (AdjacencyList.ContainsKey(edge.nodeB))
                AdjacencyList[edge.nodeB].RemoveAll(e => EqualityComparer<T>.Default.Equals(e.Item1, edge.nodeA));
        }

        public List<List<T>> AllRoutesFromStartToEndNodes(T start, T end)
        {
            var paths = new List<List<T>>();
            var currentPath = new List<T>();

            if (!AdjacencyList.ContainsKey(start) || !AdjacencyList.ContainsKey(end))
                return paths;

            DFS(start, end, currentPath, paths);
            return paths;
        }

        private void DFS(T current, T end, List<T> currentPath, List<List<T>> paths)
        {
            currentPath.Add(current);
            if (EqualityComparer<T>.Default.Equals(current, end))
            {
                paths.Add(new List<T>(currentPath));
            }
            else
            {
                if (AdjacencyList.ContainsKey(current))
                {
                    foreach (var neighbor in AdjacencyList[current])
                    {
                        if (!currentPath.Contains(neighbor.Item1))
                        {
                            DFS(neighbor.Item1, end, currentPath, paths);
                        }
                    }
                }
            }
            currentPath.RemoveAt(currentPath.Count - 1);
        }


        public List<List<T>> FindClosedLoops(UndirectedWeightedGraphT<T> graph)
        {
            var loops = new List<List<T>>();
            var visitedEdges = new HashSet<(T, T)>();

            foreach (var start in graph.AdjacencyList.Keys.ToList())
            {
                DFSLoops(graph, start, start, new List<T>(), visitedEdges, loops);
            }

            // Remove duplicate loops (same nodes in different orders)
            var uniqueLoops = new List<List<T>>();
            foreach (var loop in loops)
            {
                var normalized = loop.OrderBy(v => v.GetHashCode()).ToList();
                if (!uniqueLoops.Any(l => l.OrderBy(v => v.GetHashCode()).SequenceEqual(normalized)))
                {
                    uniqueLoops.Add(loop);
                }
            }

            return uniqueLoops;
        }
        private static void DFSLoops(
        UndirectedWeightedGraphT<T> graph,
        T current,
        T start,
        List<T> path,
        HashSet<(T, T)> visitedEdges,
        List<List<T>> loops)
        {
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
                    visitedEdges.Add(edge);
                    DFSLoops(graph, neighbor, start, path, visitedEdges, loops);
                    visitedEdges.Remove(edge);
                }
            }

            path.RemoveAt(path.Count - 1);
        }
        public List<T> ShortestRoutesFromStartToEndNodes(T start, T end)
        {
            var distances = new Dictionary<T, double>();
            var previous = new Dictionary<T, T>();
            var priorityQueue = new SortedSet<(double distance, T node)>();

            foreach (var node in AdjacencyList.Keys)
            {
                distances[node] = double.MaxValue;
                previous[node] = default;
            }

            distances[start] = 0;
            priorityQueue.Add((0, start));

            while (priorityQueue.Count > 0)
            {
                var (currentDistance, currentNode) = priorityQueue.Min;
                priorityQueue.Remove(priorityQueue.Min);

                if (EqualityComparer<T>.Default.Equals(currentNode, end))
                    break;

                foreach (var (neighbor, weight) in AdjacencyList[currentNode])
                {
                    double distance = currentDistance + weight;
                    if (distance < distances[neighbor])
                    {
                        priorityQueue.Remove((distances[neighbor], neighbor));
                        distances[neighbor] = distance;
                        previous[neighbor] = currentNode;
                        priorityQueue.Add((distance, neighbor));
                    }
                }
            }

            var path = new List<T>();
            for (T at = end; !EqualityComparer<T>.Default.Equals(at, default) && !EqualityComparer<T>.Default.Equals(at, start); at = previous[at])
            {
                path.Add(at);
            }
            path.Add(start);
            path.Reverse();

            return path.Count == 1 && !EqualityComparer<T>.Default.Equals(path[0], start) ? new List<T>() : path;
        }


        /// <summary>
        /// Finds the first path that contains all required nodes. If the path doesn't contain all required nodes, it will try another path.
        /// </summary>
        /// <param name="start"></param>
        /// <param name="end"></param>
        /// <param name="requiredNodes"></param>
        /// <returns></returns>
        /// <summary>
        /// Finds all paths from start to end nodes. Only returns paths that contain all the required nodes.
        /// </summary>
        /// <param name="start"></param>
        /// <param name="end"></param>
        /// <param name="requiredNodes"></param>
        /// <returns></returns>
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
        /// <param name="currentNode"></param>
        /// <param name="endNode"></param>
        /// <param name="currentPath"></param>
        /// <param name="paths"></param>
        /// <param name="requiredNodes"></param>
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

        // BFS to find the shortest path
        public List<T> ShortestPathBFS(T start, T end)
        {
            if (start == null || end == null) return new List<T> { };

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
                    if (!visited.Contains(neighbor.Item1))
                    {
                        visited.Add(neighbor.Item1);
                        parent[neighbor.Item1] = current;
                        queue.Enqueue(neighbor.Item1);
                    }
                }
            }

            return null; // No path found
        }
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

            foreach (var node in AdjacencyList.Keys)
            {
                distances[node] = double.MaxValue;
                previous[node] = default;
            }
            distances[start] = 0;
            queue.Add((0, start));

            while (queue.Count > 0)
            {
                var (dist, current) = queue.Min;
                queue.Remove(queue.Min);

                if (current.Equals(end))
                    return ReconstructPath(start, end, previous);
                var adjacents = AdjacencyList[current];
                foreach (var (neighbor, weight) in adjacents)
                {
                    var parentNode = current;
                    var grandParentNode = previous.ContainsKey(parentNode) ? previous[parentNode] : default;

                    if (validation != null && !validation(grandParentNode, parentNode, neighbor))
                        continue;

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

            foreach (var node in AdjacencyList.Keys)
            {
                distances[node] = double.MaxValue;
                previous[node] = default;
            }
            distances[start] = 0;
            queue.Add((0, start));

            while (queue.Count > 0)
            {
                var (dist, current) = queue.Min;
                queue.Remove(queue.Min);

                if (stopCondition != null && stopCondition(current))
                    return ReconstructPath(start, current, previous);

                if (current.Equals(end))
                    return ReconstructPath(start, end, previous);

                foreach (var (neighbor, weight) in AdjacencyList[current])
                {
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

                        visited.Add(neighborNode);
                        parent[neighborNode] = current;
                        queue.Enqueue(neighborNode);
                    }
                }
            }

            return null; // No path found
        }
        /// <summary>
        /// Get All paths from start node until a Type. Included the first instance of that Type.
        /// </summary>
        /// <param name="start"></param>
        /// <param name="stopType"></param>
        /// <returns></returns>
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
                        var newPath = new List<T>(path) { neighbor };
                        queue.Enqueue((neighbor, newPath));
                    }
                }
            }

            return resultPaths;
        }
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
                        var newPath = new List<T>(path) { neighbor };
                        queue.Enqueue((neighbor, newPath));
                    }
                }
            }

            return resultPaths;
        }
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
                if (iterations++ >= maxIterations)
                    break;

                var (current, path) = queue.Dequeue();

                // If we reached a valid end node
                if (!current.Equals(start) && stopCondition(current,path))
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

            return resultPaths;
        }
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
                    if (!path.Contains(neighbor)) // prevent local cycles
                    {
                        var newPath = new List<T>(path) { neighbor };
                        queue.Enqueue((neighbor, newPath));
                    }
                }
            }

            return resultPaths;
        }


        // Reconstruct the path from parent dictionary
        private List<T> ReconstructPath(T start, T end, Dictionary<T, T> parent)
        {
            var path = new List<T>();
            for (T at = end; !EqualityComparer<T>.Default.Equals(at, default); at = parent[at])
            {
                path.Add(at);
            }
            path.Reverse();
            return path;
        }

        // Find the shortest path through a sequence of nodes
        public List<T> FindShortestPathThroughNodes(T start, T end, List<T> intermediateNodes, Func<T, T, T, bool> validation = null)
        {
            var nodes = new List<T> { start };
            nodes.AddRange(intermediateNodes);
            nodes.Add(end);

            var fullPath = new List<T>();

            for (int i = 0; i < nodes.Count - 1; i++)
            {
                var shortestPath = ShortestPathBFS(nodes[i], nodes[i + 1], validation);

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
