using DXFhandler.Extensions;
using Geometry;
using netDxf;
using Rail;
using System.Xml.Linq;

namespace RailTool.Services.DataLoading
{
    public class DxfDataLoaderService : IDataLoader
    {

        public RailModel Load(string dxfFile)
        {
            var dxfDoc = DXFhandler.Read.Reader.ReadFile(dxfFile);

            var tracksPolys = LoadTracks(dxfDoc);
            var objects = LoadSwitches(dxfDoc);

            RailModel railModel = new RailModel(tracksPolys, objects, null, null, tds: false, completeTracks: false);

            return railModel;

        }
        private List<PolyLine> LoadTracks(DxfDocument dxfDoc)
        {
            var polys = dxfDoc.Entities.Polylines2D.Select(x => x.ToPolyLine()).ToList();
            var tracksPolys = polys.Where(x => x.Layer.Equals("Tracks")).OfType<PolyLine>().ToList();

            return tracksPolys;
        }
        private List<RailObjectData> LoadSwitches(DxfDocument dxfDoc)
        {
            var switches = dxfDoc.Entities.Inserts.Where(x => x.Block.Name.Equals("Switch"))
               .Select(x =>
               {
                   var name = x.Attributes.FirstOrDefault(x => x.Tag.ToLower().Equals("name"))?.Value ?? string.Empty;
                   return new RailObjectData()
                   {
                       Position = x.Position.ToPoint3d(),
                       Type = typeof(Rail.Concepts.Switch),
                       Name = name,
                   };
               })
               .ToList();

            return switches;
        }
    }
}
