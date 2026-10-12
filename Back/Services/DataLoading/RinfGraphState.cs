using VDS.RDF;

namespace RailTool.Services.DataLoading;

public class RinfGraphState
{
    public IGraph? Graph { get; set; }

    public DateTime? ImportedAtUtc { get; set; }

    public int TripleCount => Graph?.Triples.Count ?? 0;
}