namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Wiener Bogen: a transition where the track bends AND tilts (cant) at the same time.
    ///
    /// Idea in one sentence: the tilt changes along the way, and a changing tilt moves the centre of gravity
    /// sideways, so the bend is shaped a little differently than in a plain clothoid.
    ///
    /// The curvature along the transition (t = distance / length, from 0 to 1):
    ///     curvature(t) = k1 + (k2 - k1) * f(t)  -  h * (roll2 - roll1) * f''(t) / length^2
    ///   k1, k2 : 1 / radius at the start / at the end
    ///   f(t)   : the shaping function, 0 at the start and 1 at the end
    ///   h      : height of the centre of gravity above the track, in metres
    ///   roll   : the tilt angle of the track, asin(cant / 1500 mm), on the side of the curve
    ///
    /// ASSUMPTIONS that Khaled still has to confirm (they are the only two places that need to change):
    ///   1. f(t) is the usual 7th-degree polynomial 35 t^4 - 84 t^5 + 70 t^6 - 20 t^7  (see Shape, ShapeSlope).
    ///   2. h is a required parameter of the constructor. There is no predefined value, because the data model
    ///      does not have one and none has been agreed.
    ///
    /// Cant, like in the data model (appliedCant), is a size in millimetres, always zero or positive.
    /// Which side it leans to follows the curve: right curve = tilted right, left curve = tilted left.
    /// When the cant is the same at both ends, the h term is zero and only f(t) shapes the bend.
    ///
    /// The inputs have the same names as in TransitionCurve3D. New ones:
    ///   cant                  : this segment's appliedCant (mm), the tilt at the start
    ///   nextCant              : the next cant point's appliedCant (mm), the tilt at the end
    ///   centreOfGravityHeight : h, in metres
    /// </summary>
    public class WienerBogenCurve3D : TransitionCurve3D
    {
        // Distance between the middle of the two rail heads: 1500 mm (for the standard gauge 1435 mm).
        private const double GaugeMillimetres = 1500.0;

        private readonly double _cant;
        private readonly double _nextCant;
        private readonly double _centreOfGravityHeight;

        // The tilt angles in radians (right = +, left = -), worked out once in the constructor.
        private readonly double _startRoll;
        private readonly double _endRoll;

        public WienerBogenCurve3D(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius,
            double cant, double nextCant, double centreOfGravityHeight)
            : base(start, end, length, azimuth, radius, nextRadius)
        {
            if (cant < 0 || nextCant < 0)
            {
                throw new ArgumentException("Cant must be zero or positive (it is a size in mm).");
            }
            if (cant >= GaugeMillimetres || nextCant >= GaugeMillimetres)
            {
                throw new ArgumentException("Cant must be smaller than the gauge (1500 mm).");
            }
            if (centreOfGravityHeight < 0)
            {
                throw new ArgumentException("The centre of gravity height cannot be negative.", nameof(centreOfGravityHeight));
            }

            _cant = cant;
            _nextCant = nextCant;
            _centreOfGravityHeight = centreOfGravityHeight;

            // The side of the tilt follows the side of the curve.
            double startSide = SideOfCurve(StartCurvature, EndCurvature);
            double endSide = SideOfCurve(EndCurvature, StartCurvature);
            _startRoll = startSide * Math.Asin(cant / GaugeMillimetres);
            _endRoll = endSide * Math.Asin(nextCant / GaugeMillimetres);
        }

        // =====================================================================
        // The shaping function f(t) and what we need from it
        // =====================================================================

        /// <summary>f(t) = 35 t^4 - 84 t^5 + 70 t^6 - 20 t^7  (0 at the start, 1 at the end, flat at both ends).</summary>
        private static double Shape(double t)
        {
            double t2 = t * t;
            double t4 = t2 * t2;
            return 35.0 * t4 - 84.0 * t4 * t + 70.0 * t4 * t2 - 20.0 * t4 * t2 * t;
        }

        /// <summary>f'(t) = 140 t^3 - 420 t^4 + 420 t^5 - 140 t^6.</summary>
        private static double ShapeSlope(double t)
        {
            double t3 = t * t * t;
            return 140.0 * t3 - 420.0 * t3 * t + 420.0 * t3 * t * t - 140.0 * t3 * t3;
        }

        /// <summary>Area under f(t) from 0 to t: 7 t^5 - 14 t^6 + 10 t^7 - 2.5 t^8.</summary>
        protected override double ShapeIntegral(double t)
        {
            double t5 = t * t * t * t * t;
            return 7.0 * t5 - 14.0 * t5 * t + 10.0 * t5 * t * t - 2.5 * t5 * t * t * t;
        }

        // =====================================================================
        // Turned angle: the plain part plus the cant part.
        //
        // The cant part of the curvature is  -h * (roll2 - roll1) * f''(t) / length^2.
        // Adding it up along the way (f' starts at 0) gives  -h * (roll2 - roll1) * f'(t) / length.
        // =====================================================================
        protected override double TurnedAngle(double distance)
        {
            double plainPart = base.TurnedAngle(distance);

            double t = distance / Length;
            double cantPart = -_centreOfGravityHeight * (_endRoll - _startRoll) * ShapeSlope(t) / Length;

            return plainPart + cantPart;
        }

        // =====================================================================
        // Reverse: the same curve driven backwards.
        // The radii swap and change sign (done in the base class); the cants only swap places,
        // because they are sizes and their side follows the curve.
        // =====================================================================
        public override Curve3D Reverse()
        {
            double reversedAzimuth = (EndAzimuthDegrees + 180.0) % 360.0;
            return CreateSameKind(End, Start, Length, reversedAzimuth, -ReversedRadiusHelper(EndCurvature), -ReversedRadiusHelper(StartCurvature));
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double azimuth, double radius, double nextRadius)
        {
            // Used by Reverse: the cants swap places.
            return new WienerBogenCurve3D(start, end, length, azimuth, radius, nextRadius, _nextCant, _cant, _centreOfGravityHeight);
        }

        // =====================================================================
        // Small helpers
        // =====================================================================

        /// <summary>Back from curvature to radius. A curvature of 0 means a straight (radius 0 is read as straight).</summary>
        private static double ReversedRadiusHelper(double curvature)
        {
            if (curvature == 0.0)
            {
                return 0.0;
            }
            return 1.0 / curvature;
        }

        /// <summary>
        /// Which side does the tilt lean to at one end? +1 = right, -1 = left.
        /// Use this end's own curvature if it has a bend. If this end is straight, use the other end's side.
        /// If both are straight, it does not matter (+1).
        /// </summary>
        private static double SideOfCurve(double ownCurvature, double otherCurvature)
        {
            if (ownCurvature > 0.0)
            {
                return 1.0;
            }
            if (ownCurvature < 0.0)
            {
                return -1.0;
            }
            if (otherCurvature < 0.0)
            {
                return -1.0;
            }
            return 1.0;
        }
    }
}