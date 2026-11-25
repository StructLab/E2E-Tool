using GeoModel.Geometry;
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using Model.Helpers;
using Model.Rail.TrackObjects;
using ModelToTtl;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF;

namespace Model.ModelToTtl.GeometryToTtl
{
    public class TrackToTtl(TTLGraph tTLGraph, Track track)
    {
        public void ToTtl()
        {
            HorizontalSegments(track);
            VerticalSegments(track);
            SampledLinearElementGeometry(track);
        }
        private IUriNode SampledLinearElementGeometry(Track track)
        {
            var slopeSamplePoints = SlopeSamplePoint(track);
            var slopeSamplePointsUris = slopeSamplePoints.Select(x => new SlopeSamplePoint(tTLGraph, (uint)x.Item1, (int)x.Item2).RegisterToGraph()).ToList();
            var sampleCantPoints = CantSamplePoint(track);
            var curveSamplePoints = CurveSamplePoint(track);
            return new SampledLinearElementGeometry(tTLGraph, track.Id, slopeSamplePointsUris, curveSamplePoints, sampleCantPoints).RegisterToGraph();
        }
        private List<IUriNode> CantSamplePoint(Track track)
        {
            List<IUriNode> nodes = new List<IUriNode>();
            foreach (var segment in track.Geometry.Segments)
            {
                var pos = (uint)(track.Geometry.Pos(segment) * track.Geometry.Length * 1000);
                var sampleCantPoint = 0;
                nodes.Add(new CantSamplePoint(tTLGraph, pos, sampleCantPoint).RegisterToGraph());
            }

            return nodes;
        }
        private List<IUriNode> CurveSamplePoint(Track track)
        {
            var nodes = new List<IUriNode>();


            foreach (var segment in track.Geometry.Segments)
            {
                var pos = track.Geometry.Pos(segment);
                var posMM = (uint)((pos * track.Geometry.Length) * 1000);
                if (segment is Line3D line)
                {
                    int r = int.MaxValue;
                    CurveSamplePoint curveSP = new CurveSamplePoint(tTLGraph, posMM, r);

                    nodes.Add(curveSP.RegisterToGraph());
                    continue;
                }

                var arc = segment as Arc3D;

                double radius = arc.Radius;


                var radiusMM = (int)((radius) * 1000);

                CurveSamplePoint curveSamplePoint = new CurveSamplePoint(tTLGraph, posMM, radiusMM);

                nodes.Add(curveSamplePoint.RegisterToGraph());
            }

            return nodes;
        }
        private List<(double pos, double elevation)> SlopeSamplePoint(Track track)
        {
            var result = new List<(double, double)>();
            var positions = track.Objects.OfType<Elevation>().OrderBy(x => x.OffsetOnTrack).Select(x => x.OffsetOnTrack).Append(1).Prepend(0).GetPairsWithOverlap(1);

            List<IUriNode> segments = new List<IUriNode>();

            foreach (var item in positions)
            {
                //var elevationA = track.Elevation(item.Item1);
                //var elevationB = track.Elevation(item.Item2);

                var elevationA = 0;
                var elevationB = 0;

                var deltaElevation = elevationB - elevationA;
                var deltaDistance = (item.Item2 - item.Item1) * track.Geometry.Length;

                double slope = 0;

                if (!double.IsNaN(deltaElevation) &&
                    !double.IsNaN(deltaDistance) &&
                    !double.IsInfinity(deltaElevation) &&
                    !double.IsInfinity(deltaDistance) &&
                    deltaDistance != 0)
                {
                    slope = (deltaElevation / deltaDistance) * 1000;
                }

                var position = (item.Item1 * track.Geometry.Length) * 1000;

                result.Add((position, slope * 10));
            }
            return result;
        }
        private List<IUriNode> VerticalSegments(Track track)
        {
            var positions = track.Objects.OfType<Elevation>().OrderBy(x => x.OffsetOnTrack).Select(x => x.OffsetOnTrack).Append(1).Prepend(0).GetPairsWithOverlap(1);

            List<IUriNode> segments = new List<IUriNode>();

            foreach (var item in positions)
            {
                //var elevationA = track.Elevation(item.Item1);
                //var elevationB = track.Elevation(item.Item2);

                //var deltaElevation = elevationB - elevationA;
                //var deltaDistance = (item.Item2 - item.Item1) * track.PolyLine.Length;

                var deltaElevation = 0;
                var deltaDistance = 0;

                double slope = 0;

                if (!double.IsNaN(deltaElevation) &&
                    !double.IsNaN(deltaDistance) &&
                    !double.IsInfinity(deltaElevation) &&
                    !double.IsInfinity(deltaDistance) &&
                    deltaDistance != 0)
                {
                    slope = (deltaElevation / deltaDistance) * 1000;
                }


                var position = (item.Item1 * track.Geometry.Length);

                VerticalLine verticalLine = new VerticalLine(tTLGraph, position, slope);

                VerticalSegment verticalSegment = new VerticalSegment(tTLGraph, verticalLine.RegisterToGraph());

                segments.Add(verticalSegment.RegisterToGraph());
            }
            return segments;
        }
        private List<IUriNode> HorizontalSegments(Track track)
        {
            return track.Geometry.Segments.Select(s =>
            {
                IUriNode? id = null;
                if (s is Line3D line)
                {
                    id = HorizontalLine(line, track);
                    HorizontalSegment horizontalSegment = new HorizontalSegment(tTLGraph, horizontalSegmentLine: id);
                    return horizontalSegment.RegisterToGraph();
                }

                if (s is Arc3D arc)
                {
                    id = HorizontalArc(arc, track);
                    HorizontalSegment horizontalSegment = new HorizontalSegment(tTLGraph, horizontalSegmentArc: id);
                    return horizontalSegment.RegisterToGraph();
                }
                return id ?? new UriNode(new Uri(string.Empty));

            }).ToList();
        }
        private IUriNode HorizontalLine(Line3D line, Track track)
        {
            var pos = track.Geometry.Pos(line);
            var azimuth = 0;
            HorizontalLine horizontalLine = new HorizontalLine(tTLGraph, pos, azimuth);
            return horizontalLine.RegisterToGraph();
        }
        private IUriNode HorizontalArc(Arc3D arc, Track track)
        {
            var pos = track.Geometry.Pos(arc);
            var azimuth = 0;
            var radius = arc.Radius;

            HorizontalArc horizontalArc = new HorizontalArc(tTLGraph, pos, azimuth, radius);
            return horizontalArc.RegisterToGraph();
        }
    }
}
