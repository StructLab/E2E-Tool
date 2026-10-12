using GeoModel.Geometry;
using GeoModel.Rail;
using ModelToERA.ERAontology;
using VDS.RDF;

namespace ModelToERA.ToERA
{
    public class TrackToERA(OntologyGraph graph, Track track)
    {
        public void ToERA()
        {
            new LinearElement(graph, track.Id, track.Geometry.Length).RegisterToGraph();

            var segments = track.Geometry.Segments;

            foreach (var segment in segments)
            {
                var node = SegmentToERA(segment);
                HorizontalSegment horizontalSegment = segment is Line3D ? new HorizontalSegment(graph, horizontalSegmentLine: node) : new HorizontalSegment(graph, horizontalSegmentArc: node);
                horizontalSegment.RegisterToGraph();
            }
        }
        private IUriNode? SegmentToERA(Curve3D curve3D)
        {
           if(curve3D is Line3D line)
           {
                return Line3DToERA(line);
           }
           else if(curve3D is Arc3D arc)
           {
                return Arc3DToERA(arc);
           }
            return null;
        }
        private IUriNode  Line3DToERA(Line3D line3D)
        {
            var pos = track.Geometry.Pos(line3D);
            var azimuth = track.Geometry.Azimuth(line3D);
            HorizontalLine horizontalLine = new HorizontalLine(graph, pos, azimuth);
            return horizontalLine.RegisterToGraph();
        }
        private IUriNode Arc3DToERA(Arc3D arc3D)
        {
            var pos = track.Geometry.Pos(arc3D);
            var azimuth = track.Geometry.Azimuth(arc3D);
            HorizontalArc horizontalArc = new HorizontalArc(graph, pos, azimuth, arc3D.Radius);
            return horizontalArc.RegisterToGraph();
        }
    }
}
