using CCSTMSturtle.RDF;
using DXFtoTTL.TTLs;
using Geometry;
using Microsoft.AspNetCore.Mvc;
using Rail;
using Rail.Concepts;
using Rail.Engineering;
using RailTool.Services.DataLoading;
using RailTool.Services.DataLoading.Rinf.Sparql;
using RailTool.Services.Validation;
using RDF.RailToRDF;
using Rhino.DocObjects;
using Rhino.Geometry;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using VDS.RDF;
using VDS.RDF.Writing;
using Switch = Rail.Concepts.Switch;

namespace RailTool.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class DataController(ILogger<DataController> logger, DataService dataService, RailModelState railModelState, IGraph graph, EngineeringValidationService engineeringValidationService,
    RdfToTtlNormalizationService rdfNormalizationService, IWebHostEnvironment environment) : ControllerBase
    {
        private static string FilePath { get; set; }
        private static TDScreator TDScreator { get; set; } = new TDScreator();
        private static readonly string shaclUrl = "https://www.itb.ec.europa.eu/shacl/ccstms/api/validate";
        [HttpPost("/upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile(
        IFormFile file,
        [FromServices] IWebHostEnvironment environment)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file was uploaded.");

            string uploadFolder = Path.Combine(
                environment.ContentRootPath,
                "Uploads"
            );

            Directory.CreateDirectory(uploadFolder);

            string fileName = Path.GetFileName(file.FileName);
            FilePath = Path.Combine(uploadFolder, fileName);

            // Save current uploaded file
            await using (var stream = new FileStream(FilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Pass the current file directly
            

            return GetTracksTrial();
        }
        
        [HttpPut("/clean")]
        public async Task<IActionResult> CleanData()
        {
            railModelState.Current.Tracks.Clear();
            railModelState.Current.RailModelObjects.OfType<Switch>().ToList().Clear();
            railModelState.Graph = null;
            FilePath = string.Empty;
            return Ok();
        }
        [HttpPut("/add/track")]
        public IActionResult AddTrack(string id,double x1, double y1, double x2, double y2)
        {
            var segments = new List<ISegment>() { new Geometry.Line(new Point3d(x1, y1, 0), new Point3d(x2, y2, 0)) };

            railModelState.Current.Tracks.Add(new Track(railModelState.Current,new Geometry.PolyLine(segments)));

            return Ok();
        }
        [HttpPut("/add/switch")]
        public IActionResult AddSwitch(string id, double x1, double y1)
        {
            var s = new Switch(railModelState.Current,new Point3d(x1,y1,0),"", switchType: SwitchType.normal,operation:Operation.fern);

            railModelState.Current.RailModelObjects.Add(s);

            return Ok();
        }
        [HttpGet("/tracks")]
        public IActionResult GetTracksTrial()
        {

            if (string.IsNullOrEmpty(FilePath))
                return BadRequest("No uploaded file found.");

            RDF.TTLreader tTLreader = new RDF.TTLreader();

            var railmodel = tTLreader.Read(FilePath);

            railModelState.Set(railmodel, tTLreader.Graph);

            return Ok(
                railModelState.Current.Tracks.Select(track => new
                {
                    Id = track.Id ?? string.Empty,
                    Points = track.PolyLine
                        .Sample(100)
                        .Select(p => new double[] { p.X, p.Y })
                        .ToList()
                }).ToList()
            );
        }
        [HttpGet("/switches")]
        public IActionResult GetSwitches()
        {
            if (railModelState.Current == null) return Ok();

            var switches = railModelState.Current.RailModelObjects
                .OfType<Rail.Concepts.Switch>();

            if (switches.Count() == 0) return Ok();
            var switchesPoints = switches.Select(s =>
                {
                    return new
                    {
                        Type = "Switch",
                        s.Name,
                        Points = s.SwitchPoints(20)
                    };
                });
                

            return Ok(switchesPoints);
        }
        [HttpGet("/axleCounters")]
        public IActionResult GetAxleCounters()
        {
            var axleCountersPoints = railModelState.Current.RailModelObjects
                .OfType<AxleCounter>()
                .Select(axle => new
                {
                    Type = "AxleCounter",
                    axle.Id,
                    axle.Position.X,
                    axle.Position.Y,
                    Rotation = axle.GetRotation()
                })
                .ToList();

            return Ok(axleCountersPoints);
        }
        [HttpGet("/etcsMarkers")]
        public IActionResult GetEtcsMarkers()
        {
            var etcsMarkers = railModelState.Current.RailModelObjects
                .ToList() // snapshot
                .OfType<Signal>()
                .Where(x => x.SignalType == SignalType.ETCSstopMarker)
                .Select(signal => new
                {
                    Type = "ETCSmarker",
                    signal.Id,
                    X = signal.Position.X,
                    Y = signal.Position.Y,
                    Rotation = signal.GetRotation()
                })
                .ToList();

            return Ok(etcsMarkers);
        }
        [HttpGet("/balsieGroups")]
        public IActionResult GetBaliseGroups()
        {
            var baliseGroups = railModelState.Current.RailModelObjects
            .OfType<DatenPunkt>()
            .Select(axle => new
            {
                Type = "BaliseGroup",
                axle.Id,
                axle.Position.X,
                axle.Position.Y,
                Rotation = axle.GetRotation()
            })
                .ToList();

            return Ok(baliseGroups);
        }
        [HttpGet("/bufferStops")]
        public IActionResult GetBufferStops()
        {
            var baliseGroups = railModelState.Current.RailModelObjects
            .OfType<Rail.Concepts.BufferStop>()
            .Select(axle => new
            {
                Type = "BufferStop",
                axle.Id,
                axle.Position.X,
                axle.Position.Y,
                Rotation = axle.GetRotation()
            })
                .ToList();

            return Ok(baliseGroups);
        }
        [HttpPut("/add/axleCounter")]
        public IActionResult Add(string id, string type = "AxleCounter", double x = 0, double y = 0)
        {
            Assembly railAssembly = Assembly.Load("Rail");
            Type? targetType = railAssembly.GetType($"Rail.Concepts.{type}");

            if (targetType == null) return Ok();

            if (targetType != null)
            {
                // Constructor parameters
                object[] constructorParams = { railModelState.Current,
                new Point3d(x, y, 0),
                "",
                "",
                "" };
                AxleCounter? instance = Activator.CreateInstance(targetType, constructorParams) as AxleCounter;
               
                if (instance != null)
                {
                    railModelState.Current?.AddObject(instance);
                    instance.Id = id;
                    railModelState.Current.TDSwithinTracks();
                    TDScreator.Create(railModelState.Current);
                   
                    instance.ToRDF(railModelState.Graph, railModelState.Current);
                    var rotation = instance.GetRotation();
             
                    return Ok(new
                    {
                        position = instance.Position,
                        rotation = rotation
                    });
                }
            }
            else
            {
                Console.WriteLine("Type not found!");
            }

            return Ok();
        }
        [HttpPut("/add/etcsMarker")]
        public IActionResult AddEtcsMarker(string id, string type = "Signal", double x = 0, double y = 0)
        {
            Assembly railAssembly = Assembly.Load("Rail");
            Type? targetType = railAssembly.GetType($"Rail.Concepts.Signal");

            if (targetType == null) return Ok();

            if (targetType != null)
            {
                // Constructor parameters
                object[] constructorParams =
                {
                    railModelState.Current,
                    new Point3d(x, y, 0),
                    0.0,
                    "",
                    Rail.Concepts.SignalType.ETCSstopMarker,
                    null,
                    null
                };
                Signal? instance = Activator.CreateInstance(targetType, constructorParams) as Signal;

                if (instance != null)
                {
                    railModelState.Current?.AddObject(instance);
                    instance.Id = id;
                    instance.ToRDF(railModelState.Graph);
                    var rotation = instance.GetRotation();
                    return Ok(new
                    {
                        position = instance.Position,
                        rotation = rotation
                    });
                }
            }
            else
            {
                Console.WriteLine("Type not found!");
            }

            return Ok();
        }
        [HttpPut("/delete")]
        public IActionResult Delete(string id)
        {
            var targetObject = railModelState.Current?.RailModelObjects.OfType<TrackObject>().FirstOrDefault(x => x.Id?.Equals(id)??false);

            if (targetObject != null) targetObject.Delete();

            return Ok(new
            {
                success = true,
                message = "Object deleted successfully"
            });
        }
        [HttpPut("/move")]
        public IActionResult Move(string id, double x , double y)
        {
            var railObject = railModelState.Current?.RailModelObjects.OfType<TrackObject>().FirstOrDefault(x => x.Id?.Equals(id) ?? false);
            if (railObject == null|| railModelState == null) return Ok();
            railObject.Position = new Point3d(x, y, railObject.Position.Z);
            var rotation = railObject.GetRotation();
            return Ok(new
            {
                position = railObject.Position,
                rotation = rotation
            });
        }
        [HttpPut("/rotate")]
        public IActionResult Rotate(string id, double rotation)
        {
            var railObject = railModelState.Current?.RailModelObjects.OfType<TrackObject>().FirstOrDefault(x => x.Id?.Equals(id) ?? false);
            if (railObject == null || railModelState == null) return Ok();
            railObject.Rotation = rotation;

            return Ok(new
            {
                position = railObject.Position,
                rotation = rotation
            });
        }
        [HttpPut("/engineer")]
        public IActionResult Engineer()
        {
            if (railModelState.Current.RailModelObjects.OfType<DatenPunkt>().Count() > 0)
            {
                return Ok(false);
            }
            if (railModelState.Graph == null) {
                railModelState.Graph = new RDF.TTLGraph(string.Empty);
                TTLconverter tTLconverter = new TTLconverter(railModelState.Current, railModelState.Graph,string.Empty,Directory.GetCurrentDirectory(),string.Empty);
                tTLconverter.ConvertDXFtoTTL("trial");
            }

            Engineer engineer = new Engineer(railModelState.Current);
            engineer.AxleCounters(38).OfType<AxleCounter>().ToList();

            var etcsMarkers = engineer.EtcsMarkers().OfType<Signal>().ToList();
            etcsMarkers.ForEach(x => x.ToRDF(railModelState.Graph));

            railModelState.Current.TDSwithinTracks();

            TDScreator tDScreator = new TDScreator();
            tDScreator.Create(railModelState.Current);
            railModelState.Current.TrackDetectionSystems.ForEach(x => x.ToRDF(railModelState.Graph, railModelState.Current));
            var groups = engineer.BaliseGroups().OfType<DatenPunkt>().ToList();
            //for (int i = 0; i < groups.Count; i++)
            //{
            //    var etcsMaker = groups[i].Track.TrackObjects.Where(x => x is Signal sig && sig.SignalType == SignalType.ETCSstopMarker && etcsMarkers.Contains(x)).OfType<Signal>().OrderBy(x => Math.Abs(x.Pos() - groups[i].Pos())).FirstOrDefault();
            //    groups[i].ToRDF((uint)i + 1, etcsMaker.Id ?? string.Empty, railModelState.Graph);
            //}

            return Ok(true);
        }
        [HttpPut("/export")]
        public async Task<IActionResult> Export()
        {
            if (railModelState.Graph == null ||
                railModelState.Graph.G.Triples.Count == 0)
            {
                return BadRequest(
                    "There is no RDF data available to export."
                );
            }

            // Validate() returns the Turtle content
            var validationResult = await Validate();

            if (validationResult is not OkObjectResult okResult)
            {
                return validationResult;
            }

            var ttlContent = okResult.Value as string;

            if (string.IsNullOrEmpty(ttlContent))
            {
                return BadRequest("No Turtle content available.");
            }

            // Return the Turtle file
            var bytes = Encoding.UTF8.GetBytes(ttlContent);

            return File(
                bytes,
                "text/turtle",
                "ModelRailway.ttl"
            );
        }
        [HttpPut("/validate/engineering/{id}")]
        public async Task<IActionResult> ValidateEngineering(string id)
        {
            EngineeringValidationService engineeringValidationService1 = new EngineeringValidationService(railModelState);
            var railObject = railModelState.Current?.RailModelObjects.OfType<TrackObject>().FirstOrDefault(x => x.Id?.Equals(id) ?? false);

           if (!engineeringValidationService1.Validate(railObject))
               return Ok(false);
           

            return Ok(true);
        }
        [HttpPut("/validate")]
        public async Task<IActionResult> Validate()
        {
            if(railModelState.Graph is null) return Ok(false);
            var stringWriter = new System.IO.StringWriter();
            var ttlWriter = new CompressingTurtleWriter();
            ttlWriter.Save(railModelState.Graph.G, stringWriter);
            string ttlContent = stringWriter.ToString();

            //return Ok(await ValidateTurtleAsync(ttlContent));
            return Ok(ttlContent);
        }
        [HttpPost("/queryRinf")]
        public async Task<IActionResult> QueryRinf([FromBody] string? query, string? baliseGroupId)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest("query is required");
            using var client = new HttpClient();

            var balisegroup = railModelState.Current.RailModelObjects.OfType<DatenPunkt>().FirstOrDefault(x => x.Id.Equals(baliseGroupId));

            if(balisegroup == null && string.IsNullOrWhiteSpace(query))
            {
                return Ok(new { });
            }
            if(balisegroup != null)
            {
                query = $"PREFIX era: <http://data.europa.eu>\nSELECT ?p ?o\nWHERE {{\n    <http://data.europa.eu/949/track/{balisegroup.Track.Id}> ?p ?o .\n}}";
            }
           if(string.IsNullOrWhiteSpace(query))
            {
                query = $"PREFIX era: <http://data.europa.eu>\nSELECT ?p ?o\nWHERE {{\n    <http://data.europa.eu/949/track/> ?p ?o .\n}}";
            }

            var request = new HttpRequestMessage(HttpMethod.Post, "https://rinf.data.era.europa.eu/api/v1/sparql/rinf");

            request.Content = new StringContent(query, Encoding.UTF8, "application/sparql-query");
            request.Headers.Add("Accept", "application/sparql-results+json");

            var response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode,
                    await response.Content.ReadAsStringAsync());
            }

            var json = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);

            var model = SparqlResponse.FromJson(json);
            var data = model.ToDictionary();
            var telegram = Telegram(balisegroup, json);

            return Ok(new { balisegroup?.Track.Id,json, telegram });

            return Ok(new { });
        }
        [HttpPost("/telegram")]
        public object Telegram(DatenPunkt datenPunkt, string jsonQuery)
        {

            var model = SparqlResponse.FromJson(jsonQuery);
            var data = model.ToDictionary();

            

            var nid_tsr = 1;
            var l_tsr = datenPunkt?.Track?.PolyLine?.Length??0;
            var d_tsr = 0;
            var q_front = false;
            var v_tsr_text = data.ContainsKey("http://data.europa.eu/949/maximumPermittedSpeed") == true? data["http://data.europa.eu/949/maximumPermittedSpeed"].FirstOrDefault():"60";
            if (datenPunkt == null && !data.ContainsKey("http://data.europa.eu/949/maximumPermittedSpeed")) v_tsr_text = "0";

            var v_start= double.Parse(v_tsr_text);
            return new { nid_tsr, l_tsr, d_tsr, q_front, v_start };
        }
        public static async Task<bool> ValidateTurtleAsync(string ttlContent)
        {
            using var client = new HttpClient();
        
            // Build payload
            var payload = new
            {
                contentToValidate = ttlContent,
                embeddingMethod = "STRING",
                contentSyntax = "text/turtle",
                validationType = "infra.v1.3",
                reportSyntax = "application/rdf+xml",
                locale = "en"
            };
        
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
        
            // Send POST request
            var response = await client.PostAsync(shaclUrl, content);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"SHACL validation failed: {response.StatusCode} {response.ReasonPhrase}");
            }
        
            // Read response as string
            var responseString = await response.Content.ReadAsStringAsync();
            XDocument doc = XDocument.Parse(responseString);
        
            // Define SH namespace
            XNamespace sh = "http://www.w3.org/ns/shacl#";
        
            // Get the value of sh:conforms
            var conformsElement = doc.Root.Descendants(sh + "conforms").FirstOrDefault();
            if (conformsElement != null)
            {
                bool conforms = bool.Parse(conformsElement.Value);
        
                return conforms;
                Console.WriteLine($"SHACL conforms: {conforms}");
            }
            return false;
        }
        }
}
