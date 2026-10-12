using Rail.Concepts;
using System.Runtime.CompilerServices;

namespace RailTool.Services.Validation
{
    public static class  AxleCounterValidation
    {
       public static bool DistancetoSwitch(this AxleCounter axleCounter)
        {
            var pos = axleCounter.Pos() * axleCounter.Track.PolyLine.Length;

            var switches = axleCounter.Track.TrackObjects.OfType<Switch>();

            foreach (var @switch in switches)
            {
                var sPos = @switch.Pos(axleCounter.Track) * axleCounter.Track.PolyLine.Length;

                if (Math.Abs(pos - sPos) < 20)
                {
                    return false;
                }
            }
            return true;
       }
    }
}
