using Rail;
using Rail.Concepts;
using RailTool.Services.DataLoading;

namespace RailTool.Services.Validation
{
    public class EngineeringValidationService
    {
        RailModel _railModel { get; set; }
        public EngineeringValidationService(RailModelState railModelState) { 
           this._railModel = railModelState.Current;
        }

        public bool Validate(TrackObject trackObject)
        {
            if(trackObject is AxleCounter axleCounter)
            {
                return axleCounter.DistancetoSwitch();
            }

            return true;
        }
        
    }
}
