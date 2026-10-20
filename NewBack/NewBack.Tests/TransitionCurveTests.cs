using System;
using System.Collections.Generic;
using GeoModel.Geometry;
using Model.Geometry;
using Xunit;

namespace TransitionCurves.Tests
{
    /// <summary>
    /// Tests for the transition curves: clothoid, cosine, sine and Bloss.
    ///
    /// Two kinds of checks:
    ///  - Known numbers from the hand calculation (R = 1000 m, L = 100 m, s = 50 m).
    ///  - An independent fine-step calculation (ReferencePoint) that does not use the curve classes.
    /// </summary>
    public class TransitionCurveTests
    {
        private const double Straight = double.PositiveInfinity;

        // =====================================================================
        // Helpers
        // =====================================================================

        private static void AssertNear(double actual, double expected, double tolerance)
        {
            Assert.InRange(actual, expected - tolerance, expected + tolerance);
        }

        private static void AssertPoint(Point3d actual, double expectedX, double expectedY, double tolerance)
        {
            AssertNear(actual.X, expectedX, tolerance);
            AssertNear(actual.Y, expectedY, tolerance);
        }

        private static double ClothoidShape(double t) { return t; }
        private static double CosineShape(double t) { return (1.0 - Math.Cos(Math.PI * t)) / 2.0; }
        private static double SineShape(double t) { return t - Math.Sin(2.0 * Math.PI * t) / (2.0 * Math.PI); }
        private static double BlossShape(double t) { return 3.0 * t * t - 2.0 * t * t * t; }

        private static double ToCurvature(double radius)
        {
            if (double.IsInfinity(radius) || radius == 0.0)
            {
                return 0.0;
            }
            return 1.0 / radius;
        }

        /// <summary>
        /// Independent reference: walks 200000 tiny steps along the curve, using the curvature itself
        /// (not the formulas of the curve classes). Returns the map position after "s" metres.
        /// </summary>
        private static Point3d ReferencePoint(Point3d start, double azimuthDegrees, double startRadius, double endRadius, double length, double s, Func<double, double> shape)
        {
            double k1 = ToCurvature(startRadius);
            double k2 = ToCurvature(endRadius);
            int steps = 200000;
            double h = s / steps;
            double east = start.X;
            double north = start.Y;
            double heading = azimuthDegrees * Math.PI / 180.0;

            for (int i = 0; i < steps; i++)
            {
                double middle = (i + 0.5) * h;
                double k = k1 + (k2 - k1) * shape(middle / length);
                double middleHeading = heading + k * h / 2.0;
                east += Math.Sin(middleHeading) * h;
                north += Math.Cos(middleHeading) * h;
                heading += k * h;
            }
            return new Point3d(east, north, 0.0);
        }

        private static readonly Point3d Origin = new Point3d(0.0, 0.0, 100.0);

        /// <summary>The end point of the standard entry example (straight to R = 1000, L = 100).</summary>
        private static readonly Point3d EntryEnd = new Point3d(1.666369, 99.975003, 101.0);

        /// <summary>The end point of the standard exit example (R = 1000 to straight, L = 100).</summary>
        private static readonly Point3d ExitEnd = new Point3d(3.332381, 99.933344, 101.0);

        private static ClothoidCurve3D EntryCurve()
        {
            return new ClothoidCurve3D(Origin, EntryEnd, 100.0, 0.0, Straight, 1000.0);
        }

        private static ClothoidCurve3D ExitCurve()
        {
            return new ClothoidCurve3D(Origin, ExitEnd, 100.0, 0.0, 1000.0, Straight);
        }

        // =====================================================================
        // Clothoid: known numbers
        // =====================================================================

        [Fact]
        public void Clothoid_Entry_At50m_MatchesHandCalculation()
        {
            Point3d p = EntryCurve().PointAt(50.0);
            AssertPoint(p, 0.208331, 49.999219, 1e-5);
            AssertNear(p.Z, 100.5, 1e-9);
        }

        [Fact]
        public void Clothoid_Entry_AtEnd_MatchesHandCalculation()
        {
            AssertPoint(EntryCurve().PointAt(100.0), 1.666369, 99.975003, 1e-5);
        }

        [Fact]
        public void Clothoid_Exit_MatchesHandCalculation()
        {
            ClothoidCurve3D curve = ExitCurve();
            AssertPoint(curve.PointAt(25.0), 0.286446, 24.997860, 1e-5);
            AssertPoint(curve.PointAt(50.0), 1.041532, 49.986199, 1e-5);
            AssertPoint(curve.PointAt(75.0), 2.108912, 74.963310, 1e-5);
            AssertPoint(curve.PointAt(100.0), 3.332381, 99.933344, 1e-5);
        }

        [Fact]
        public void Clothoid_LeftCurve_IsTheMirrorImage()
        {
            ClothoidCurve3D left = new ClothoidCurve3D(Origin, new Point3d(-1.666369, 99.975003, 101.0), 100.0, 0.0, Straight, -1000.0);
            AssertPoint(left.PointAt(50.0), -0.208331, 49.999219, 1e-5);
        }

        [Fact]
        public void Clothoid_FacingEast_RightCurveBendsSouth()
        {
            ClothoidCurve3D curve = new ClothoidCurve3D(new Point3d(0, 0, 0), new Point3d(99.975003, -1.666369, 0), 100.0, 90.0, Straight, 1000.0);
            AssertPoint(curve.PointAt(50.0), 49.999219, -0.208331, 1e-5);
        }

        [Fact]
        public void Clothoid_AStraightCanBeStoredAsZeroInfinityOrHuge()
        {
            ClothoidCurve3D withZero = new ClothoidCurve3D(Origin, EntryEnd, 100.0, 0.0, 0.0, 1000.0);
            ClothoidCurve3D withHuge = new ClothoidCurve3D(Origin, EntryEnd, 100.0, 0.0, 1e12, 1000.0);
            AssertPoint(withZero.PointAt(50.0), 0.208331, 49.999219, 1e-5);
            AssertPoint(withHuge.PointAt(50.0), 0.208331, 49.999219, 1e-5);

            ClothoidCurve3D endZero = new ClothoidCurve3D(Origin, ExitEnd, 100.0, 0.0, 1000.0, 0.0);
            AssertPoint(endZero.PointAt(50.0), 1.041532, 49.986199, 1e-5);
        }

        // =====================================================================
        // Direction (tangent), end azimuth, end gap
        // =====================================================================

        [Fact]
        public void Clothoid_Tangent_AtTheEnd()
        {
            Point3d t = EntryCurve().TangentAt(100.0);
            AssertNear(t.X, 0.04998, 1e-4);
            AssertNear(t.Y, 0.99870, 1e-4);
            AssertNear(t.Z, 0.01, 1e-4);
        }

        [Fact]
        public void Clothoid_Tangent_IsAUnitVector()
        {
            Point3d t = EntryCurve().TangentAt(37.0);
            double size = Math.Sqrt(t.X * t.X + t.Y * t.Y + t.Z * t.Z);
            AssertNear(size, 1.0, 1e-9);
        }

        [Fact]
        public void Clothoid_EndAzimuth_IsLengthOverTwoRadius()
        {
            // L / (2R) = 100 / 2000 = 0.05 rad = 2.8648 degrees
            AssertNear(EntryCurve().EndAzimuthDegrees, 2.864789, 1e-4);
            AssertNear(ExitCurve().EndAzimuthDegrees, 2.864789, 1e-4);
        }

        [Fact]
        public void Clothoid_LeftCurve_EndAzimuthIsBelow360()
        {
            ClothoidCurve3D left = new ClothoidCurve3D(Origin, EntryEnd, 100.0, 0.0, Straight, -1000.0);
            AssertNear(left.EndAzimuthDegrees, 360.0 - 2.864789, 1e-4);
        }

        [Fact]
        public void Clothoid_EndGap_IsNearZeroForConsistentData()
        {
            AssertNear(EntryCurve().EndGapMeters, 0.0, 1e-5);
            AssertNear(ExitCurve().EndGapMeters, 0.0, 1e-5);
        }

        [Fact]
        public void Clothoid_EndGap_ShowsWhenTheEndPointDoesNotFit()
        {
            Point3d wrongEnd = new Point3d(5.0, 99.975003, 101.0);
            ClothoidCurve3D curve = new ClothoidCurve3D(Origin, wrongEnd, 100.0, 0.0, Straight, 1000.0);
            AssertNear(curve.EndGapMeters, 3.333631, 1e-5);
        }

        // =====================================================================
        // Edges, input checks
        // =====================================================================

        [Fact]
        public void DistancesOutsideTheCurve_AreClamped()
        {
            ClothoidCurve3D curve = EntryCurve();
            AssertPoint(curve.PointAt(-5.0), 0.0, 0.0, 1e-9);
            AssertPoint(curve.PointAt(500.0), 1.666369, 99.975003, 1e-5);
        }

        [Fact]
        public void LengthZero_IsRefused()
        {
            Assert.Throws<ArgumentException>(() => new ClothoidCurve3D(Origin, EntryEnd, 0.0, 0.0, Straight, 1000.0));
        }

        [Fact]
        public void MissingPoints_AreRefused()
        {
            Assert.Throws<ArgumentNullException>(() => new ClothoidCurve3D(null, EntryEnd, 100.0, 0.0, Straight, 1000.0));
            Assert.Throws<ArgumentNullException>(() => new ClothoidCurve3D(Origin, null, 100.0, 0.0, Straight, 1000.0));
        }

        // =====================================================================
        // Against the independent fine-step calculation
        // =====================================================================

        [Fact]
        public void Clothoid_BigTurn_UsesTheIntegralAndStillMatches()
        {
            // L = 200, R = 100: the curve turns 1 radian, too much for the short formula
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            ClothoidCurve3D curve = new ClothoidCurve3D(far, far, 200.0, 30.0, Straight, 100.0);
            Point3d reference = ReferencePoint(far, 30.0, Straight, 100.0, 200.0, 150.0, ClothoidShape);
            AssertPoint(curve.PointAt(150.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Clothoid_CurveToCurve_Matches()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            ClothoidCurve3D curve = new ClothoidCurve3D(far, far, 100.0, 250.0, 500.0, 1000.0);
            Point3d reference = ReferencePoint(far, 250.0, 500.0, 1000.0, 100.0, 60.0, ClothoidShape);
            AssertPoint(curve.PointAt(60.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Clothoid_RightToLeft_SCurve_Matches()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            ClothoidCurve3D curve = new ClothoidCurve3D(far, far, 100.0, 10.0, 1000.0, -1000.0);
            Point3d reference = ReferencePoint(far, 10.0, 1000.0, -1000.0, 100.0, 80.0, ClothoidShape);
            AssertPoint(curve.PointAt(80.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Cosine_Matches()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CosineCurve3D entry = new CosineCurve3D(far, far, 100.0, 20.0, Straight, 1000.0);
            Point3d referenceEntry = ReferencePoint(far, 20.0, Straight, 1000.0, 100.0, 50.0, CosineShape);
            AssertPoint(entry.PointAt(50.0), referenceEntry.X, referenceEntry.Y, 1e-5);

            CosineCurve3D compound = new CosineCurve3D(far, far, 120.0, 300.0, 800.0, -400.0);
            Point3d referenceCompound = ReferencePoint(far, 300.0, 800.0, -400.0, 120.0, 70.0, CosineShape);
            AssertPoint(compound.PointAt(70.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void Sine_Matches()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            SineCurve3D exit = new SineCurve3D(far, far, 100.0, 45.0, 1000.0, 0.0);
            Point3d referenceExit = ReferencePoint(far, 45.0, 1000.0, 0.0, 100.0, 60.0, SineShape);
            AssertPoint(exit.PointAt(60.0), referenceExit.X, referenceExit.Y, 1e-5);

            SineCurve3D compound = new SineCurve3D(far, far, 150.0, 100.0, -600.0, 900.0);
            Point3d referenceCompound = ReferencePoint(far, 100.0, -600.0, 900.0, 150.0, 110.0, SineShape);
            AssertPoint(compound.PointAt(110.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void Bloss_Matches()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            BlossCurve3D entry = new BlossCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);
            Point3d referenceEntry = ReferencePoint(far, 0.0, Straight, 1000.0, 100.0, 50.0, BlossShape);
            AssertPoint(entry.PointAt(50.0), referenceEntry.X, referenceEntry.Y, 1e-5);

            BlossCurve3D compound = new BlossCurve3D(far, far, 130.0, 200.0, -700.0, 500.0);
            Point3d referenceCompound = ReferencePoint(far, 200.0, -700.0, 500.0, 130.0, 90.0, BlossShape);
            AssertPoint(compound.PointAt(90.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void AllKinds_TurnTheSameTotalAngle()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            List<TransitionCurve3D> kinds = new List<TransitionCurve3D>();
            kinds.Add(new ClothoidCurve3D(far, far, 100.0, 0.0, Straight, 1000.0));
            kinds.Add(new CosineCurve3D(far, far, 100.0, 0.0, Straight, 1000.0));
            kinds.Add(new SineCurve3D(far, far, 100.0, 0.0, Straight, 1000.0));
            kinds.Add(new BlossCurve3D(far, far, 100.0, 0.0, Straight, 1000.0));
            kinds.Add(new BiquadraticParabolaCurve3D(far, far, 100.0, 0.0, Straight, 1000.0));

            foreach (TransitionCurve3D kind in kinds)
            {
                AssertNear(kind.EndAzimuthDegrees, 2.864789, 1e-4);
            }
        }

        // =====================================================================
        // Reverse
        // =====================================================================

        private static void AssertReverseWorks(TransitionCurve3D curve)
        {
            // the old curve at 25 m is the reversed curve at 75 m
            Curve3D back = curve.Reverse();
            Point3d expected = curve.PointAt(25.0);
            Point3d actual = back.PointAt(75.0);
            AssertPoint(actual, expected.X, expected.Y, 1e-4);
        }

        [Fact]
        public void Reverse_Clothoid_EntryExitAndLeft()
        {
            AssertReverseWorks(EntryCurve());
            AssertReverseWorks(ExitCurve());
            AssertReverseWorks(new ClothoidCurve3D(Origin, new Point3d(-1.666369, 99.975003, 101.0), 100.0, 0.0, Straight, -1000.0));
        }

        [Fact]
        public void Reverse_CosineSineAndBloss()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);

            CosineCurve3D cosineGuess = new CosineCurve3D(far, far, 100.0, 20.0, Straight, 1000.0);
            AssertReverseWorks(new CosineCurve3D(far, cosineGuess.PointAt(100.0), 100.0, 20.0, Straight, 1000.0));

            SineCurve3D sineGuess = new SineCurve3D(far, far, 100.0, 45.0, 1000.0, 0.0);
            AssertReverseWorks(new SineCurve3D(far, sineGuess.PointAt(100.0), 100.0, 45.0, 1000.0, 0.0));

            BlossCurve3D blossGuess = new BlossCurve3D(far, far, 100.0, 70.0, 1000.0, 0.0);
            AssertReverseWorks(new BlossCurve3D(far, blossGuess.PointAt(100.0), 100.0, 70.0, 1000.0, 0.0));
        }

        [Fact]
        public void Reverse_Twice_GivesTheOriginalCurve()
        {
            ClothoidCurve3D curve = EntryCurve();
            Curve3D twice = curve.Reverse().Reverse();
            AssertPoint(twice.PointAt(50.0), curve.PointAt(50.0).X, curve.PointAt(50.0).Y, 1e-4);
        }

        // =====================================================================
        // Closest point
        // =====================================================================

        [Fact]
        public void FindClosestPoint_FindsTheRightDistanceAlongTheCurve()
        {
            ClothoidCurve3D curve = EntryCurve();
            Point3d onCurve = curve.PointAt(30.0);
            Point3d beside = new Point3d(onCurve.X + 0.5, onCurve.Y, onCurve.Z);

            ClosestPointResult result = curve.FindClosestPoint(beside);

            AssertNear(result.DistanceAlongCurve, 30.0, 0.05);
            AssertNear(result.Distance, 0.5, 0.01);
        }

        // =====================================================================
        // Cubic parabola
        // The reference uses the closed formula y = x^3 / (6 R Lx) and numeric arc lengths,
        // not the series or the Newton steps of the class.
        // =====================================================================

        /// <summary>Arc length of y = x^3 / (6 R Lx) from 0 to x, by 2000 midpoint steps.</summary>
        private static double NumericArc(double x, double radius, double xLength)
        {
            double c = 2.0 * radius * xLength;
            int steps = 2000;
            double h = x / steps;
            double sum = 0.0;
            for (int i = 0; i < steps; i++)
            {
                double u = (i + 0.5) * h;
                double a = u * u / c;
                sum += Math.Sqrt(1.0 + a * a) * h;
            }
            return sum;
        }

        /// <summary>The x-length Lx whose arc length is the given length (bisection).</summary>
        private static double NumericXLength(double radius, double length)
        {
            double low = length / 2.0;
            double high = length;
            for (int i = 0; i < 50; i++)
            {
                double middle = (low + high) / 2.0;
                if (NumericArc(middle, radius, middle) < length)
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

        /// <summary>The x that belongs to a distance along the curve (bisection).</summary>
        private static double NumericX(double distance, double radius, double xLength)
        {
            double low = 0.0;
            double high = distance;
            for (int i = 0; i < 50; i++)
            {
                double middle = (low + high) / 2.0;
                if (NumericArc(middle, radius, xLength) < distance)
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

        private static double NumericSlopeAngle(double distance, double radius, double xLength)
        {
            double x = NumericX(distance, radius, xLength);
            return Math.Atan(x * x / (2.0 * radius * xLength));
        }

        [Fact]
        public void CubicParabola_Entry_MatchesTheClosedFormula()
        {
            double radius = 1000.0;
            double length = 100.0;
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(far, far, length, 0.0, Straight, radius);
            double xLength = NumericXLength(radius, length);

            double[] distances = new double[] { 25.0, 50.0, 75.0, 100.0 };
            foreach (double distance in distances)
            {
                double x = NumericX(distance, radius, xLength);
                double y = x * x * x / (6.0 * radius * xLength);
                // facing north: East = sideways y, North = forward x
                AssertPoint(curve.PointAt(distance), y, x, 5e-6);
            }
        }

        [Fact]
        public void CubicParabola_Entry_SidewaysAt50m_Is0Point2083()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);
            AssertNear(curve.PointAt(50.0).X, 0.2083, 2e-4);
        }

        [Fact]
        public void CubicParabola_IsAboutOneMillimetreFromTheClothoid()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CubicParabolaCurve3D cubic = new CubicParabolaCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);
            ClothoidCurve3D clothoid = new ClothoidCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);

            Point3d a = cubic.PointAt(100.0);
            Point3d b = clothoid.PointAt(100.0);
            AssertNear(a.X, b.X, 3e-3);
            AssertNear(a.Y, b.Y, 3e-3);

            CubicParabolaCurve3D cubicExit = new CubicParabolaCurve3D(far, far, 100.0, 0.0, 1000.0, Straight);
            ClothoidCurve3D clothoidExit = new ClothoidCurve3D(far, far, 100.0, 0.0, 1000.0, Straight);
            Point3d c = cubicExit.PointAt(60.0);
            Point3d d = clothoidExit.PointAt(60.0);
            AssertNear(c.X, d.X, 3e-3);
            AssertNear(c.Y, d.Y, 3e-3);
        }

        [Fact]
        public void CubicParabola_Exit_MatchesAnIndependentHeadingWalk()
        {
            // exit direction after d = total turn - turn still ahead; walked in 1000 tiny steps
            double radius = 1000.0;
            double length = 100.0;
            double distance = 60.0;
            double xLength = NumericXLength(radius, length);
            double totalTurn = NumericSlopeAngle(length, radius, xLength);

            int steps = 1000;
            double h = distance / steps;
            double east = 0.0;
            double north = 0.0;
            for (int i = 0; i < steps; i++)
            {
                double middle = (i + 0.5) * h;
                double heading = totalTurn - NumericSlopeAngle(length - middle, radius, xLength);
                east += Math.Sin(heading) * h;
                north += Math.Cos(heading) * h;
            }

            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(far, far, length, 0.0, radius, Straight);
            AssertPoint(curve.PointAt(distance), east, north, 1e-5);
        }

        [Fact]
        public void CubicParabola_EndAzimuth_IsCloseToLengthOverTwoRadius()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);
            // the parabola turns slightly less than the clothoid (2.8648 degrees): about 2.8620
            AssertNear(curve.EndAzimuthDegrees, 2.8648, 0.01);

            double xLength = NumericXLength(1000.0, 100.0);
            double expected = Math.Atan(xLength / 2000.0) * 180.0 / Math.PI;
            AssertNear(curve.EndAzimuthDegrees, expected, 1e-6);
        }

        [Fact]
        public void CubicParabola_LeftCurve_IsTheMirrorImage()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            CubicParabolaCurve3D right = new CubicParabolaCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);
            CubicParabolaCurve3D left = new CubicParabolaCurve3D(far, far, 100.0, 0.0, Straight, -1000.0);
            AssertNear(left.PointAt(50.0).X, -right.PointAt(50.0).X, 1e-9);
            AssertNear(left.PointAt(50.0).Y, right.PointAt(50.0).Y, 1e-9);
        }

        [Fact]
        public void CubicParabola_Reverse_Works()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);

            CubicParabolaCurve3D entryGuess = new CubicParabolaCurve3D(far, far, 100.0, 20.0, Straight, 1000.0);
            AssertReverseWorks(new CubicParabolaCurve3D(far, entryGuess.PointAt(100.0), 100.0, 20.0, Straight, 1000.0));

            CubicParabolaCurve3D exitGuess = new CubicParabolaCurve3D(far, far, 100.0, 20.0, 1000.0, Straight);
            AssertReverseWorks(new CubicParabolaCurve3D(far, exitGuess.PointAt(100.0), 100.0, 20.0, 1000.0, Straight));

            CubicParabolaCurve3D leftGuess = new CubicParabolaCurve3D(far, far, 100.0, 300.0, Straight, -800.0);
            AssertReverseWorks(new CubicParabolaCurve3D(far, leftGuess.PointAt(100.0), 100.0, 300.0, Straight, -800.0));
        }

        [Fact]
        public void CubicParabola_NeedsExactlyOneStraightEnd()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            Assert.Throws<NotSupportedException>(() => new CubicParabolaCurve3D(far, far, 100.0, 0.0, 500.0, 1000.0));
            Assert.Throws<NotSupportedException>(() => new CubicParabolaCurve3D(far, far, 100.0, 0.0, Straight, Straight));
        }

        // =====================================================================
        // Biquadratic parabola (two parts, provisional definition)
        // =====================================================================

        private static double BiquadraticShape(double t)
        {
            if (t <= 0.5)
            {
                return 2.0 * t * t;
            }
            return 1.0 - 2.0 * (1.0 - t) * (1.0 - t);
        }

        [Fact]
        public void Biquadratic_Shape_IsBalancedAndSmooth()
        {
            // shape(t) + shape(1 - t) = 1, and the two halves meet at 1/2
            double[] samples = new double[] { 0.0, 0.1, 0.3, 0.45, 0.5, 0.7, 0.9, 1.0 };
            foreach (double t in samples)
            {
                AssertNear(BiquadraticShape(t) + BiquadraticShape(1.0 - t), 1.0, 1e-12);
            }
            AssertNear(BiquadraticShape(0.5), 0.5, 1e-12);
        }

        [Fact]
        public void Biquadratic_Matches_TheFineStepCalculation()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);

            BiquadraticParabolaCurve3D entry = new BiquadraticParabolaCurve3D(far, far, 80.0, 25.0, Straight, 400.0);
            double[] distances = new double[] { 20.0, 40.0, 50.0, 80.0 };   // first half, middle, second half, end
            foreach (double distance in distances)
            {
                Point3d reference = ReferencePoint(far, 25.0, Straight, 400.0, 80.0, distance, BiquadraticShape);
                AssertPoint(entry.PointAt(distance), reference.X, reference.Y, 1e-5);
            }

            BiquadraticParabolaCurve3D compound = new BiquadraticParabolaCurve3D(far, far, 120.0, 300.0, -800.0, 500.0);
            Point3d referenceCompound = ReferencePoint(far, 300.0, -800.0, 500.0, 120.0, 90.0, BiquadraticShape);
            AssertPoint(compound.PointAt(90.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void Biquadratic_FirstHalf_MatchesTheClosedFormula()
        {
            // y = x^4 / (6 R L^2), x along the start tangent (north), y sideways (east); R = 400, L = 80
            double radius = 400.0;
            double length = 80.0;
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            BiquadraticParabolaCurve3D curve = new BiquadraticParabolaCurve3D(far, far, length, 0.0, Straight, radius);

            double[] distances = new double[] { 10.0, 20.0, 30.0, 40.0 };
            foreach (double distance in distances)
            {
                Point3d point = curve.PointAt(distance);
                double x = point.Y;
                double expectedY = x * x * x * x / (6.0 * radius * length * length);
                AssertNear(point.X, expectedY, 1e-4);
            }
        }

        [Fact]
        public void Biquadratic_EndAzimuth_IsLengthOverTwoRadius_AndLeftIsMirror()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);
            BiquadraticParabolaCurve3D right = new BiquadraticParabolaCurve3D(far, far, 100.0, 0.0, Straight, 1000.0);
            BiquadraticParabolaCurve3D left = new BiquadraticParabolaCurve3D(far, far, 100.0, 0.0, Straight, -1000.0);
            AssertNear(right.EndAzimuthDegrees, 2.864789, 1e-4);
            AssertNear(left.PointAt(60.0).X, -right.PointAt(60.0).X, 1e-9);
            AssertNear(left.PointAt(60.0).Y, right.PointAt(60.0).Y, 1e-9);
        }

        [Fact]
        public void Biquadratic_Reverse_Works()
        {
            Point3d far = new Point3d(0.0, 0.0, 0.0);

            BiquadraticParabolaCurve3D entryGuess = new BiquadraticParabolaCurve3D(far, far, 100.0, 20.0, Straight, 1000.0);
            AssertReverseWorks(new BiquadraticParabolaCurve3D(far, entryGuess.PointAt(100.0), 100.0, 20.0, Straight, 1000.0));

            BiquadraticParabolaCurve3D exitGuess = new BiquadraticParabolaCurve3D(far, far, 100.0, 70.0, 1000.0, Straight);
            AssertReverseWorks(new BiquadraticParabolaCurve3D(far, exitGuess.PointAt(100.0), 100.0, 70.0, 1000.0, Straight));
        }

        [Fact]
        public void FindClosestPoint_BeforeTheStart_GivesTheStart()
        {
            ClosestPointResult result = ExitCurve().FindClosestPoint(new Point3d(-5.0, -5.0, 100.0));
            AssertNear(result.DistanceAlongCurve, 0.0, 0.01);
        }
    }
}
