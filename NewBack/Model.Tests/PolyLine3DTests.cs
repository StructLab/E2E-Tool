
using GeoModel.Geometry;
using Model.Geometry;
using Xunit;

namespace Model.Tests;

public class PolyLine3DTests
{
    private static void AssertPointEqual(
        Point3d expected,
        Point3d actual)
    {
        Assert.Equal(expected.X, actual.X, 6);
        Assert.Equal(expected.Y, actual.Y, 6);
        Assert.Equal(expected.Z, actual.Z, 6);
    }

    // Helper method to create a polyline with two connected segments.
    private static PolyLine3D CreateTwoSegmentPolyline()
    {
        var polyline = new PolyLine3D();

        var first = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 0, 0));

        var second = new Line3D(
            new Point3d(3, 0, 0),
            new Point3d(3, 4, 0));

        polyline.Add(first);
        polyline.Add(second);

        return polyline;
    }

    // 1. Length tests

    [Fact]
    public void Length_TwoSegments_ReturnsTotalLength()
    {
        var polyline = CreateTwoSegmentPolyline();

        Assert.Equal(7.0, polyline.Length, 6);
    }

    [Fact]
    public void Length_NoSegments_ReturnsZero()
    {
        var polyline = new PolyLine3D();

        Assert.Equal(0.0, polyline.Length);
    }

    // 2. Start and End tests

    [Fact]
    public void Start_ReturnsFirstSegmentStart()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(new Point3d(0, 0, 0), polyline.Start);
    }

    [Fact]
    public void End_ReturnsLastSegmentEnd()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(new Point3d(3, 4, 0), polyline.End);
    }

    [Fact]
    public void Start_NoSegments_ThrowsInvalidOperationException()
    {
        var polyline = new PolyLine3D();

        Assert.Throws<InvalidOperationException>(
            () => _ = polyline.Start);
    }

    [Fact]
    public void End_NoSegments_ThrowsInvalidOperationException()
    {
        var polyline = new PolyLine3D();

        Assert.Throws<InvalidOperationException>(
            () => _ = polyline.End);
    }

    // 3. Add tests

    [Fact]
    public void Add_Segment_IncreasesSegmentCount()
    {
        var polyline = new PolyLine3D();

        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 0, 0));

        polyline.Add(line);

        Assert.Single(polyline.Segments);
        Assert.Same(line, polyline.Segments[0]);
    }

    // 4. Chain tests

    [Fact]
    public void Chain_SegmentsInCorrectOrder_PreservesOrder()
    {
        var polyline = CreateTwoSegmentPolyline();

        polyline.Chain();

        Assert.Equal(2, polyline.Segments.Count);
        AssertPointEqual(new Point3d(0, 0, 0), polyline.Start);
        AssertPointEqual(new Point3d(3, 4, 0), polyline.End);
    }

    [Fact]
    public void Chain_ReversedSegment_ReversesSegmentToConnect()
    {
        var polyline = new PolyLine3D();

        var first = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 0, 0));

        var second = new Line3D(
            new Point3d(3, 4, 0),
            new Point3d(3, 0, 0));

        polyline.Add(first);
        polyline.Add(second);

        polyline.Chain();

        AssertPointEqual(new Point3d(0, 0, 0), polyline.Start);
        AssertPointEqual(new Point3d(3, 4, 0), polyline.End);
    }

    [Fact]
    public void Chain_DisconnectedSegments_ThrowsInvalidOperationException()
    {
        var polyline = new PolyLine3D();

        polyline.Add(new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(1, 0, 0)));

        polyline.Add(new Line3D(
            new Point3d(5, 5, 0),
            new Point3d(6, 5, 0)));

        Assert.Throws<InvalidOperationException>(
            () => polyline.Chain());
    }

    // 5. PointAt tests

    [Fact]
    public void PointAt_Start_ReturnsPolylineStart()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(
            new Point3d(0, 0, 0),
            polyline.PointAt(0));
    }

    [Fact]
    public void PointAt_SegmentBoundary_ReturnsJoiningPoint()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(
            new Point3d(3, 0, 0),
            polyline.PointAt(3));
    }

    [Fact]
    public void PointAt_SecondSegment_ReturnsExpectedPoint()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(
            new Point3d(3, 2, 0),
            polyline.PointAt(5));
    }

    [Fact]
    public void PointAt_End_ReturnsPolylineEnd()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(
            new Point3d(3, 4, 0),
            polyline.PointAt(7));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(8)]
    public void PointAt_InvalidDistance_ThrowsArgumentOutOfRangeException(
        double distance)
    {
        var polyline = CreateTwoSegmentPolyline();

        Assert.Throws<ArgumentOutOfRangeException>(
            () => polyline.PointAt(distance));
    }

    // 6. TangentAt tests

    [Fact]
    public void TangentAt_FirstSegment_ReturnsExpectedDirection()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(
            new Point3d(1, 0, 0),
            polyline.TangentAt(1));
    }

    [Fact]
    public void TangentAt_SecondSegment_ReturnsExpectedDirection()
    {
        var polyline = CreateTwoSegmentPolyline();

        AssertPointEqual(
            new Point3d(0, 1, 0),
            polyline.TangentAt(5));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(8)]
    public void TangentAt_InvalidDistance_ThrowsArgumentOutOfRangeException(
        double distance)
    {
        var polyline = CreateTwoSegmentPolyline();

        Assert.Throws<ArgumentOutOfRangeException>(
            () => polyline.TangentAt(distance));
    }

    // 7. FindClosestPoint tests

    [Fact]
    public void FindClosestPoint_OnSecondSegment_ReturnsExpectedResult()
    {
        var polyline = CreateTwoSegmentPolyline();

        var result = polyline.FindClosestPoint(
            new Point3d(4, 2, 0));

        AssertPointEqual(new Point3d(3, 2, 0), result.Point);
        Assert.Equal(1.0, result.Distance, 6);
        Assert.Equal(5.0, result.DistanceAlongTrack, 6);
    }

    [Fact]
    public void FindClosestPoint_NoSegments_ThrowsInvalidOperationException()
    {
        var polyline = new PolyLine3D();

        Assert.Throws<InvalidOperationException>(
            () => polyline.FindClosestPoint(
                new Point3d(1, 1, 0)));
    }

    // 8. Pos tests

    [Fact]
    public void Pos_FirstSegment_ReturnsZero()
    {
        var polyline = CreateTwoSegmentPolyline();

        var first = polyline.Segments[0];

        Assert.Equal(0.0, polyline.Pos(first));
    }

    [Fact]
    public void Pos_SecondSegment_ReturnsDistanceFromPolylineStart()
    {
        var polyline = CreateTwoSegmentPolyline();

        var second = polyline.Segments[1];

        Assert.Equal(3.0, polyline.Pos(second));
    }

    [Fact]
    public void Pos_SegmentNotInPolyline_ThrowsArgumentException()
    {
        var polyline = CreateTwoSegmentPolyline();

        var unrelated = new Line3D(
            new Point3d(10, 10, 0),
            new Point3d(11, 10, 0));

        Assert.Throws<ArgumentException>(
            () => polyline.Pos(unrelated));
    }

    // 9. Azimuth tests

    [Fact]
    public void Azimuth_PositiveXDirection_Returns90Degrees()
    {
        var polyline = new PolyLine3D();

        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(1, 0, 0));

        Assert.Equal(90.0, polyline.Azimuth(line), 6);
    }

    [Fact]
    public void Azimuth_PositiveYDirection_ReturnsZeroDegrees()
    {
        var polyline = new PolyLine3D();

        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(0, 1, 0));

        Assert.Equal(0.0, polyline.Azimuth(line), 6);
    }

    [Fact]
    public void Azimuth_NegativeXDirection_Returns270Degrees()
    {
        var polyline = new PolyLine3D();

        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(-1, 0, 0));

        Assert.Equal(270.0, polyline.Azimuth(line), 6);
    }
}
