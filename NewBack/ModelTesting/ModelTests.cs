using Model.DxfToModel;

namespace ModelTesting
{
    public class ModelTests
    {
        [Fact]
        public void Tracks()
        {
            var filePath = @"C:\\Users\\k7ada\\OneDrive - Lawcon Consulting Ltd\\E2E Tool\\E2E-Tool\\NewBack\\Model\\Data\\Sample.dxf";
            DxfToModelConverter dxfToModelConverter = new DxfToModelConverter(filePath);

            
        }
    }
}