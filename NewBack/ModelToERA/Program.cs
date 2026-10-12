// See https://aka.ms/new-console-template for more information
using GeoModel.Geometry;
using GeoModel.Rail;
using ModelToERA;
using ModelToERA.ERAontology;
using ModelToERA.ToERA;


var p1 = new Point3d(0, 0, 0);
var p2 = new Point3d(500, 500, 0);

var line = new Line3D(p1, p2);

var poly = new PolyLine3D();

poly.Add(line);

Track track = new Track("1", poly);

OntologyGraph ontologyGraph = new OntologyGraph();

new TrackToERA(ontologyGraph,track).ToERA();


var graph = OntologyGraph.LoadGraph("C:\\Users\\k7ada\\Downloads\\ModelRailway.ttl");

ontologyGraph.G = graph;

ConverterToModel converterToModel = new ConverterToModel(ontologyGraph);
converterToModel.Tracks();
converterToModel.Switches();


Console.WriteLine("Hello, World!");