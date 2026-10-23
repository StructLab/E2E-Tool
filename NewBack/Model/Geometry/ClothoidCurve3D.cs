namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Clothoid transition: the curvature changes evenly with the distance (a straight line in the curvature picture).
    /// Shape: shape(t) = t.
    ///
    /// When the road starts straight and the turn is small, a short formula (a series) is used.
    /// In every other case the base class adds up the tiny moves with Simpson's rule.
    /// </summary>
    public class ClothoidCurve3D : TransitionCurve3D
    {
        // The short formula is only used while the turned angle is small (radians).
        private const double SmallAngleLimit = 0.3;

        public ClothoidCurve3D(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
            : base(start, end, length, azimuth, radius, nextRadius)
        {
        }

        /// <summary>Area under shape(t) = t from 0 to t.</summary>
        protected override double ShapeIntegral(double t)
        {
            return t * t / 2.0;
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
        {
            return new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
        }

        protected override void ComputeAlongAndSide(double distance, out double along, out double side)
        {
            if (CanUseShortFormula(distance))
            {
                ComputeByShortFormula(distance, out along, out side);
            }
            else
            {
                ComputeBySimpson(distance, out along, out side);
            }
        }

        /// <summary>The short formula only works when the road starts straight and the turn is still small.</summary>
        private bool CanUseShortFormula(double distance)
        {
            if (StartCurvature != 0.0)
            {
                return false;
            }
            if (Math.Abs(TurnedAngle(distance)) > SmallAngleLimit)
            {
                return false;
            }
            return true;
        }

        /// <summary>Entry from a straight: along = distance * (1 - tau^2/10 + tau^4/216), side = distance * (tau/3 - tau^3/42 + tau^5/1320).</summary>
        private void ComputeByShortFormula(double distance, out double along, out double side)
        {
            double tau = TurnedAngle(distance);   // already has the sign: negative for a left curve
            double tau2 = tau * tau;
            double tau3 = tau2 * tau;
            double tau4 = tau2 * tau2;
            double tau5 = tau4 * tau;

            along = distance * (1.0 - tau2 / 10.0 + tau4 / 216.0);
            side = distance * (tau / 3.0 - tau3 / 42.0 + tau5 / 1320.0);
        }
    }
}
