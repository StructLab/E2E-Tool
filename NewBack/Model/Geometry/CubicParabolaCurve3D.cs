namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Cubic parabola transition between a straight and a circle (either way round).
    ///
    /// The classic formula, with x measured along the start tangent and Lx the x-length of the transition:
    ///     y = x^3 / (6 * R * Lx)
    /// The slope of that curve gives the direction:
    ///     direction after x = atan( x^2 / (2 * R * Lx) )
    ///
    /// The model's length is measured along the curve (arc length), not along x. So the class
    ///   1. finds Lx so that the arc length of the parabola from 0 to Lx is exactly the given length, and
    ///   2. turns a distance along the curve into x (Arc2X) before using the formula.
    ///
    /// It then gives the direction at each distance to the base class, which adds up the tiny moves.
    /// That gives the same curve as the closed formula, and it also handles the exit case (circle to straight),
    /// left curves and any azimuth in the same way as the other transition kinds.
    ///
    /// Only a straight-to-curve or curve-to-straight transition is allowed (the classic cubic parabola has
    /// no compound form). The formula is meant for gentle transitions: Lx / (2R) should be well below 0.5.
    /// </summary>
    public class CubicParabolaCurve3D : TransitionCurve3D
    {
        private readonly bool _startsStraight;   // true = straight to curve, false = curve to straight
        private readonly double _sign;           // +1 right curve, -1 left curve
        private readonly double _radius;         // size of the curved end's radius (always positive)
        private readonly double _xLength;        // Lx: the x-length that matches the arc length

        public CubicParabolaCurve3D(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
            : base(start, end, length, azimuth, radius, nextRadius)
        {
            bool startIsStraight = StartCurvature == 0.0;
            bool endIsStraight = EndCurvature == 0.0;

            if (startIsStraight == endIsStraight)
            {
                throw new NotSupportedException("A cubic parabola needs exactly one straight end (straight to curve, or curve to straight).");
            }

            double curvature;
            if (startIsStraight)
            {
                curvature = EndCurvature;
            }
            else
            {
                curvature = StartCurvature;
            }

            _startsStraight = startIsStraight;
            _radius = 1.0 / Math.Abs(curvature);
            if (curvature >= 0.0)
            {
                _sign = 1.0;
            }
            else
            {
                _sign = -1.0;
            }

            _xLength = FindXLength();
        }

        /// <summary>
        /// Not used for this kind: TurnedAngle is replaced below. It only has to exist because the
        /// base class asks every kind for it. (It describes the clothoid, the closest relative.)
        /// </summary>
        protected override double ShapeIntegral(double t)
        {
            return t * t / 2.0;
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
        {
            return new CubicParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);
        }

        /// <summary>
        /// Direction change after distance metres along the curve.
        ///  - Straight to curve: the slope angle of the parabola at the matching x.
        ///  - Curve to straight: the same curve driven backwards, so what is gained so far
        ///    is the total turn minus the turn that is still ahead.
        /// </summary>
        protected override double TurnedAngle(double distance)
        {
            double angle;
            if (_startsStraight)
            {
                angle = SlopeAngleAtArc(distance);
            }
            else
            {
                double distanceLeft = Length - distance;
                if (distanceLeft < 0.0)
                {
                    distanceLeft = 0.0;
                }
                angle = SlopeAngleAtArc(Length) - SlopeAngleAtArc(distanceLeft);
            }
            return _sign * angle;
        }

        // =====================================================================
        // The cubic parabola maths
        // =====================================================================

        /// <summary>atan( x^2 / (2 R Lx) ): the direction of the parabola at the x that belongs to the arc distance.</summary>
        private double SlopeAngleAtArc(double arcDistance)
        {
            double x = Arc2X(arcDistance, _xLength);
            return Math.Atan(x * x / (2.0 * _radius * _xLength));
        }

        /// <summary>
        /// Arc length of y = x^3 / (6 R Lx) from 0 to x.
        /// Series of the integral of sqrt(1 + (u^2 / c)^2) with c = 2 R Lx:
        ///     x + x^5 / (10 c^2) - x^9 / (72 c^4) + x^13 / (208 c^6)
        /// The next term is smaller than 1e-8 m for realistic transitions.
        /// </summary>
        private double ArcLengthUpToX(double x, double xLength)
        {
            double c = 2.0 * _radius * xLength;
            double c2 = c * c;
            double x2 = x * x;
            double x4 = x2 * x2;
            double x5 = x4 * x;
            double x9 = x5 * x4;
            double x13 = x9 * x4;
            return x + x5 / (10.0 * c2) - x9 / (72.0 * c2 * c2) + x13 / (208.0 * c2 * c2 * c2);
        }

        /// <summary>The x that belongs to a distance along the curve (Newton's method).</summary>
        private double Arc2X(double arcDistance, double xLength)
        {
            if (arcDistance <= 0.0)
            {
                return 0.0;
            }

            double c = 2.0 * _radius * xLength;
            double x = arcDistance;   // good first guess: x is a little smaller than the arc distance
            for (int i = 0; i < 20; i++)
            {
                double difference = ArcLengthUpToX(x, xLength) - arcDistance;
                double slope = Math.Sqrt(1.0 + (x * x / c) * (x * x / c));   // d(arc length) / dx
                double step = difference / slope;
                x -= step;
                if (Math.Abs(step) < 1e-12)
                {
                    break;
                }
            }
            return x;
        }

        /// <summary>
        /// Finds Lx so that the arc length of the parabola from 0 to Lx equals the given length.
        /// Bisection between L/2 and L (the arc is never shorter than x, so Lx is at most L).
        /// </summary>
        private double FindXLength()
        {
            double low = Length / 2.0;
            double high = Length;

            if (ArcLengthUpToX(low, low) >= Length)
            {
                throw new ArgumentException("The radius is too small for a cubic parabola of this length.");
            }

            for (int i = 0; i < 80; i++)
            {
                double middle = (low + high) / 2.0;
                if (ArcLengthUpToX(middle, middle) < Length)
                {
                    low = middle;
                }
                else
                {
                    high = middle;
                }
            }
            return (low + high) / 2.0;
        }
    }
}
