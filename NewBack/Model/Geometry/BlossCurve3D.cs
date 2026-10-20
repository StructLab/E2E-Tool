namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Bloss transition: the curvature changes slowly at both ends and fastest in the middle.
    /// Shape: shape(t) = 3 t^2 - 2 t^3   (t = distance / length, from 0 to 1).
    /// </summary>
    public class BlossCurve3D : TransitionCurve3D
    {
        public BlossCurve3D(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
            : base(start, end, length, startAzimuthDegrees, startRadius, endRadius)
        {
        }

        /// <summary>Area under shape(t) = 3 t^2 - 2 t^3 from 0 to t.</summary>
        protected override double ShapeIntegral(double t)
        {
            return t * t * t - (t * t * t * t) / 2.0;
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
        {
            return new BlossCurve3D(start, end, length, startAzimuthDegrees, startRadius, endRadius);
        }
    }
}