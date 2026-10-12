namespace RailTool.Services.DataLoading;

public class OsmRailwayState
{
    public OsmRailwayData? Current { get; set; }

    public OsmRailwayGraph? Graph { get; set; }

    public DateTime? ImportedAtUtc { get; set; }

    public int RailwayPointCount =>
        Current?.Points.Count ?? 0;

    public int RailwayLineCount =>
        Current?.Lines.Count ?? 0;
}