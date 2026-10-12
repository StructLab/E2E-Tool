using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Model.Helpers
{
    public static class Helper
    {
        public static List<(T, T)> GetPairsWithOverlap<T>(this IEnumerable<T> list, int overlap)
        {
            if (overlap < 1)
                throw new ArgumentException("Overlap must be at least 1.", nameof(overlap));

            // Bundle into pairs with specified overlap
            var pairs = list
                .Select((value, index) => new { value, index })
                .Where(x => x.index + overlap < list.Count())
                .Select(x => (x.value, list.ElementAt(x.index + overlap)))
                .ToList();

            return pairs;
        }
    }
}
