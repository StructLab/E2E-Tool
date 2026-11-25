using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;
using Newtonsoft.Json.Bson;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using VDS.RDF.Query.Expressions.Functions.XPath.String;

namespace Model.Rail.Concepts
{
    public class TVPS (RailModel railModel)
    {
        public List<AxleCounter> AxleCounters { get; set; } = new List<AxleCounter>();
        public List<(Track, double)> Sections { get; set; }
        public void CreateSections()
        {
            if(AxleCounters.Count == 2)
            {
                AxleCounters = AxleCounters.OrderBy(x => x.OffsetOnTrack).ToList();

                var axleA = AxleCounters[0];
                var axleB = AxleCounters[1];

                Sections = new List<(Track, double)>()
                {
                    (axleA.Track,axleA.OffsetOnTrack),
                    (axleB.Track,axleB.OffsetOnTrack),
                };
            }
        }
    }
}
