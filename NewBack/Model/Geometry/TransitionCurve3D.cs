namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Base class for transition curves: the bend changes smoothly from the start curvature to the end curvature.
    ///
    /// What the model gives us (see the comments on the constructor):
    ///   start, end      : the points where the transition begins and ends
    ///   length          : next segment's elementGeometryPos minus this segment's elementGeometryPos
    ///   startAzimuth    : this segment's azimuth (degrees, 0 = north, clockwise)
    ///   startRadius     : this segment's radius (negative = left, positive = right, straight = 0 / Infinity)
    ///   endRadius       : the NEXT segment's radius
    ///
    /// Idea in one sentence: work out how far the direction has turned after s metres (tau),
    /// add up the tiny moves to get "forward" and "sideways", then turn that picture onto the map.
    ///
    /// Each kind of transition (clothoid, cosine, sine, ...) only has to say HOW the curvature moves
    /// from the start value to the end value. It does that with one small function: ShapeIntegral.
    /// </summary>
    public abstract class TransitionCurve3D : Curve3D
    {
        // Simpson's rule needs an EVEN number of pieces. 40 is accurate to about a millionth of a metre.
        protected const int SimpsonSteps = 40;

        // A radius bigger than this, or smaller than TinyRadius, is treated as "straight".
        private const double StraightRadiusLimit = 1e9;
        private const double TinyRadius = 1e-4;

        private readonly Point3d _start;
        private readonly Point3d _end;
        private readonly double _length;
        private readonly double _startAzimuthRad;   // clockwise from north, in radians
        private readonly double _startRadius;
        private readonly double _endRadius;
        private readonly double _startCurvature;    // 1 / radius, signed (right = +, left = -), 0 = straight
        private readonly double _endCurvature;

        /// <param name="start">Start point of the transition (position at this segment's elementGeometryPos).</param>
        /// <param name="end">End point (the next segment's start point).</param>
        /// <param name="length">Next elementGeometryPos minus this elementGeometryPos, in metres.</param>
        /// <param name="startAzimuthDegrees">This segment's azimuth, in degrees.</param>
        /// <param name="startRadius">This segment's radius. Negative = left, positive = right.</param>
        /// <param name="endRadius">The next segment's radius. Negative = left, positive = right.</param>
        protected TransitionCurve3D(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
        {
            if (start == null)
            {
                throw new ArgumentNullException(nameof(start));
            }
            if (end == null)
            {
                throw new ArgumentNullException(nameof(end));
            }
            if (length <= 0)
            {
                throw new ArgumentException("Length must be greater than zero.", nameof(length));
            }

            _start = start;
            _end = end;
            _length = length;
            _startAzimuthRad = startAzimuthDegrees * Math.PI / 180.0;
            _startRadius = startRadius;
            _endRadius = endRadius;
            _startCurvature = RadiusToCurvature(startRadius);
            _endCurvature = RadiusToCurvature(endRadius);
        }

        public override Point3d Start
        {
            get { return _start; }
        }

        public override Point3d End
        {
            get { return _end; }
        }

        public override double Length
        {
            get { return _length; }
        }

        /// <summary>1 / start radius (signed). 0 means the transition starts straight.</summary>
        protected double StartCurvature
        {
            get { return _startCurvature; }
        }

        /// <summary>1 / end radius (signed). 0 means the transition ends straight.</summary>
        protected double EndCurvature
        {
            get { return _endCurvature; }
        }

        /// <summary>Direction of the curve at its end, in degrees (0..360). Compare it with the next segment's azimuth.</summary>
        public double EndAzimuthDegrees
        {
            get
            {
                double degrees = (_startAzimuthRad + TurnedAngle(_length)) * 180.0 / Math.PI;
                return NormalizeDegrees(degrees);
            }
        }

        /// <summary>
        /// Distance on the map between the end point we were given and the end point the formula gives.
        /// It should be (almost) zero. If it is large, the data or the inputs do not fit together.
        /// </summary>
        public double EndGapMeters
        {
            get
            {
                Point3d formulaEnd = PointAt(_length);
                double dx = formulaEnd.X - _end.X;
                double dy = formulaEnd.Y - _end.Y;
                return Math.Sqrt(dx * dx + dy * dy);
            }
        }

        // =====================================================================
        // The one thing every kind of transition must tell us.
        // =====================================================================

        /// <summary>
        /// The curvature moves from the start value to the end value following a "shape" that goes from 0 to 1
        /// (t = distance / length, from 0 to 1):
        ///     curvature(t) = startCurvature + (endCurvature - startCurvature) * shape(t)
        /// This function returns the area under the shape from 0 to t, which is what we need for the turned angle.
        ///
        /// The shape must be "balanced": shape(t) + shape(1 - t) = 1. Then the area under the whole shape is 1/2
        /// and Reverse() works. Clothoid, cosine and sine are all balanced.
        /// </summary>
        protected abstract double ShapeIntegral(double t);

        /// <summary>Makes a new curve of the same kind (used by Reverse).</summary>
        protected abstract TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius);

        // =====================================================================
        // PointAt: where am I after "distance" metres?
        // =====================================================================
        public override Point3d PointAt(double distance)
        {
            double s = ClampDistance(distance);

            double along;   // forward, in the start direction
            double side;    // sideways, positive = to the right

            if (s <= 0)
            {
                along = 0;
                side = 0;
            }
            else
            {
                ComputeAlongAndSide(s, out along, out side);
            }

            // Turn the little "forward / sideways" picture onto the map and move it to the start point.
            double east = _start.X + along * Math.Sin(_startAzimuthRad) + side * Math.Cos(_startAzimuthRad);
            double north = _start.Y + along * Math.Cos(_startAzimuthRad) - side * Math.Sin(_startAzimuthRad);

            // Height goes up or down evenly from start to end.
            double height = _start.Z + (_end.Z - _start.Z) * (s / _length);

            return new Point3d(east, north, height);
        }

        // =====================================================================
        // TangentAt: which way am I facing after "distance" metres?
        // Returned as a unit vector (east part, north part, height part).
        // =====================================================================
        public override Point3d TangentAt(double distance)
        {
            double s = ClampDistance(distance);

            double heading = _startAzimuthRad + TurnedAngle(s);

            double east = Math.Sin(heading);
            double north = Math.Cos(heading);
            double up = (_end.Z - _start.Z) / _length;

            double size = Math.Sqrt(east * east + north * north + up * up);
            return new Point3d(east / size, north / size, up / size);
        }

        // =====================================================================
        // FindClosestPoint: which point of the curve is nearest to "point"?
        // First look at 21 spots to find the right area, then narrow it down.
        // =====================================================================
        public override ClosestPointResult FindClosestPoint(Point3d point)
        {
            if (point == null)
            {
                throw new ArgumentNullException(nameof(point));
            }

            // Step 1: rough look at 21 evenly spaced spots.
            const int roughSpots = 21;
            double spacing = _length / (roughSpots - 1);
            int bestSpot = 0;
            double bestDistance = double.MaxValue;

            for (int i = 0; i < roughSpots; i++)
            {
                double d = point.DistanceTo(PointAt(i * spacing));
                if (d < bestDistance)
                {
                    bestDistance = d;
                    bestSpot = i;
                }
            }

            // Step 2: the answer is somewhere between the neighbours of the best spot.
            double low = Math.Max(0.0, (bestSpot - 1) * spacing);
            double high = Math.Min(_length, (bestSpot + 1) * spacing);

            // Step 3: golden-section search, shrinks the area until it is smaller than 1 mm.
            double goldenRatio = (Math.Sqrt(5.0) - 1.0) / 2.0;
            double x1 = high - goldenRatio * (high - low);
            double x2 = low + goldenRatio * (high - low);
            double d1 = point.DistanceTo(PointAt(x1));
            double d2 = point.DistanceTo(PointAt(x2));

            while (Math.Abs(high - low) > 0.001)
            {
                if (d1 < d2)
                {
                    high = x2;
                    x2 = x1;
                    d2 = d1;
                    x1 = high - goldenRatio * (high - low);
                    d1 = point.DistanceTo(PointAt(x1));
                }
                else
                {
                    low = x1;
                    x1 = x2;
                    d1 = d2;
                    x2 = low + goldenRatio * (high - low);
                    d2 = point.DistanceTo(PointAt(x2));
                }
            }

            double bestS = (low + high) / 2.0;
            Point3d bestPoint = PointAt(bestS);

            ClosestPointResult result = new ClosestPointResult();
            result.Point = bestPoint;
            result.Distance = point.DistanceTo(bestPoint);
            result.DistanceAlongCurve = bestS;
            result.DistanceAlongTrack = bestS;
            return result;
        }

        // =====================================================================
        // Reverse: the same curve driven from the end back to the start.
        //  - It starts at the old END and faces the way the old curve faced there, turned by 180 degrees.
        //  - Driving backwards swaps left and right, so the radii swap places AND change sign.
        // =====================================================================
        public override Curve3D Reverse()
        {
            double reversedAzimuth = NormalizeDegrees(EndAzimuthDegrees + 180.0);
            return CreateSameKind(_end, _start, _length, reversedAzimuth, -_endRadius, -_startRadius);
        }

        // =====================================================================
        // The maths
        // =====================================================================

        /// <summary>
        /// How far has the direction turned after s metres? (radians, right = +, left = -)
        /// A kind of transition that is not described by a curvature shape (for example the cubic parabola)
        /// replaces this function with its own.
        /// </summary>
        protected virtual double TurnedAngle(double s)
        {
            // tau(s) = s * k1 + (k2 - k1) * L * ShapeIntegral(s / L)
            double t = s / _length;
            double change = _endCurvature - _startCurvature;
            return s * _startCurvature + change * _length * ShapeIntegral(t);
        }

        /// <summary>
        /// Works out "forward" and "sideways" after s metres. The default adds up cos(tau) and sin(tau)
        /// with Simpson's rule. A kind of transition may override this with a faster formula.
        /// </summary>
        protected virtual void ComputeAlongAndSide(double s, out double along, out double side)
        {
            ComputeBySimpson(s, out along, out side);
        }

        /// <summary>
        /// Add up cos(tau) and sin(tau) along the way with Simpson's rule.
        /// Weights: 1, 4, 2, 4, 2, ... 4, 1  times  h / 3.
        /// </summary>
        protected void ComputeBySimpson(double s, out double along, out double side)
        {
            double h = s / SimpsonSteps;

            double sumAlong = Math.Cos(TurnedAngle(0.0)) + Math.Cos(TurnedAngle(s));
            double sumSide = Math.Sin(TurnedAngle(0.0)) + Math.Sin(TurnedAngle(s));

            for (int i = 1; i < SimpsonSteps; i++)
            {
                double position = i * h;
                double tau = TurnedAngle(position);
                double weight;
                if (i % 2 == 0)
                {
                    weight = 2.0;
                }
                else
                {
                    weight = 4.0;
                }
                sumAlong += weight * Math.Cos(tau);
                sumSide += weight * Math.Sin(tau);
            }

            along = (h / 3.0) * sumAlong;
            side = (h / 3.0) * sumSide;
        }

        // =====================================================================
        // Small helpers
        // =====================================================================

        private double ClampDistance(double distance)
        {
            if (distance < 0.0)
            {
                return 0.0;
            }
            if (distance > _length)
            {
                return _length;
            }
            return distance;
        }

        /// <summary>Straight if the radius is 0, infinite, not a number, or absurdly large.</summary>
        private static bool IsStraight(double radius)
        {
            if (double.IsNaN(radius) || double.IsInfinity(radius))
            {
                return true;
            }
            double size = Math.Abs(radius);
            if (size < TinyRadius || size > StraightRadiusLimit)
            {
                return true;
            }
            return false;
        }

        /// <summary>1 / radius, keeping the sign. Straight gives 0.</summary>
        private static double RadiusToCurvature(double radius)
        {
            if (IsStraight(radius))
            {
                return 0.0;
            }
            return 1.0 / radius;
        }

        private static double NormalizeDegrees(double degrees)
        {
            double result = degrees % 360.0;
            if (result < 0.0)
            {
                result += 360.0;
            }
            return result;
        }
    }
}