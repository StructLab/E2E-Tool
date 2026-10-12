using System.IO.Compression;
using VDS.RDF;
using VDS.RDF.Parsing;

namespace RailTool.Services.DataLoading
{
    public class RinfArchiveLoaderService
    {
        public async Task<RinfLoadResult> LoadArchivesAsync(
            IEnumerable<IFormFile> uploadedFiles,
            string workingDirectory)
        {
            Directory.CreateDirectory(workingDirectory);

            var mergedGraph = new Graph();
            var loadedRdfFiles = new List<string>();
            var errors = new List<string>();

            int zipCount = 0;

            foreach (var uploadedFile in uploadedFiles)
            {
                if (uploadedFile == null || uploadedFile.Length == 0)
                {
                    continue;
                }

                var safeFileName = Path.GetFileName(uploadedFile.FileName);

                var packageDirectory = Path.Combine(
                    workingDirectory,
                    $"{Path.GetFileNameWithoutExtension(safeFileName)}_{Guid.NewGuid():N}"
                );

                Directory.CreateDirectory(packageDirectory);

                var savedFilePath = Path.Combine(
                    packageDirectory,
                    safeFileName
                );

                await using (var fileStream = new FileStream(
                    savedFilePath,
                    FileMode.Create,
                    FileAccess.Write))
                {
                    await uploadedFile.CopyToAsync(fileStream);
                }

                var extension = Path.GetExtension(savedFilePath);

                if (extension.Equals(
                    ".zip",
                    StringComparison.OrdinalIgnoreCase))
                {
                    zipCount++;

                    var extractionDirectory = Path.Combine(
                        packageDirectory,
                        "extracted"
                    );

                    Directory.CreateDirectory(extractionDirectory);

                    ZipFile.ExtractToDirectory(
                        savedFilePath,
                        extractionDirectory,
                        overwriteFiles: true
                    );

                    LoadRdfFilesFromDirectory(
                        extractionDirectory,
                        mergedGraph,
                        loadedRdfFiles,
                        errors
                    );
                }
                else if (IsRdfFile(savedFilePath))
                {
                    LoadSingleRdfFile(
                        savedFilePath,
                        mergedGraph,
                        loadedRdfFiles,
                        errors
                    );
                }
            }

            return new RinfLoadResult
            {
                Graph = mergedGraph,
                ZipCount = zipCount,
                LoadedRdfFiles = loadedRdfFiles,
                Errors = errors
            };
        }

        private static void LoadRdfFilesFromDirectory(
            string directory,
            IGraph mergedGraph,
            ICollection<string> loadedRdfFiles,
            ICollection<string> errors)
        {
            var rdfFiles = Directory
                .EnumerateFiles(
                    directory,
                    "*.*",
                    SearchOption.AllDirectories)
                .Where(IsRdfFile);

            foreach (var rdfFile in rdfFiles)
            {
                LoadSingleRdfFile(
                    rdfFile,
                    mergedGraph,
                    loadedRdfFiles,
                    errors
                );
            }
        }

        private static void LoadSingleRdfFile(
            string filePath,
            IGraph mergedGraph,
            ICollection<string> loadedRdfFiles,
            ICollection<string> errors)
        {
            try
            {
                var fileGraph = new Graph();

                FileLoader.Load(fileGraph, filePath);

                mergedGraph.Merge(
                    fileGraph,
                    keepOriginalGraphUri: true
                );

                loadedRdfFiles.Add(filePath);
            }
            catch (Exception exception)
            {
                errors.Add(
                    $"{Path.GetFileName(filePath)}: {exception.Message}"
                );
            }
        }

        private static bool IsRdfFile(string filePath)
        {
            var extension = Path.GetExtension(filePath);

            return extension.Equals(
                       ".rdf",
                       StringComparison.OrdinalIgnoreCase)
                   || extension.Equals(
                       ".ttl",
                       StringComparison.OrdinalIgnoreCase)
                   || extension.Equals(
                       ".xml",
                       StringComparison.OrdinalIgnoreCase)
                   || extension.Equals(
                       ".jsonld",
                       StringComparison.OrdinalIgnoreCase);
        }
    }

    public class RinfLoadResult
    {
        public required IGraph Graph { get; init; }

        public int ZipCount { get; init; }

        public IReadOnlyCollection<string> LoadedRdfFiles { get; init; } =
            Array.Empty<string>();

        public IReadOnlyCollection<string> Errors { get; init; } =
            Array.Empty<string>();

        public int TripleCount => Graph.Triples.Count;
    }
}