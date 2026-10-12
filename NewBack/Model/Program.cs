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


Console.WriteLine("Hello, World!");