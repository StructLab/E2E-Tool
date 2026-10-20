namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Cosine transition: the curvature changes slowly at both ends and fastest in the middle.
    /// Shape: shape(t) = (1 - cos(pi * t)) / 2.
    /// </summary>
    public class CosineCurve3D : TransitionCurve3D
    {
        public CosineCurve3D(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
            : base(start, end, length, startAzimuthDegrees, startRadius, endRadius)
        {
        }

        /// <summary>Area under shape(t) = (1 - cos(pi t)) / 2 from 0 to t.</summary>
        protected override double ShapeIntegral(double t)
        {
            return t / 2.0 - Math.Sin(Math.PI * t) / (2.0 * Math.PI);
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
        {
            return new CosineCurve3D(start, end, length, startAzimuthDegrees, startRadius, endRadius);
        }
    }
}