using Rail.Concepts;

namespace RailTool.Services
{
    public class AssetsHandlerService
    {
        public void AssignToTrack(Asset asset, Rail.RailModel railModel)
        {
            var nearestTrack = railModel.Tracks.OrderBy(t => (t, t.PolyLine.DistanceTo(new Rhino.Geometry.Point3d() { X = asset.X, Y=asset.Y}))).FirstOrDefault();
            if (nearestTrack != null) {
                var axle = new AxleCounter(railModel, new Rhino.Geometry.Point3d(asset.X, asset.Y, 0), asset.Id); // change according to asset type.
                railModel.RailModelObjects.Add(axle);
                nearestTrack.TrackObjects.Add(axle);
            }
        }
    }
    public class Asset
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public double X { get; set; }
        public double Y { get; set; }
    }
}
