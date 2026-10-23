using System.Collections.Generic;
// See https://aka.ms/new-console-template for more information
using GeoModel.Geometry;
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using Model.Graph;
using Model.Rail.TrackObjects;


var p1 = new Point3d(0, 0, 0);
var p2 = new Point3d(500, 500, 0);
var p3 = new Point3d(1000, 500, 0);
var p4 = new Point3d(1500, 0, 0);


var p6 = new Point3d(3000, 0, 0);
var p7 = new Point3d(3000, 3000, 0);

var line = new Line3D(p1, p2);

var arc = new Arc3D(
    p2,
    p3,
    456.2589
);

var line2 = new Line3D(p4, p3);





var poly = new PolyLine3D();

poly.Add(line);
poly.Add(arc);
poly.Add(line2);
poly.Chain();




RailModel railModel = new RailModel();

Track track = new Track("1", poly);


railModel.AddTrack(track);



AxleCounter axleCounter = new AxleCounter("a", new Point3d(0, 500, 0), 180, railModel);


axleCounter.MoveTo(new Point3d(0, 1000, 0), railModel);

var graph = GraphHelper.CreateGraph(railModel.Tracks);
var line3 = new Line3D(p4, p6);
var line4 = new Line3D(p4, p7);

var poly2 = new PolyLine3D();
poly2.Add(line3);
poly2.Chain();

var poly3 = new PolyLine3D();
poly3.Add(line4);
poly3.Chain();

Track track2 = new Track("2", poly2);
Track track3 = new Track("3", poly3);

railModel.AddTrack(track2);
railModel.AddTrack(track3);


AxleCounter axleCounter2 = new AxleCounter("b", new Point3d(2000, 0, 0), 180, railModel);
GraphHelper.AddTrackToGraph(graph, track2);
GraphHelper.AddTrackObjectToGraph(graph,axleCounter2);

Switch @switch = new Model.Rail.TrackObjects.Switch(p4);

var path1 = graph.ShortestPathBFS(axleCounter, axleCounter2);
var path2 = graph.ShortestPathBFS(axleCounter,axleCounter2);


// ---- Transition curves: create every kind with the same inputs, call the same functions ----
var transitionStart = new Point3d(0, 0, 100);
var transitionEnd = new Point3d(1.666369, 99.975003, 101);
double transitionLength = 100;
double transitionAzimuth = 0;
double transitionRadius = 0;          // 0 = straight at the start
double transitionNextRadius = 1000;   // radius of the next segment

var curves = new List<TransitionCurve3D>();
var curveNames = new List<string>();

curves.Add(new ClothoidCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius));
curveNames.Add("Clothoid");

curves.Add(new CosineCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius));
curveNames.Add("Cosine");

curves.Add(new SineCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius));
curveNames.Add("Sine");

curves.Add(new BlossCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius));
curveNames.Add("Bloss");

curves.Add(new CubicParabolaCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius));
curveNames.Add("Cubic parabola");

curves.Add(new BiquadraticParabolaCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius));
curveNames.Add("Biquadratic parabola");

// Wiener Bogen also needs the cant at the start and at the end (mm) and the centre of gravity height (m).
// 0 mm -> 150 mm and 1.8 m are example values, to be confirmed.
curves.Add(new WienerBogenCurve3D(transitionStart, transitionEnd, transitionLength, transitionAzimuth, transitionRadius, transitionNextRadius, 0, 150, 1.8));
curveNames.Add("Wiener Bogen");

double distance = 50;   // how far along the transition we ask (0 ... length)

// A point beside the track: 3 m to the right of the middle of the transition.
var testPoint = new Point3d(3, 50, 100.5);

for (int i = 0; i < curves.Count; i++)
{
    PrintTransition(curveNames[i], curves[i], distance);
    PrintClosestPoint(curves[i], testPoint);
}

// Reverse: the same clothoid driven backwards. The old curve at 25 m is the reversed curve at 75 m.
Curve3D reversedClothoid = curves[0].Reverse();
Point3d oldAt25 = curves[0].PointAt(25);
Point3d reversedAt75 = reversedClothoid.PointAt(75);
Console.WriteLine("--- Reverse (clothoid) ---");
Console.WriteLine("old curve at 25 m:      x = " + oldAt25.X + ", y = " + oldAt25.Y);
Console.WriteLine("reversed curve at 75 m: x = " + reversedAt75.X + ", y = " + reversedAt75.Y);

void PrintClosestPoint(TransitionCurve3D curve, Point3d somePoint)
{
    var closest = curve.FindClosestPoint(somePoint);

    Console.WriteLine("closest point to (" + somePoint.X + ", " + somePoint.Y + "): x = " + closest.Point.X + ", y = " + closest.Point.Y);
    Console.WriteLine("  distance from the curve = " + closest.Distance + " m, distance along the curve = " + closest.DistanceAlongCurve + " m");
}

void PrintTransition(string name, TransitionCurve3D curve, double distanceAlong)
{
    Point3d position = curve.PointAt(distanceAlong);
    Point3d tangent = curve.TangentAt(distanceAlong);

    Console.WriteLine("--- " + name + " (distance " + distanceAlong + ") ---");
    Console.WriteLine("position: x = " + position.X + ", y = " + position.Y + ", z = " + position.Z);
    Console.WriteLine("tangent:  x = " + tangent.X + ", y = " + tangent.Y + ", z = " + tangent.Z);
    Console.WriteLine("end azimuth = " + curve.EndAzimuthDegrees + " degrees, end gap = " + curve.EndGapMeters + " m");
}


Console.WriteLine("Hello, World!");