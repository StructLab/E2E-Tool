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

        public ClothoidCurve3D(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
            : base(start, end, length, startAzimuthDegrees, startRadius, endRadius)
        {
        }

        /// <summary>Area under shape(t) = t from 0 to t.</summary>
        protected override double ShapeIntegral(double t)
        {
            return t * t / 2.0;
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
        {
            return new ClothoidCurve3D(start, end, length, startAzimuthDegrees, startRadius, endRadius);
        }

        protected override void ComputeAlongAndSide(double s, out double along, out double side)
        {
            if (CanUseShortFormula(s))
            {
                ComputeByShortFormula(s, out along, out side);
            }
            else
            {
                ComputeBySimpson(s, out along, out side);
            }
        }

        /// <summary>The short formula only works when the road starts straight and the turn is still small.</summary>
        private bool CanUseShortFormula(double s)
        {
            if (StartCurvature != 0.0)
            {
                return false;
            }
            if (Math.Abs(TurnedAngle(s)) > SmallAngleLimit)
            {
                return false;
            }
            return true;
        }

        /// <summary>Entry from a straight: along = s(1 - t^2/10 + t^4/216), side = s(t/3 - t^3/42 + t^5/1320).</summary>
        private void ComputeByShortFormula(double s, out double along, out double side)
        {
            double tau = TurnedAngle(s);   // already has the sign: negative for a left curve
            double tau2 = tau * tau;
            double tau3 = tau2 * tau;
            double tau4 = tau2 * tau2;
            double tau5 = tau4 * tau;

            along = s * (1.0 - tau2 / 10.0 + tau4 / 216.0);
            side = s * (tau / 3.0 - tau3 / 42.0 + tau5 / 1320.0);
        }
    }
}
