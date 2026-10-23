using System;
using System.Collections.Generic;
using GeoModel.Geometry;
using Model.Geometry;
using Xunit;

namespace TransitionCurves.Tests
{
    /// <summary>
    /// Tests for the transition curves.
    ///
    /// Every test is one small story:
    ///   1. it sets its own inputs (start, end, length, azimuth, radius, nextRadius) inside the test,
    ///      with the names of the data model,
    ///   2. it creates the curve object,
    ///   3. it calls PointAt / TangentAt / EndAzimuthDegrees ... and checks x, y, z.
    ///
    /// Two kinds of expected values:
    ///   - known numbers from the hand calculation (radius 1000 m, length 100 m, distance 50 m),
    ///   - an independent fine-step calculation (ReferencePoint) that does not use the curve classes.
    ///
    /// A straight is written as double.PositiveInfinity in these tests (0 and a huge radius work too, see
    /// Clothoid_AStraightCanBeStoredAsZeroInfinityOrHuge).
    /// </summary>
    public class TransitionCurveTests
    {
        // =====================================================================
        // Small helpers for checking (they hold no test data)
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

        // =====================================================================
        // Independent reference calculation (does not use the curve classes)
        // =====================================================================

        private static double ClothoidShape(double t) { return t; }
        private static double CosineShape(double t) { return (1.0 - Math.Cos(Math.PI * t)) / 2.0; }
        private static double SineShape(double t) { return t - Math.Sin(2.0 * Math.PI * t) / (2.0 * Math.PI); }
        private static double BlossShape(double t) { return 3.0 * t * t - 2.0 * t * t * t; }

        private static double BiquadraticShape(double t)
        {
            if (t <= 0.5)
            {
                return 2.0 * t * t;
            }
            return 1.0 - 2.0 * (1.0 - t) * (1.0 - t);
        }

        private static double ToCurvature(double radius)
        {
            if (double.IsInfinity(radius) || radius == 0.0)
            {
                return 0.0;
            }
            return 1.0 / radius;
        }

        /// <summary>
        /// Walks 200000 tiny steps along the curve, using the curvature itself (not the formulas of the
        /// curve classes). Returns the x/y position after "distance" metres.
        /// </summary>
        private static Point3d ReferencePoint(Point3d start, double azimuth, double radius, double nextRadius, double length, double distance, Func<double, double> shape)
        {
            double k1 = ToCurvature(radius);
            double k2 = ToCurvature(nextRadius);
            int steps = 200000;
            double h = distance / steps;
            double x = start.X;
            double y = start.Y;
            double heading = azimuth * Math.PI / 180.0;

            for (int i = 0; i < steps; i++)
            {
                double middle = (i + 0.5) * h;
                double k = k1 + (k2 - k1) * shape(middle / length);
                double middleHeading = heading + k * h / 2.0;
                x += Math.Sin(middleHeading) * h;
                y += Math.Cos(middleHeading) * h;
                heading += k * h;
            }
            return new Point3d(x, y, 0.0);
        }

        /// <summary>The old curve at 25 m must be the reversed curve at 75 m (curve length 100 m).</summary>
        private static void AssertReverseWorks(TransitionCurve3D curve)
        {
            Curve3D back = curve.Reverse();
            Point3d expected = curve.PointAt(25.0);
            Point3d actual = back.PointAt(75.0);
            AssertPoint(actual, expected.X, expected.Y, 1e-4);
        }

        // =====================================================================
        // Clothoid: known numbers (start straight, radius 1000 m at the end, length 100 m, facing north)
        // =====================================================================

        [Fact]
        public void Clothoid_Entry_At50m_MatchesHandCalculation()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;   // straight
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d p = curve.PointAt(50.0);

            AssertPoint(p, 0.208331, 49.999219, 1e-5);
            AssertNear(p.Z, 100.5, 1e-9);
        }

        [Fact]
        public void Clothoid_Entry_AtEnd_MatchesHandCalculation()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertPoint(curve.PointAt(100.0), 1.666369, 99.975003, 1e-5);
        }

        [Fact]
        public void Clothoid_Exit_MatchesHandCalculation()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(3.332381, 99.933344, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = 1000.0;
            double nextRadius = double.PositiveInfinity;   // straight

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertPoint(curve.PointAt(25.0), 0.286446, 24.997860, 1e-5);
            AssertPoint(curve.PointAt(50.0), 1.041532, 49.986199, 1e-5);
            AssertPoint(curve.PointAt(75.0), 2.108912, 74.963310, 1e-5);
            AssertPoint(curve.PointAt(100.0), 3.332381, 99.933344, 1e-5);
        }

        [Fact]
        public void Clothoid_LeftCurve_IsTheMirrorImage()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(-1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = -1000.0;   // negative = left

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertPoint(curve.PointAt(50.0), -0.208331, 49.999219, 1e-5);
        }

        [Fact]
        public void Clothoid_FacingEast_RightCurveBendsSouth()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(99.975003, -1.666369, 0.0);
            double length = 100.0;
            double azimuth = 90.0;   // east
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertPoint(curve.PointAt(50.0), 49.999219, -0.208331, 1e-5);
        }

        [Fact]
        public void Clothoid_AStraightCanBeStoredAsZeroInfinityOrHuge()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double nextRadius = 1000.0;

            ClothoidCurve3D withZero = new ClothoidCurve3D(start, end, length, azimuth, 0.0, nextRadius);
            ClothoidCurve3D withHuge = new ClothoidCurve3D(start, end, length, azimuth, 1e12, nextRadius);
            AssertPoint(withZero.PointAt(50.0), 0.208331, 49.999219, 1e-5);
            AssertPoint(withHuge.PointAt(50.0), 0.208331, 49.999219, 1e-5);

            // the same for the end of an exit transition
            Point3d exitEnd = new Point3d(3.332381, 99.933344, 101.0);
            ClothoidCurve3D endZero = new ClothoidCurve3D(start, exitEnd, length, azimuth, 1000.0, 0.0);
            AssertPoint(endZero.PointAt(50.0), 1.041532, 49.986199, 1e-5);
        }

        // =====================================================================
        // Direction (tangent), end azimuth, end gap
        // =====================================================================

        [Fact]
        public void Clothoid_Tangent_AtTheEnd()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d tangent = curve.TangentAt(100.0);

            AssertNear(tangent.X, 0.04998, 1e-4);
            AssertNear(tangent.Y, 0.99870, 1e-4);
            AssertNear(tangent.Z, 0.01, 1e-4);
        }

        [Fact]
        public void Clothoid_Tangent_IsAUnitVector()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d tangent = curve.TangentAt(37.0);

            double size = Math.Sqrt(tangent.X * tangent.X + tangent.Y * tangent.Y + tangent.Z * tangent.Z);
            AssertNear(size, 1.0, 1e-9);
        }

        [Fact]
        public void Clothoid_EndAzimuth_IsLengthOverTwoRadius()
        {
            // length / (2 * radius) = 100 / 2000 = 0.05 rad = 2.8648 degrees
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            double length = 100.0;
            double azimuth = 0.0;

            ClothoidCurve3D entry = new ClothoidCurve3D(start, new Point3d(1.666369, 99.975003, 101.0), length, azimuth, double.PositiveInfinity, 1000.0);
            ClothoidCurve3D exit = new ClothoidCurve3D(start, new Point3d(3.332381, 99.933344, 101.0), length, azimuth, 1000.0, double.PositiveInfinity);

            AssertNear(entry.EndAzimuthDegrees, 2.864789, 1e-4);
            AssertNear(exit.EndAzimuthDegrees, 2.864789, 1e-4);
        }

        [Fact]
        public void Clothoid_LeftCurve_EndAzimuthIsBelow360()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(-1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = -1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertNear(curve.EndAzimuthDegrees, 360.0 - 2.864789, 1e-4);
        }

        [Fact]
        public void Clothoid_EndGap_IsNearZeroForConsistentData()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            double length = 100.0;
            double azimuth = 0.0;

            ClothoidCurve3D entry = new ClothoidCurve3D(start, new Point3d(1.666369, 99.975003, 101.0), length, azimuth, double.PositiveInfinity, 1000.0);
            ClothoidCurve3D exit = new ClothoidCurve3D(start, new Point3d(3.332381, 99.933344, 101.0), length, azimuth, 1000.0, double.PositiveInfinity);

            AssertNear(entry.EndGapMeters, 0.0, 1e-5);
            AssertNear(exit.EndGapMeters, 0.0, 1e-5);
        }

        [Fact]
        public void Clothoid_EndGap_ShowsWhenTheEndPointDoesNotFit()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d wrongEnd = new Point3d(5.0, 99.975003, 101.0);   // x should be 1.666369
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, wrongEnd, length, azimuth, radius, nextRadius);

            AssertNear(curve.EndGapMeters, 3.333631, 1e-5);
        }

        // =====================================================================
        // Edges, input checks
        // =====================================================================

        [Fact]
        public void DistancesOutsideTheCurve_AreClamped()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertPoint(curve.PointAt(-5.0), 0.0, 0.0, 1e-9);
            AssertPoint(curve.PointAt(500.0), 1.666369, 99.975003, 1e-5);
        }

        [Fact]
        public void LengthZero_IsRefused()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 0.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            Assert.Throws<ArgumentException>(() => new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius));
        }

        [Fact]
        public void MissingPoints_AreRefused()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            Assert.Throws<ArgumentNullException>(() => new ClothoidCurve3D(null, end, length, azimuth, radius, nextRadius));
            Assert.Throws<ArgumentNullException>(() => new ClothoidCurve3D(start, null, length, azimuth, radius, nextRadius));
        }

        // =====================================================================
        // Against the independent fine-step calculation
        // =====================================================================

        [Fact]
        public void Clothoid_BigTurn_UsesTheIntegralAndStillMatches()
        {
            // length 200, radius 100: the curve turns 1 radian, too much for the short formula
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 200.0;
            double azimuth = 30.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 100.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d reference = ReferencePoint(start, azimuth, radius, nextRadius, length, 150.0, ClothoidShape);

            AssertPoint(curve.PointAt(150.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Clothoid_CurveToCurve_Matches()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 250.0;
            double radius = 500.0;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d reference = ReferencePoint(start, azimuth, radius, nextRadius, length, 60.0, ClothoidShape);

            AssertPoint(curve.PointAt(60.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Clothoid_RightToLeft_SCurve_Matches()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 10.0;
            double radius = 1000.0;
            double nextRadius = -1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d reference = ReferencePoint(start, azimuth, radius, nextRadius, length, 80.0, ClothoidShape);

            AssertPoint(curve.PointAt(80.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Cosine_Matches()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);

            // straight to curve
            double length = 100.0;
            double azimuth = 20.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;
            CosineCurve3D entry = new CosineCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d referenceEntry = ReferencePoint(start, azimuth, radius, nextRadius, length, 50.0, CosineShape);
            AssertPoint(entry.PointAt(50.0), referenceEntry.X, referenceEntry.Y, 1e-5);

            // curve to curve
            double length2 = 120.0;
            double azimuth2 = 300.0;
            double radius2 = 800.0;
            double nextRadius2 = -400.0;
            CosineCurve3D compound = new CosineCurve3D(start, end, length2, azimuth2, radius2, nextRadius2);
            Point3d referenceCompound = ReferencePoint(start, azimuth2, radius2, nextRadius2, length2, 70.0, CosineShape);
            AssertPoint(compound.PointAt(70.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void Sine_Matches()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);

            // curve to straight
            double length = 100.0;
            double azimuth = 45.0;
            double radius = 1000.0;
            double nextRadius = 0.0;
            SineCurve3D exit = new SineCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d referenceExit = ReferencePoint(start, azimuth, radius, nextRadius, length, 60.0, SineShape);
            AssertPoint(exit.PointAt(60.0), referenceExit.X, referenceExit.Y, 1e-5);

            // curve to curve
            double length2 = 150.0;
            double azimuth2 = 100.0;
            double radius2 = -600.0;
            double nextRadius2 = 900.0;
            SineCurve3D compound = new SineCurve3D(start, end, length2, azimuth2, radius2, nextRadius2);
            Point3d referenceCompound = ReferencePoint(start, azimuth2, radius2, nextRadius2, length2, 110.0, SineShape);
            AssertPoint(compound.PointAt(110.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void Bloss_Matches()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);

            // straight to curve
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;
            BlossCurve3D entry = new BlossCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d referenceEntry = ReferencePoint(start, azimuth, radius, nextRadius, length, 50.0, BlossShape);
            AssertPoint(entry.PointAt(50.0), referenceEntry.X, referenceEntry.Y, 1e-5);

            // curve to curve
            double length2 = 130.0;
            double azimuth2 = 200.0;
            double radius2 = -700.0;
            double nextRadius2 = 500.0;
            BlossCurve3D compound = new BlossCurve3D(start, end, length2, azimuth2, radius2, nextRadius2);
            Point3d referenceCompound = ReferencePoint(start, azimuth2, radius2, nextRadius2, length2, 90.0, BlossShape);
            AssertPoint(compound.PointAt(90.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void AllKinds_TurnTheSameTotalAngle()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            List<TransitionCurve3D> kinds = new List<TransitionCurve3D>();
            kinds.Add(new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius));
            kinds.Add(new CosineCurve3D(start, end, length, azimuth, radius, nextRadius));
            kinds.Add(new SineCurve3D(start, end, length, azimuth, radius, nextRadius));
            kinds.Add(new BlossCurve3D(start, end, length, azimuth, radius, nextRadius));
            kinds.Add(new BiquadraticParabolaCurve3D(start, end, length, azimuth, radius, nextRadius));

            foreach (TransitionCurve3D kind in kinds)
            {
                AssertNear(kind.EndAzimuthDegrees, 2.864789, 1e-4);
            }
        }

        // =====================================================================
        // Reverse
        // =====================================================================

        [Fact]
        public void Reverse_Clothoid_EntryExitAndLeft()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            double length = 100.0;
            double azimuth = 0.0;

            ClothoidCurve3D entry = new ClothoidCurve3D(start, new Point3d(1.666369, 99.975003, 101.0), length, azimuth, double.PositiveInfinity, 1000.0);
            ClothoidCurve3D exit = new ClothoidCurve3D(start, new Point3d(3.332381, 99.933344, 101.0), length, azimuth, 1000.0, double.PositiveInfinity);
            ClothoidCurve3D left = new ClothoidCurve3D(start, new Point3d(-1.666369, 99.975003, 101.0), length, azimuth, double.PositiveInfinity, -1000.0);

            AssertReverseWorks(entry);
            AssertReverseWorks(exit);
            AssertReverseWorks(left);
        }

        [Fact]
        public void Reverse_CosineSineAndBloss()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d anyEnd = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;

            // each curve is built twice: first to find its true end point, then with that end point
            CosineCurve3D cosineGuess = new CosineCurve3D(start, anyEnd, length, 20.0, double.PositiveInfinity, 1000.0);
            AssertReverseWorks(new CosineCurve3D(start, cosineGuess.PointAt(length), length, 20.0, double.PositiveInfinity, 1000.0));

            SineCurve3D sineGuess = new SineCurve3D(start, anyEnd, length, 45.0, 1000.0, 0.0);
            AssertReverseWorks(new SineCurve3D(start, sineGuess.PointAt(length), length, 45.0, 1000.0, 0.0));

            BlossCurve3D blossGuess = new BlossCurve3D(start, anyEnd, length, 70.0, 1000.0, 0.0);
            AssertReverseWorks(new BlossCurve3D(start, blossGuess.PointAt(length), length, 70.0, 1000.0, 0.0));
        }

        [Fact]
        public void Reverse_Twice_GivesTheOriginalCurve()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Curve3D twice = curve.Reverse().Reverse();

            Point3d original = curve.PointAt(50.0);
            AssertPoint(twice.PointAt(50.0), original.X, original.Y, 1e-4);
        }

        // =====================================================================
        // Closest point
        // =====================================================================

        [Fact]
        public void FindClosestPoint_FindsTheRightDistanceAlongTheCurve()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(1.666369, 99.975003, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            Point3d onCurve = curve.PointAt(30.0);
            Point3d beside = new Point3d(onCurve.X + 0.5, onCurve.Y, onCurve.Z);

            ClosestPointResult result = curve.FindClosestPoint(beside);

            AssertNear(result.DistanceAlongCurve, 30.0, 0.05);
            AssertNear(result.Distance, 0.5, 0.01);
        }

        [Fact]
        public void FindClosestPoint_BeforeTheStart_GivesTheStart()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(3.332381, 99.933344, 101.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = 1000.0;
            double nextRadius = double.PositiveInfinity;

            ClothoidCurve3D curve = new ClothoidCurve3D(start, end, length, azimuth, radius, nextRadius);
            ClosestPointResult result = curve.FindClosestPoint(new Point3d(-5.0, -5.0, 100.0));

            AssertNear(result.DistanceAlongCurve, 0.0, 0.01);
        }

        // =====================================================================
        // Cubic parabola
        // The reference uses the closed formula  sideways = along^3 / (6 * radius * xLength)
        // and numeric arc lengths, not the series or the Newton steps of the class.
        // ("along" and "sideways" are measured from the start direction; facing north they are y and x.)
        // =====================================================================

        /// <summary>Arc length of sideways = along^3 / (6 R Lx) from 0 to "along", by 2000 midpoint steps.</summary>
        private static double NumericArc(double along, double radius, double xLength)
        {
            double c = 2.0 * radius * xLength;
            int steps = 2000;
            double h = along / steps;
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

        /// <summary>The "along" value that belongs to a distance along the curve (bisection).</summary>
        private static double NumericAlong(double distance, double radius, double xLength)
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
            double along = NumericAlong(distance, radius, xLength);
            return Math.Atan(along * along / (2.0 * radius * xLength));
        }

        [Fact]
        public void CubicParabola_Entry_MatchesTheClosedFormula()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);
            double xLength = NumericXLength(nextRadius, length);

            double[] distances = new double[] { 25.0, 50.0, 75.0, 100.0 };
            foreach (double distance in distances)
            {
                double along = NumericAlong(distance, nextRadius, xLength);
                double sideways = along * along * along / (6.0 * nextRadius * xLength);
                // facing north: map x = sideways, map y = along
                AssertPoint(curve.PointAt(distance), sideways, along, 5e-6);
            }
        }

        [Fact]
        public void CubicParabola_Entry_SidewaysAt50m_Is0Point2083()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertNear(curve.PointAt(50.0).X, 0.2083, 2e-4);
        }

        [Fact]
        public void CubicParabola_IsAboutOneMillimetreFromTheClothoid()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;

            CubicParabolaCurve3D cubic = new CubicParabolaCurve3D(start, end, length, azimuth, double.PositiveInfinity, 1000.0);
            ClothoidCurve3D clothoid = new ClothoidCurve3D(start, end, length, azimuth, double.PositiveInfinity, 1000.0);
            Point3d a = cubic.PointAt(100.0);
            Point3d b = clothoid.PointAt(100.0);
            AssertNear(a.X, b.X, 3e-3);
            AssertNear(a.Y, b.Y, 3e-3);

            CubicParabolaCurve3D cubicExit = new CubicParabolaCurve3D(start, end, length, azimuth, 1000.0, double.PositiveInfinity);
            ClothoidCurve3D clothoidExit = new ClothoidCurve3D(start, end, length, azimuth, 1000.0, double.PositiveInfinity);
            Point3d c = cubicExit.PointAt(60.0);
            Point3d d = clothoidExit.PointAt(60.0);
            AssertNear(c.X, d.X, 3e-3);
            AssertNear(c.Y, d.Y, 3e-3);
        }

        [Fact]
        public void CubicParabola_Exit_MatchesAnIndependentHeadingWalk()
        {
            // exit direction after d = total turn - turn still ahead; walked in 1000 tiny steps
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = 1000.0;
            double nextRadius = double.PositiveInfinity;
            double distance = 60.0;

            double xLength = NumericXLength(radius, length);
            double totalTurn = NumericSlopeAngle(length, radius, xLength);

            int steps = 1000;
            double h = distance / steps;
            double x = 0.0;
            double y = 0.0;
            for (int i = 0; i < steps; i++)
            {
                double middle = (i + 0.5) * h;
                double heading = totalTurn - NumericSlopeAngle(length - middle, radius, xLength);
                x += Math.Sin(heading) * h;
                y += Math.Cos(heading) * h;
            }

            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);

            AssertPoint(curve.PointAt(distance), x, y, 1e-5);
        }

        [Fact]
        public void CubicParabola_EndAzimuth_IsCloseToLengthOverTwoRadius()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            CubicParabolaCurve3D curve = new CubicParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);

            // the parabola turns slightly less than the clothoid (2.8648 degrees): about 2.8620
            AssertNear(curve.EndAzimuthDegrees, 2.8648, 0.01);

            double xLength = NumericXLength(nextRadius, length);
            double expected = Math.Atan(xLength / (2.0 * nextRadius)) * 180.0 / Math.PI;
            AssertNear(curve.EndAzimuthDegrees, expected, 1e-6);
        }

        [Fact]
        public void CubicParabola_LeftCurve_IsTheMirrorImage()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;

            CubicParabolaCurve3D right = new CubicParabolaCurve3D(start, end, length, azimuth, radius, 1000.0);
            CubicParabolaCurve3D left = new CubicParabolaCurve3D(start, end, length, azimuth, radius, -1000.0);

            AssertNear(left.PointAt(50.0).X, -right.PointAt(50.0).X, 1e-9);
            AssertNear(left.PointAt(50.0).Y, right.PointAt(50.0).Y, 1e-9);
        }

        [Fact]
        public void CubicParabola_Reverse_Works()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d anyEnd = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double straight = double.PositiveInfinity;

            CubicParabolaCurve3D entryGuess = new CubicParabolaCurve3D(start, anyEnd, length, 20.0, straight, 1000.0);
            AssertReverseWorks(new CubicParabolaCurve3D(start, entryGuess.PointAt(length), length, 20.0, straight, 1000.0));

            CubicParabolaCurve3D exitGuess = new CubicParabolaCurve3D(start, anyEnd, length, 20.0, 1000.0, straight);
            AssertReverseWorks(new CubicParabolaCurve3D(start, exitGuess.PointAt(length), length, 20.0, 1000.0, straight));

            CubicParabolaCurve3D leftGuess = new CubicParabolaCurve3D(start, anyEnd, length, 300.0, straight, -800.0);
            AssertReverseWorks(new CubicParabolaCurve3D(start, leftGuess.PointAt(length), length, 300.0, straight, -800.0));
        }

        [Fact]
        public void CubicParabola_NeedsExactlyOneStraightEnd()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;

            Assert.Throws<NotSupportedException>(() => new CubicParabolaCurve3D(start, end, length, azimuth, 500.0, 1000.0));
            Assert.Throws<NotSupportedException>(() => new CubicParabolaCurve3D(start, end, length, azimuth, double.PositiveInfinity, double.PositiveInfinity));
        }

        // =====================================================================
        // Biquadratic parabola (two parts, provisional definition)
        // =====================================================================

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
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);

            // straight to curve, checked in the first half, in the middle, in the second half and at the end
            double length = 80.0;
            double azimuth = 25.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 400.0;
            BiquadraticParabolaCurve3D entry = new BiquadraticParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);
            double[] distances = new double[] { 20.0, 40.0, 50.0, 80.0 };
            foreach (double distance in distances)
            {
                Point3d reference = ReferencePoint(start, azimuth, radius, nextRadius, length, distance, BiquadraticShape);
                AssertPoint(entry.PointAt(distance), reference.X, reference.Y, 1e-5);
            }

            // curve to curve
            double length2 = 120.0;
            double azimuth2 = 300.0;
            double radius2 = -800.0;
            double nextRadius2 = 500.0;
            BiquadraticParabolaCurve3D compound = new BiquadraticParabolaCurve3D(start, end, length2, azimuth2, radius2, nextRadius2);
            Point3d referenceCompound = ReferencePoint(start, azimuth2, radius2, nextRadius2, length2, 90.0, BiquadraticShape);
            AssertPoint(compound.PointAt(90.0), referenceCompound.X, referenceCompound.Y, 1e-5);
        }

        [Fact]
        public void Biquadratic_FirstHalf_MatchesTheClosedFormula()
        {
            // sideways = along^4 / (6 R L^2), "along" in the start direction (north: map y), sideways = map x
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 80.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 400.0;

            BiquadraticParabolaCurve3D curve = new BiquadraticParabolaCurve3D(start, end, length, azimuth, radius, nextRadius);

            double[] distances = new double[] { 10.0, 20.0, 30.0, 40.0 };
            foreach (double distance in distances)
            {
                Point3d point = curve.PointAt(distance);
                double along = point.Y;
                double expectedSideways = along * along * along * along / (6.0 * nextRadius * length * length);
                AssertNear(point.X, expectedSideways, 1e-4);
            }
        }

        [Fact]
        public void Biquadratic_EndAzimuth_IsLengthOverTwoRadius_AndLeftIsMirror()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;

            BiquadraticParabolaCurve3D right = new BiquadraticParabolaCurve3D(start, end, length, azimuth, radius, 1000.0);
            BiquadraticParabolaCurve3D left = new BiquadraticParabolaCurve3D(start, end, length, azimuth, radius, -1000.0);

            AssertNear(right.EndAzimuthDegrees, 2.864789, 1e-4);
            AssertNear(left.PointAt(60.0).X, -right.PointAt(60.0).X, 1e-9);
            AssertNear(left.PointAt(60.0).Y, right.PointAt(60.0).Y, 1e-9);
        }

        [Fact]
        public void Biquadratic_Reverse_Works()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d anyEnd = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double straight = double.PositiveInfinity;

            BiquadraticParabolaCurve3D entryGuess = new BiquadraticParabolaCurve3D(start, anyEnd, length, 20.0, straight, 1000.0);
            AssertReverseWorks(new BiquadraticParabolaCurve3D(start, entryGuess.PointAt(length), length, 20.0, straight, 1000.0));

            BiquadraticParabolaCurve3D exitGuess = new BiquadraticParabolaCurve3D(start, anyEnd, length, 70.0, 1000.0, straight);
            AssertReverseWorks(new BiquadraticParabolaCurve3D(start, exitGuess.PointAt(length), length, 70.0, 1000.0, straight));
        }

        // =====================================================================
        // Wiener Bogen (bend + cant). f(t) and h are ASSUMPTIONS until Khaled confirms them.
        // =====================================================================

        private static double WienerShape(double t)
        {
            return 35.0 * Math.Pow(t, 4) - 84.0 * Math.Pow(t, 5) + 70.0 * Math.Pow(t, 6) - 20.0 * Math.Pow(t, 7);
        }

        private static double WienerShapeSecond(double t)
        {
            return 420.0 * Math.Pow(t, 2) - 1680.0 * Math.Pow(t, 3) + 2100.0 * Math.Pow(t, 4) - 840.0 * Math.Pow(t, 5);
        }

        private static double TiltAngle(double cantMillimetres, double sideOfCurve)
        {
            return sideOfCurve * Math.Asin(cantMillimetres / 1500.0);
        }

        /// <summary>
        /// Independent walk: uses the curvature formula directly, including the cant part with f''(t).
        /// sideStart / sideEnd: +1 = right, -1 = left (side of the tilt at the start / end).
        /// </summary>
        private static Point3d WienerReferencePoint(Point3d start, double azimuth, double radius, double nextRadius, double length,
            double distance, double cant, double nextCant, double height, double sideStart, double sideEnd)
        {
            double k1 = ToCurvature(radius);
            double k2 = ToCurvature(nextRadius);
            double roll1 = TiltAngle(cant, sideStart);
            double roll2 = TiltAngle(nextCant, sideEnd);
            int steps = 200000;
            double h = distance / steps;
            double x = start.X;
            double y = start.Y;
            double heading = azimuth * Math.PI / 180.0;

            for (int i = 0; i < steps; i++)
            {
                double middle = (i + 0.5) * h;
                double t = middle / length;
                double k = k1 + (k2 - k1) * WienerShape(t) - height * (roll2 - roll1) * WienerShapeSecond(t) / (length * length);
                double middleHeading = heading + k * h / 2.0;
                x += Math.Sin(middleHeading) * h;
                y += Math.Cos(middleHeading) * h;
                heading += k * h;
            }
            return new Point3d(x, y, 0.0);
        }

        [Fact]
        public void Wiener_WithoutCant_MatchesPlainCurvatureRamp()
        {
            Point3d start = new Point3d(0.0, 0.0, 100.0);
            Point3d end = new Point3d(0.0, 0.0, 101.0);
            double length = 100.0;
            double azimuth = 30.0;
            double radius = double.PositiveInfinity;
            double nextRadius = 1000.0;

            WienerBogenCurve3D curve = new WienerBogenCurve3D(start, end, length, azimuth, radius, nextRadius, 0.0, 0.0, 1.8);
            Point3d p = curve.PointAt(60.0);
            Point3d reference = ReferencePoint(start, azimuth, radius, nextRadius, length, 60.0, WienerShape);

            AssertPoint(p, reference.X, reference.Y, 1e-5);
            AssertNear(p.Z, 100.6, 1e-9);
        }

        [Fact]
        public void Wiener_SameCantAtBothEnds_HasNoCantEffect()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = 1000.0;
            double nextRadius = 600.0;

            WienerBogenCurve3D withCant = new WienerBogenCurve3D(start, end, length, azimuth, radius, nextRadius, 100.0, 100.0, 1.8);
            WienerBogenCurve3D withoutCant = new WienerBogenCurve3D(start, end, length, azimuth, radius, nextRadius, 0.0, 0.0, 1.8);

            AssertPoint(withCant.PointAt(70.0), withoutCant.PointAt(70.0).X, withoutCant.PointAt(70.0).Y, 1e-12);
        }

        [Fact]
        public void Wiener_EntryWithCantRamp_MatchesIndependentWalk()
        {
            Point3d start = new Point3d(10.0, 20.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 120.0;
            double azimuth = 45.0;
            double radius = double.PositiveInfinity;   // straight at the start
            double nextRadius = 800.0;                 // right curve at the end
            double cant = 0.0;
            double nextCant = 150.0;                   // mm
            double height = 1.8;                       // m (example value)

            WienerBogenCurve3D curve = new WienerBogenCurve3D(start, end, length, azimuth, radius, nextRadius, cant, nextCant, height);

            foreach (double distance in new double[] { 30.0, 60.0, 90.0, 120.0 })
            {
                Point3d reference = WienerReferencePoint(start, azimuth, radius, nextRadius, length, distance, cant, nextCant, height, 1.0, 1.0);
                AssertPoint(curve.PointAt(distance), reference.X, reference.Y, 1e-5);
            }
        }

        [Fact]
        public void Wiener_CompoundCurveWithCantChange_MatchesIndependentWalk()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 150.0;
            double azimuth = 200.0;
            double radius = -1200.0;     // left
            double nextRadius = -500.0;  // tighter left
            double cant = 60.0;
            double nextCant = 140.0;
            double height = 1.6;

            WienerBogenCurve3D curve = new WienerBogenCurve3D(start, end, length, azimuth, radius, nextRadius, cant, nextCant, height);
            Point3d reference = WienerReferencePoint(start, azimuth, radius, nextRadius, length, 100.0, cant, nextCant, height, -1.0, -1.0);

            AssertPoint(curve.PointAt(100.0), reference.X, reference.Y, 1e-5);
        }

        [Fact]
        public void Wiener_LeftCurve_IsMirrorOfRightCurve()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;

            WienerBogenCurve3D right = new WienerBogenCurve3D(start, end, length, azimuth, radius, 1000.0, 0.0, 120.0, 1.8);
            WienerBogenCurve3D left = new WienerBogenCurve3D(start, end, length, azimuth, radius, -1000.0, 0.0, 120.0, 1.8);

            AssertNear(left.PointAt(60.0).X, -right.PointAt(60.0).X, 1e-9);
            AssertNear(left.PointAt(60.0).Y, right.PointAt(60.0).Y, 1e-9);
        }

        [Fact]
        public void Wiener_EndAzimuth_IsNotChangedByCant()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double azimuth = 0.0;
            double radius = double.PositiveInfinity;

            WienerBogenCurve3D curve = new WienerBogenCurve3D(start, end, length, azimuth, radius, 1000.0, 0.0, 150.0, 1.8);

            // f'(1) = 0, so the cant part has vanished at the end: only the average curvature counts.
            AssertNear(curve.EndAzimuthDegrees, 2.864789, 1e-4);
        }

        [Fact]
        public void Wiener_Reverse_Works()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d anyEnd = new Point3d(0.0, 0.0, 0.0);
            double length = 100.0;
            double straight = double.PositiveInfinity;

            WienerBogenCurve3D entryGuess = new WienerBogenCurve3D(start, anyEnd, length, 20.0, straight, 1000.0, 0.0, 150.0, 1.8);
            AssertReverseWorks(new WienerBogenCurve3D(start, entryGuess.PointAt(length), length, 20.0, straight, 1000.0, 0.0, 150.0, 1.8));

            WienerBogenCurve3D compoundGuess = new WienerBogenCurve3D(start, anyEnd, length, 70.0, 1200.0, 600.0, 50.0, 130.0, 1.8);
            AssertReverseWorks(new WienerBogenCurve3D(start, compoundGuess.PointAt(length), length, 70.0, 1200.0, 600.0, 50.0, 130.0, 1.8));
        }

        [Fact]
        public void Wiener_BadInputs_AreRejected()
        {
            Point3d start = new Point3d(0.0, 0.0, 0.0);
            Point3d end = new Point3d(0.0, 0.0, 0.0);

            Assert.Throws<ArgumentException>(() => new WienerBogenCurve3D(start, end, 100.0, 0.0, 0.0, 1000.0, -5.0, 100.0, 1.8));
            Assert.Throws<ArgumentException>(() => new WienerBogenCurve3D(start, end, 100.0, 0.0, 0.0, 1000.0, 0.0, 1500.0, 1.8));
            Assert.Throws<ArgumentException>(() => new WienerBogenCurve3D(start, end, 100.0, 0.0, 0.0, 1000.0, 0.0, 100.0, -1.0));
        }
    }
}