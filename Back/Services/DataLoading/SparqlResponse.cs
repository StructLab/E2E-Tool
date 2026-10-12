namespace RailTool.Services.DataLoading
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text.Json;
    using System.Text.Json.Serialization;

    namespace Rinf.Sparql
    {
        // =========================
        // ROOT RESPONSE
        // =========================
        public class SparqlResponse
        {
            public Head head { get; set; }
            public Results results { get; set; }

            // Helper: parse JSON into object
            public static SparqlResponse FromJson(string json)
            {
                return JsonSerializer.Deserialize<SparqlResponse>(
                    json,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
            }

            // Helper: flatten RDF triples into dictionary
            public Dictionary<string, List<string>> ToDictionary()
            {
                var dict = new Dictionary<string, List<string>>();

                if (results?.bindings == null)
                    return dict;

                foreach (var b in results.bindings)
                {
                    Add(dict, b.p?.value, b.o?.value);
                }

                return dict;
            }

            private void Add(Dictionary<string, List<string>> dict, string key, string value)
            {
                if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(value))
                    return;

                if (!dict.ContainsKey(key))
                    dict[key] = new List<string>();

                dict[key].Add(value);
            }
        }

        // =========================
        // HEAD
        // =========================
        public class Head
        {
            public List<string> vars { get; set; }
        }

        // =========================
        // RESULTS
        // =========================
        public class Results
        {
            public List<Binding> bindings { get; set; }
        }

        // =========================
        // BINDING (one RDF triple row)
        // =========================
        public class Binding
        {
            public ValueWrapper p { get; set; }
            public ValueWrapper o { get; set; }
        }

        // =========================
        // RDF VALUE WRAPPER
        // =========================
        public class ValueWrapper
        {
            public string type { get; set; }
            public string value { get; set; }

            // optional for literals like "en"
            [JsonPropertyName("xml:lang")]
            public string xml_lang { get; set; }
        }
    }
}
