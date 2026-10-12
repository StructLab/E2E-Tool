using VDS.RDF;

namespace ModelToERA.ERAontology
{
    public class TopoArea(OntologyGraph tTLGraph, string id,  List<IUriNode>? linearElements = null, List<IUriNode>? netRelations = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "taVersionTimestamp", DateTime.UtcNow);
            g.AddProperty(subject, "linearElements", linearElements?.ToArray() ?? []);
            g.AddProperty(subject, "netRelations", netRelations?.ToArray() ?? []);
            g.AddProperty(subject, "name", "unnamed");

            return subject;
        }
    }
    public class GeometryArea(OntologyGraph tTLGraph, string id, List<IUriNode>? linearElementGeometries = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
                      var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "topoArea", new Uri($"http://data.europa.eu/949/topoArea/{id}"));

            //versionTimestamp
            g.AddProperty(subject, "gaVersionTimestamp", DateTime.UtcNow);

            //alignment3d
            g.AddProperty(subject, "alignment3d", false);

            //linearElementGeometries
            g.AddProperty(subject, "linearElementGeometries", linearElementGeometries?.ToArray() ?? []);

            return subject;
        }
    }
    public class LinearElement(OntologyGraph tTLGraph,string trackId,  double lengthOfNetLinearElement)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{trackId}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, trackId, this.GetType().Name);

            g.AddProperty(subject, "lengthOfNetLinearElement", lengthOfNetLinearElement*1000);
            g.AddProperty(subject, "name", "unnamed");

            return subject;
        }
    }
    public class NetRelation(OntologyGraph tTLGraph,string name, string elementA, string elementB, bool isOnOriginOfElementA, bool isOnOriginOfElementB)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{name}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "elementA", g.CreateUriNode($"era:linearElement/{elementA}"));
            g.AddProperty(subject, "elementB", g.CreateUriNode($"era:linearElement/{elementB}"));
            g.AddProperty(subject, "isOnOriginOfElementA", isOnOriginOfElementA);
            g.AddProperty(subject, "isOnOriginOfElementB", isOnOriginOfElementB);

            return subject;
        }
    }
    public class TopologicalCoordinate(OntologyGraph tTLGraph, double offsetFromOrigin, string onLinearElement)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, ID, this.GetType().Name);

            //onLinearElement
            g.AddProperty(subject, "onLinearElement", g.CreateUriNode($"era:linearElement/{onLinearElement}"));

            //offsetFromOrigin
            g.AddProperty(subject, "offsetFromOrigin", (double)(offsetFromOrigin*1000));

            return subject;
        }
    }
    public class TractionSystem(OntologyGraph tTLGraph, List<IUriNode>? linearElementSections, Uri voltageType)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "linearElementSections", linearElementSections?.ToArray()??[]);

            g.AddProperty(subject, "voltageType", voltageType);

            return subject;
        }
    }
    public class LinearElementSection(OntologyGraph tTLGraph, string onElement, double startOffsetFromOrigin, double endOffsetFromOrigin, bool appliesInBothDirections)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public IUriNode RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{Id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, ID, this.GetType().Name);


            g.AddProperty(subject, "onElement", g.CreateUriNode($"era:linearElement/{onElement}"));

            g.AddProperty(subject, "startOffsetFromOrigin", startOffsetFromOrigin*1000);

            g.AddProperty(subject, "endOffsetFromOrigin", endOffsetFromOrigin*1000);

            g.AddProperty(subject, "appliesInBothDirections", appliesInBothDirections);

            return subject;
        }

    }
    public class NetLinearReference(OntologyGraph tTLGraph, IUriNode startsAt, IUriNode endsAt, List<string>? hasSequence = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public void RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{Id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, Guid.NewGuid().ToString(), this.GetType().Name);

            //startsAt
            g.AddProperty(subject, "startsAt", startsAt);

            //endsAt
            g.AddProperty(subject, "endsAt", endsAt);

            //hasSequence
            g.AddProperty(subject, "hasSequence", hasSequence?.ToArray() ?? []);
        }

    }
    public class NetAreaReference(OntologyGraph tTLGraph)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public void RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{Id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //type
            g.AddType(subject, ID, this.GetType().Name);

            //includes
            g.AddProperty(subject, "includes", new IUriNode[] { });
        }
    }
    public class LinearElementGeometry(OntologyGraph tTLGraph, string id, List<IUriNode>? horizontalAlignments = null, List<IUriNode>? verticalAlignments = null, List<IUriNode>? cantPoints = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, Guid.NewGuid().ToString(), this.GetType().Name);

            g.AddProperty(subject, "linearElement", new Uri($"http://data.europa.eu/949/linearElement/{id}"));
            g.AddPropertyList(subject, "horizontalAlignments", horizontalAlignments?? new List<IUriNode>());

            g.AddPropertyList(subject, "verticalAlignments", verticalAlignments ?? new List<IUriNode>());

            g.AddPropertyList(subject, "cantPoints", cantPoints ?? new List<IUriNode>());

            return subject;
        }
    }
    public class HorizontalSegment(OntologyGraph tTLGraph, IUriNode? horizontalSegmentLine = null, IUriNode? horizontalSegmentArc = null, IUriNode? horizontalSegmentTransition = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                      var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            if(horizontalSegmentLine!=null) g.AddProperty(subject, "horizontalSegmentLine", horizontalSegmentLine);

            if (horizontalSegmentArc != null) g.AddProperty(subject, "horizontalSegmentArc", horizontalSegmentArc);

            if (horizontalSegmentTransition != null)  g.AddProperty(subject, "horizontalSegmentTransition", horizontalSegmentTransition);

            return subject;
        }
    }
    public class VerticalSegment(OntologyGraph tTLGraph, IUriNode? verticalSegmentLine = null, IUriNode? verticalSegmentArc = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                      var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            if(verticalSegmentLine != null) g.AddProperty(subject, "verticalSegmentLine", verticalSegmentLine);

            if (verticalSegmentArc != null) g.AddProperty(subject, "verticalSegmentArc", verticalSegmentArc);

 

            return subject;
        }
    }
    public class VerticalLine(OntologyGraph tTLGraph, double elementGeometryPos, double slope)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "elementGeometryPos", elementGeometryPos);

            g.AddProperty(subject, "slope", (int)slope);

            return subject;
        }
    }
    public class HorizontalLine(OntologyGraph tTLGraph, double elementGeometryPos , double azimuth)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "elementGeometryPos", elementGeometryPos);

            g.AddProperty(subject, "azimuth", double.Round(azimuth,6));

            return subject;
        }
    }
    public class HorizontalArc(OntologyGraph tTLGraph, double elementGeometryPos, double azimuth, double radius)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "elementGeometryPos", elementGeometryPos);

            g.AddProperty(subject, "azimuth", azimuth);

            g.AddProperty(subject, "radius", radius);

            return subject;
        }
    }
    public class SlopeSamplePoint(OntologyGraph tTLGraph, uint pos, int samplePointSlope)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "pos", pos);

            g.AddProperty(subject, "samplePointSlope", samplePointSlope);
            g.AddProperty(subject, "elementGeometryPos", (double)pos);


            return subject;
        }
    }
    public class CurveSamplePoint(OntologyGraph tTLGraph, uint pos, int sampleCurveRadius)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "pos", pos);

            g.AddProperty(subject, "sampleCurveRadius", (double)sampleCurveRadius);
            g.AddProperty(subject, "elementGeometryPos", (double)pos);


            return subject;
        }
    }
    public class CantSamplePoint(OntologyGraph tTLGraph, uint pos, int samplePointCant)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "pos", pos);

            g.AddProperty(subject, "samplePointCant", samplePointCant);
            g.AddProperty(subject, "elementGeometryPos", (double)pos);


            return subject;
        }
    }
    public class SampledLinearElementGeometry(OntologyGraph tTLGraph,string id, List<IUriNode> slopes, List<IUriNode> curves, List<IUriNode> cants)
    {
        public IUriNode RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var subject = tTLGraph.G.CreateUriNode(ID);

            //props
            tTLGraph.G.AddType(subject, ID, this.GetType().Name);
            tTLGraph.G.AddProperty(subject, "linearElement", new Uri($"http://data.europa.eu/949/linearElement/{id}"));
            tTLGraph.G.AddPropertyList(subject, "slopes", slopes);
            tTLGraph.G.AddPropertyList(subject, "curves", curves);
            tTLGraph.G.AddPropertyList(subject, "cants", cants);


            return subject;
        }
    }
    public class SampledGeometryArea(OntologyGraph tTLGraph, string id, List<IUriNode> sampledLinearElementGeometries)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "topoArea", new Uri($"http://data.europa.eu/949/topoArea/{id}"));

            g.AddProperty(subject, "sgaVersionTimestamp", DateTime.UtcNow);

            g.AddProperty(subject, "sampledLinearElementGeometries", sampledLinearElementGeometries.ToArray());



            return subject;
        }
    }
    public class Switch(OntologyGraph tTLGraph,string name, IUriNode leftBranch, IUriNode rightBranch)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = name;
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "reversalTime", 10u);

            g.AddProperty(subject, "leftBranch", leftBranch);

            g.AddProperty(subject, "rightBranch", rightBranch);

            g.AddProperty(subject, "name", name);

            return subject;
        }
    }
    public class LinearElementSpeedProfile(OntologyGraph tTLGraph,string name, IUriNode sameDirProfile ,string? oppositeDirProfile = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{name}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "sameDirProfile", sameDirProfile);

            g.AddProperty(subject, "oppositeDirProfile", oppositeDirProfile);

            return subject;
        }
    }
    public class SpeedProfile(OntologyGraph tTLGraph, List<IUriNode>? staticSpeedProfile = null , List<string>? axleLoadSpeedProfiles = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "staticSpeedProfile", staticSpeedProfile?.ToArray() ?? []);

            g.AddProperty(subject, "axleLoadSpeedProfiles", axleLoadSpeedProfiles?.ToArray() ?? []);

            return subject;
        }
    }
    public class StaticSpeedLimit(OntologyGraph tTLGraph, uint? pos,uint? speed)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "pos", pos * 1000);

            g.AddProperty(subject, "speed", speed);

            return subject;
        }
    }
    public class ETCSMarker(OntologyGraph tTLGraph,string name, IUriNode netPointReference)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "netPointReference", netPointReference);

            g.AddProperty(subject, "markerFunctionStop", false);

            g.AddProperty(subject, "name", name);

            return subject;
        }
    }
    public class TvpSection(OntologyGraph tTLGraph,string name, string linkedArea, List<string>? trainDetectors = null)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public void RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode($"era:{id}");

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "linkedArea", linkedArea);

            g.AddProperty(subject, "trainDetectors", trainDetectors?.ToArray() ?? []);

            g.AddProperty(subject, "name", name);
        }
    }
    public class TrainDetector(OntologyGraph tTLGraph,string name,  IUriNode topologicalCoordinate, Uri trainDetectorType, Uri referenceDir)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "topologicalCoordinate", topologicalCoordinate);

            g.AddProperty(subject, "trainDetectionSystemType", trainDetectorType);

            g.AddProperty(subject, "referenceDir", referenceDir);

            return subject;
        }
    }
    public class BufferStop(OntologyGraph tTLGraph, IUriNode netPointReference)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
            var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "netPointReference", netPointReference);

            g.AddProperty(subject, "name", string.Empty);

            return subject;

        }
    }
    public class BaliseGroup(OntologyGraph tTLGraph, uint nid_bg, uint nid_c, List<IUriNode>? balises, string bgFunction, string linkOrientationDirection)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "nid_bg", nid_bg);
            g.AddProperty(subject, "nid_c", nid_c);
            g.AddPropertyList(subject, "balises", balises ?? new List<IUriNode>());
            g.AddProperty(subject, "bgFunction", g.CreateUriNode($"concepts:balise-group-function/{bgFunction}"));
            g.AddProperty(subject, "linkOrientationDirection", g.CreateUriNode($"concepts:orientations/{linkOrientationDirection}"));

            return subject;

        }
    }
    public class Balise(OntologyGraph tTLGraph, IUriNode topologicalCoordinate)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "topologicalCoordinate", topologicalCoordinate);

            return subject;
        }
    }
    public class NetPointReference(OntologyGraph tTLGraph,IUriNode hasTopoCoordinate, Uri appliesToDirection)
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = OntologyGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, id, this.GetType().Name);

            g.AddProperty(subject, "hasTopoCoordinate", hasTopoCoordinate);

            g.AddProperty(subject, "appliesToDirection", appliesToDirection);

            return subject;

        }
    }
    public class FunctionalArea(OntologyGraph tTLGraph, 
        string areaId,
        List<IUriNode>? switches, 
        List<IUriNode>? baliseGroups,
        List<IUriNode>? etcsMarkers,
        List<IUriNode>? bufferStops,
        List<IUriNode>? trainDetectors
        )
    {
        private OntologyGraph OntologyGraph { get; set; } = tTLGraph;

        public IUriNode RegisterToGraph()
        {
            var id = areaId;
            var g = OntologyGraph.G;
                      var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "topoArea", new Uri($"http://data.europa.eu/949/topoArea/{areaId}"));
            g.AddProperty(subject, "faVersionTimestamp", DateTime.UtcNow);
            g.AddProperty(subject, "opPoints", new IUriNode[] { });
            g.AddProperty(subject, "switches", switches?.ToArray() ?? []);
            g.AddProperty(subject, "slipCrossings", new IUriNode[] { });
            g.AddProperty(subject, "derailers", new IUriNode[] { });
            g.AddProperty(subject, "crossings", new IUriNode[] { });
            g.AddProperty(subject, "trainDetectors", trainDetectors?.ToArray() ?? []);
            g.AddProperty(subject, "baliseGroups", baliseGroups?.ToArray() ?? []);
            g.AddProperty(subject, "etcsMarkers", etcsMarkers?.ToArray() ?? []);
            g.AddProperty(subject, "stopLocations", new IUriNode[] { });
            g.AddProperty(subject, "tunnels", new IUriNode[] { });
            g.AddProperty(subject, "bridges", new IUriNode[] { });
            g.AddProperty(subject, "underpasses", new IUriNode[] { });
            g.AddProperty(subject, "tvps", new IUriNode[] { });
            g.AddProperty(subject, "levelCrossings", new IUriNode[] { });
            g.AddProperty(subject, "nationalBorders", new IUriNode[] { });
            g.AddProperty(subject, "bufferStops", bufferStops?.ToArray() ?? []);
            g.AddProperty(subject, "timingPoints", new IUriNode[] { });

            return subject;

        }


    }
    public class Infrastructure(OntologyGraph tTLGraph, List<IUriNode>? topoAreas = null, List<IUriNode>? geometryAreas = null, List<IUriNode>? functionalAreas = null, List<IUriNode>? propsArea = null, List<IUriNode>? sampleGeoemtryAreas = null)
    {
        public void RegisterToGraph()
        {
            var id = Guid.NewGuid().ToString();
                      var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var g = tTLGraph.G;
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "topoAreas", topoAreas?.ToArray() ?? []);
            g.AddProperty(subject, "geometryAreas", geometryAreas?.ToArray() ?? []);
            g.AddProperty(subject, "sampledGeometryAreas", sampleGeoemtryAreas?.ToArray() ?? []);
            g.AddProperty(subject, "functionalAreas", functionalAreas?.ToArray() ?? []);
            g.AddProperty(subject, "propertiesAreas", propsArea?.ToArray() ?? []);
            g.AddProperty(subject, "trackUsageAreas", new IUriNode[] { });
        }
    }
    public class PropertiesArea(OntologyGraph tTLGraph,string areaId,  List<IUriNode>? tractionSystems = null, List<IUriNode>? linearElementSpeedProfiles = null)
    {
        public IUriNode RegisterToGraph()
        {
            var id = areaId;
            var g = tTLGraph.G;
                     var ID = $"era:{this.GetType().Name.UriNameToLower()}/{id}";
            var subject = g.CreateUriNode(ID);

            //props
            g.AddType(subject, ID, this.GetType().Name);

            g.AddProperty(subject, "topoArea", new Uri($"http://data.europa.eu/949/topoArea/{areaId}"));
            g.AddProperty(subject, "paVersionTimestamp", DateTime.UtcNow);
            g.AddProperty(subject, "gauge", new Uri("http://data.europa.eu/949/concepts/nominal-track-gauges/10"));
            g.AddProperty(subject, "defaultVoltage", new Uri("http://data.europa.eu/949/concepts/energy-supply-systems/AC10"));
            g.AddProperty(subject, "defaultMaxCurrent", (uint)220);
            g.AddProperty(subject, "tractionSystems", tractionSystems?.ToArray() ?? []);
            g.AddProperty(subject, "linearElementSpeedProfiles", linearElementSpeedProfiles?.ToArray() ?? []);

            return subject;
        }
    }
}
