namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Sine transition (also called sinusoidal): the curvature follows t - sin(2 pi t) / (2 pi).
    /// Shape: shape(t) = t - sin(2 * pi * t) / (2 * pi).
    /// </summary>
    public class SineCurve3D : TransitionCurve3D
    {
        public SineCurve3D(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
            : base(start, end, length, azimuth, radius, nextRadius)
        {
        }

        /// <summary>Area under shape(t) = t - sin(2 pi t) / (2 pi) from 0 to t.</summary>
        protected override double ShapeIntegral(double t)
        {
            double twoPi = 2.0 * Math.PI;
            return t * t / 2.0 + (Math.Cos(twoPi * t) - 1.0) / (twoPi * twoPi);
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
        {
            return new SineCurve3D(start, end, length, azimuth, radius, nextRadius);
        }
    }
}
