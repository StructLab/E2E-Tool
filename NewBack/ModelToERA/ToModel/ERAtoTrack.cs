using AngleSharp.Dom;
using GeoModel.Geometry;
using GeoModel.Rail;
using Model.Helpers;
using ModelToERA.ERAontology;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF;
using VDS.RDF.Nodes;
using INode = VDS.RDF.INode;

namespace ToModel
{
    internal class ERAtoTrack(IGraph graph)
    {
        public Track LinearElementGeometry(IUriNode uriNode)
        {

            var id = uriNode.Uri.AbsoluteUri.Split("/").Last();

            List<Curve3D> segments = new List<Curve3D>();

            const string predicateUri = "http://data.europa.eu/949/horizontalAlignments";
           
            var linearElementGeometries = ModelToERA.ERAontology.Helper.GetPredicateListValues(graph, uriNode.Uri.AbsoluteUri, predicateUri);
            var coordinates = ModelToERA.ERAontology.Helper.GetSubjectsStartingWith(graph, uriNode.Uri.AbsoluteUri.Replace("linearElementGeometry","linearElementProjection"))
                .FirstOrDefault()?
                .GetCoordinates(graph)
                .GetPairsWithOverlap(1);


            for (int i = 0; i < linearElementGeometries.Count; i++)
            {
                var item = linearElementGeometries[i];
                const string lineUri = "http://data.europa.eu/949/horizontalSegmentLine";
                const string arcUri = "http://data.europa.eu/949/horizontalSegmentArc";

                var predicateLineValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, ((IUriNode)item).Uri.AbsoluteUri, lineUri);
                var predicateArcValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, ((IUriNode)item).Uri.AbsoluteUri, arcUri);

                if (predicateLineValue != null)
                {
                    segments.Add(Line((IUriNode)predicateLineValue, coordinates[i]));
                }
                else if (predicateArcValue != null)
                {
                    segments.Add(Arc((IUriNode)predicateArcValue, coordinates[i]));
                }
            }

            PolyLine3D poly = new PolyLine3D();

            segments.ForEach(x => poly.Add(x));
            poly.Chain();

            return new Track(id, poly);
        }
        private Curve3D Line(IUriNode uriNode, (Point3d start, Point3d end) startEnd)
        {
            const string azimuthUri = "http://data.europa.eu/949/azimuth";
            const string elementGeometryPosUri = "http://data.europa.eu/949/elementGeometryPos";

            var azimuthValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, azimuthUri).GetDoubleValue();
            var elementGeometryValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, elementGeometryPosUri).GetDoubleValue();
            var start = startEnd.start;
            var end = startEnd.end;

            Line3D line = new Line3D(start,end);

            return line;
        }
        private Curve3D Arc(IUriNode uriNode, (Point3d start, Point3d end) startEnd)
        {
            const string azimuthUri = "http://data.europa.eu/949/azimuth";
            const string elementGeometryPosUri = "http://data.europa.eu/949/elementGeometryPos";
            const string radiusUri = "http://data.europa.eu/949/radius";

            var azimuthValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, azimuthUri).GetDoubleValue();
            var elementGeometryValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, elementGeometryPosUri).GetDoubleValue();
            var radiusValue = ModelToERA.ERAontology.Helper.GetPredicateValue(graph, uriNode.Uri.AbsoluteUri, radiusUri).GetDoubleValue() ?? 0;
            var start = startEnd.start;
            var end = startEnd.end;

            Arc3D arc = new Arc3D(start, end, radiusValue);

            return arc;
        }
    }
}
