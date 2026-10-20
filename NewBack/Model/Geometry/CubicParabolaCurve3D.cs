namespace GeoModel.Geometry
{
    using System;
    using Model.Geometry;

    /// <summary>
    /// Cubic parabola transition between a straight and a circle (either way round).
    /// </summary>
    public class CubicParabolaCurve3D : TransitionCurve3D
    {
        private readonly bool _startsStraight;   
        private readonly double _sign;           
        private readonly double _radius;         
        private readonly double _xLength;        

        public CubicParabolaCurve3D(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
            : base(start, end, length, startAzimuthDegrees, startRadius, endRadius)
        {
            bool startIsStraight = StartCurvature == 0.0;
            bool endIsStraight = EndCurvature == 0.0;

            if (startIsStraight == endIsStraight)
            {
                throw new NotSupportedException("A cubic parabola needs exactly one straight end (straight to curve, or curve to straight).");
            }

            double curvature = startIsStraight ? EndCurvature : StartCurvature;

            _startsStraight = startIsStraight;
            _radius = 1.0 / Math.Abs(curvature);
            _sign = curvature >= 0.0 ? 1.0 : -1.0;
            _xLength = FindXLength();
        }

        protected override double ShapeIntegral(double t)
        {
            return t * t / 2.0;
        }

        protected override TransitionCurve3D CreateSameKind(Point3d start, Point3d end, double length, double startAzimuthDegrees, double startRadius, double endRadius)
        {
            return new CubicParabolaCurve3D(start, end, length, startAzimuthDegrees, startRadius, endRadius);
        }

        protected override double TurnedAngle(double s)
        {
            double angle;
            if (_startsStraight)
            {
                angle = SlopeAngleAtArc(s);
            }
            else
            {
                double distanceLeft = Length - s;
                if (distanceLeft < 0.0) distanceLeft = 0.0;
                angle = SlopeAngleAtArc(Length) - SlopeAngleAtArc(distanceLeft);
            }
            return _sign * angle;
        }

        private double SlopeAngleAtArc(double arcDistance)
        {
            double x = Arc2X(arcDistance, _xLength);
            return Math.Atan(x * x / (2.0 * _radius * _xLength));
        }

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

        private double Arc2X(double arcDistance, double xLength)
        {
            if (arcDistance <= 0.0) return 0.0;

            double c = 2.0 * _radius * xLength;
            double x = arcDistance;   
            for (int i = 0; i < 20; i++)
            {
                double difference = ArcLengthUpToX(x, xLength) - arcDistance;
                double slope = Math.Sqrt(1.0 + (x * x / c) * (x * x / c));   
                double step = difference / slope;
                x -= step;
                if (Math.Abs(step) < 1e-12) break;
            }
            return x;
        }

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
                if (ArcLengthUpToX(middle, middle) < Length) low = middle;
                else high = middle;
            }
            return (low + high) / 2.0;
        }
    }
}
