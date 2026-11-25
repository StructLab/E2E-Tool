using GeoModel.Rail;
using Model.DxfToModel.DxfToGeometry;
using netDxf;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.DxfToModel
{
    public class DxfToModelConverter
    {
        public DxfDocument DxfDocument { get; set; }
        public RailModel RailModel { get; set; } = new RailModel();

        public DxfToModelConverter(string dxfFilePath)
        {
            DxfDocument = netDxf.DxfDocument.Load(dxfFilePath);
            Convert();
        }

        public void Convert()
        {
            var polylines = DxfDocument.Entities.Polylines2D.Where(x => x.Layer.Name.ToLower().StartsWith("track"));
            var switches = DxfDocument.Entities.Inserts.Where(x => x.Block.Name.ToLower().StartsWith("switch"));
            var signals = DxfDocument.Entities.Inserts.Where(x => x.Block.Name.ToLower().StartsWith("signal"));
            var axleCounters = DxfDocument.Entities.Inserts.Where(x => x.Block.Name.ToLower().StartsWith("axlecounter"));
            var baliseGroups = DxfDocument.Entities.Inserts.Where(x => x.Block.Name.ToLower().StartsWith("datapoint"));


            var tracks = polylines.Select(x => x.ToPolyline()).Select(x=>new Track(string.Empty,x)).ToList();

            tracks.ForEach(x => RailModel.AddTrack(x));

            var ss = switches.Select(x => x.ToSwitch(RailModel)).ToList();
            signals.Select(x => x.ToSignal(RailModel));
            var axleCountersObjects = axleCounters.Select(x => x.ToAxleCounter(RailModel)).ToList();
            baliseGroups.Select(x => x.ToBaliseGroup(RailModel));


            axleCountersObjects.ForEach(x => x.CreateTVPS(RailModel));
            ss.ForEach(x => x.CreateTVPS());

            RailModel.BuildTrackGraph();

            RailModel.TVPS.ForEach(x => x.CreateSections());

        }
    }
}
