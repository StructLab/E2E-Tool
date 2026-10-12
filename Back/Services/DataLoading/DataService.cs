using Geometry;

namespace RailTool.Services.DataLoading
{
    public class DataService
    {
        public IDataLoader _dataLoader { get; set; }
        public DataService(IDataLoader dataLoader)
        {
            _dataLoader = dataLoader;
        }
    }
}
