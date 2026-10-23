namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Biquadratic parabola transition (two parts), PROVISIONAL: the definition still has to be confirmed.
    ///
    /// The curvature grows with the square of the distance in the first half and is mirrored in the second half:
    ///     first half  (t from 0 to 1/2):   shape(t) = 2 t^2
    ///     second half (t from 1/2 to 1):   shape(t) = 1 - 2 (1 - t)^2
    /// (t = distance / length.) The two halves meet at shape = 1/2 with the same slope, so the curvature has no kink.
    ///
    /// In position form the first half is y = x^4 / (6 R L^2) for x up to L/2
    /// (x along the start tangent, y sideways), which is what the tests compare with.
    /// </summary>
    public class BiquadraticParabolaCurve3D : TransitionCurve3D
    {
        public BiquadraticParabolaCurve3D(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
            : base(start, end, length, azimuth, radius, nextRadius)
        {
        }

        /// <summary>
        /// Area under the shape from 0 to t.
        ///  - first half:  integral of 2 u^2        = 2 t^3 / 3
        ///  - second half: 1/12 (area of the first half) + integral of 1 - 2 (1 - u)^2 from 1/2 to t
        ///                 = 1/12 + (t - 1/2) + (2/3) * ((1 - t)^3 - 1/8)
        /// The area of the whole shape is 1/2, like the other balanced shapes.
        /// </summary>
        protected override double ShapeIntegral(double t)
        {
            if (t <= 0.5)
            {
                return 2.0 * t * t * t / 3.0;
            }

            double rest = 1.0 - t;
            return 1.0 / 12.0 + (t - 0.5) + (2.0 / 3.0) * (rest * rest * rest - 0.125);
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
        {
            return new BiquadraticParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);
        }
    }
}
