namespace RailTool.Services.DataLoading
{
    public interface IDataLoader
    {
        public Rail.RailModel Load(string filePath);
    }
}
