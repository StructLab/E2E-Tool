using System.Text.Json;

namespace RailTool.Services.DataLoading;

public class OsmGeoJsonLoaderService
{
    public async Task<OsmRailwayData> LoadAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException(
                "The OSM GeoJSON file is empty.",
                nameof(file));
        }

        await using var stream = file.OpenReadStream();

        using var document = await JsonDocument.ParseAsync(
            stream,
            cancellationToken: cancellationToken);

        var root = document.RootElement;

        if (!root.TryGetProperty("features", out var features) ||
            features.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidDataException(
                "The uploaded file is not a valid GeoJSON FeatureCollection.");
        }

        var railwayPoints = new List<OsmRailwayPoint>();
        var railwayLines = new List<OsmRailwayLine>();

        foreach (var feature in features.EnumerateArray())
        {
            if (!feature.TryGetProperty(
                    "geometry",
                    out var geometry) ||
                geometry.ValueKind == JsonValueKind.Null)
            {
                continue;
            }

            var properties =
                feature.TryGetProperty(
                    "properties",
                    out var propertiesElement)
                    ? propertiesElement
                    : default;

            var featureId = GetStringProperty(
                feature,
                "id");

            var geometryType = GetStringProperty(
                geometry,
                "type");

            if (geometryType == "Point")
            {
                var railwayType = GetStringProperty(
                    properties,
                    "railway");

                if (railwayType is not
                    ("station" or "halt" or "junction"))
                {
                    continue;
                }

                if (!geometry.TryGetProperty(
                        "coordinates",
                        out var coordinates) ||
                    coordinates.GetArrayLength() < 2)
                {
                    continue;
                }

                railwayPoints.Add(new OsmRailwayPoint
                {
                    Id = featureId,
                    Name =
                        GetStringProperty(properties, "name") ??
                        GetStringProperty(properties, "uic_name") ??
                        GetStringProperty(
                            properties,
                            "official_name") ??
                        string.Empty,

                    RailwayType = railwayType,
                    RailwayReference =
                        GetStringProperty(
                            properties,
                            "railway:ref"),

                    IbnrReference =
                        GetStringProperty(
                            properties,
                            "ref:ibnr"),

                    StationReference =
                        GetStringProperty(
                            properties,
                            "ref:station"),

                    Longitude = coordinates[0].GetDouble(),
                    Latitude = coordinates[1].GetDouble()
                });
            }
            else if (geometryType == "LineString")
            {
                if (!geometry.TryGetProperty(
                        "coordinates",
                        out var coordinates))
                {
                    continue;
                }

                var points = coordinates
                    .EnumerateArray()
                    .Where(value =>
                        value.ValueKind ==
                        JsonValueKind.Array &&
                        value.GetArrayLength() >= 2)
                    .Select(value => new OsmCoordinate
                    {
                        Longitude = value[0].GetDouble(),
                        Latitude = value[1].GetDouble()
                    })
                    .ToList();

                if (points.Count < 2)
                {
                    continue;
                }

                railwayLines.Add(new OsmRailwayLine
                {
                    Id = featureId,
                    Name = GetStringProperty(
                        properties,
                        "name"),
                    RailwayReference = GetStringProperty(
                        properties,
                        "railway:ref"),
                    Points = points
                });
            }
        }

        return new OsmRailwayData
        {
            Points = railwayPoints,
            Lines = railwayLines
        };
    }

    private static string? GetStringProperty(
        JsonElement element,
        string propertyName)
    {
        if (element.ValueKind != JsonValueKind.Object ||
            !element.TryGetProperty(
                propertyName,
                out var property))
        {
            return null;
        }

        return property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : property.ToString();
    }
}

public class OsmRailwayData
{
    public IReadOnlyList<OsmRailwayPoint> Points { get; init; } =
        Array.Empty<OsmRailwayPoint>();

    public IReadOnlyList<OsmRailwayLine> Lines { get; init; } =
        Array.Empty<OsmRailwayLine>();
}

public class OsmRailwayPoint
{
    public string? Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string? RailwayType { get; init; }

    public string? RailwayReference { get; init; }

    public string? IbnrReference { get; init; }

    public string? StationReference { get; init; }

    public double Longitude { get; init; }

    public double Latitude { get; init; }
}

public class OsmRailwayLine
{
    public string? Id { get; init; }

    public string? Name { get; init; }

    public string? RailwayReference { get; init; }

    public IReadOnlyList<OsmCoordinate> Points { get; init; } =
        Array.Empty<OsmCoordinate>();
}

public class OsmCoordinate
{
    public double Longitude { get; init; }

    public double Latitude { get; init; }
}