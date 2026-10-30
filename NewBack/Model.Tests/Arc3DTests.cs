using GeoModel.Geometry;
using Xunit;

namespace Model.Tests;

public class Arc3DTests
{
    [Fact]
    public void Length_QuarterCircle_ReturnsExpectedLength()
    {
        // Arrange: create a quarter-circle arc with radius 1.
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act
        double actual = arc.Length;

        // Assert: quarter-circle length = radius * pi / 2.
        Assert.Equal(Math.PI / 2, actual, 6);
    }

    [Fact]
    public void Constructor_SetsStartEndAndRadius()
    {
        // Arrange
        var start = new Point3d(1, 0, 0);
        var end = new Point3d(0, 1, 0);

        // Act
        var arc = new Arc3D(start, end, 1);

        // Assert
        Assert.Same(start, arc.Start);
        Assert.Same(end, arc.End);
        Assert.Equal(1.0, arc.Radius, 6);
    }

    [Fact]
    public void Constructor_CalculatesCenter()
    {
        // Arrange and Act
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Assert
        Assert.Equal(1.0, arc.Center.X, 6);
        Assert.Equal(1.0, arc.Center.Y, 6);
        Assert.Equal(0.0, arc.Center.Z, 6);
    }

    [Fact]
    public void PointAt_Start_ReturnsStartPoint()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act
        var point = arc.PointAt(0);

        // Assert
        Assert.Equal(1.0, point.X, 6);
        Assert.Equal(0.0, point.Y, 6);
        Assert.Equal(0.0, point.Z, 6);
    }

    [Fact]
    public void PointAt_End_ReturnsEndPoint()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act
        var point = arc.PointAt(arc.Length);

        // Assert
        Assert.Equal(0.0, point.X, 6);
        Assert.Equal(1.0, point.Y, 6);
        Assert.Equal(0.0, point.Z, 6);
    }

    [Fact]
    public void PointAt_Middle_ReturnsExpectedPoint()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act: halfway along a 90-degree arc.
        var point = arc.PointAt(arc.Length / 2);

        // Assert: angle is -135 degrees around center (1,1).
        Assert.Equal(1 - Math.Sqrt(0.5), point.X, 6);
        Assert.Equal(1 - Math.Sqrt(0.5), point.Y, 6);
        Assert.Equal(0.0, point.Z, 6);
    }

    [Fact]
    public void PointAt_NegativeDistance_ThrowsException()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act and Assert
        Assert.Throws<ArgumentOutOfRangeException>(
            () => arc.PointAt(-1));
    }

    [Fact]
    public void PointAt_DistanceBeyondLength_ThrowsException()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act and Assert
        Assert.Throws<ArgumentOutOfRangeException>(
            () => arc.PointAt(arc.Length + 1));
    }

    [Fact]
    public void TangentAt_Start_ReturnsExpectedDirection()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act
        var tangent = arc.TangentAt(0);

        // Assert
        Assert.Equal(-1.0, tangent.X, 6);
        Assert.Equal(0.0, tangent.Y, 6);
        Assert.Equal(0.0, tangent.Z, 6);
    }

    [Fact]
    public void FindClosestPoint_ProjectionInsideArc_ReturnsRadialPoint()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        var inputPoint = new Point3d(
            1 - Math.Sqrt(2),
            1 - Math.Sqrt(2),
            0);

        // Act
        var result = arc.FindClosestPoint(inputPoint);

        // Assert
        Assert.Equal(
            1 - Math.Sqrt(0.5), result.Point.X, 6);
        Assert.Equal(
            1 - Math.Sqrt(0.5), result.Point.Y, 6);
        Assert.Equal(0.0, result.Point.Z, 6);

        Assert.Equal(1.0, result.Distance, 6);
        Assert.Equal(Math.PI / 4, result.DistanceAlongCurve, 6);
    }

    [Fact]
    public void FindClosestPoint_ProjectionOutsideArc_ReturnsClosestEndpoint()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        var inputPoint = new Point3d(0, 3, 0);

        // Act
        var result = arc.FindClosestPoint(inputPoint);

        // Assert: the end point is closer than the start point.
        Assert.Equal(0.0, result.Point.X, 6);
        Assert.Equal(1.0, result.Point.Y, 6);
        Assert.Equal(0.0, result.Point.Z, 6);

        Assert.Equal(arc.Length, result.DistanceAlongCurve, 6);
    }

    [Fact]
    public void FindClosestPoint_AtCenter_ReturnsStartEndpoint()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        var inputPoint = new Point3d(1, 1, 0);

        // Act
        var result = arc.FindClosestPoint(inputPoint);

        // Assert: the center has no unique radial projection.
        // Both endpoints are equally distant, so the method returns Start.
        Assert.Equal(1.0, result.Point.X, 6);
        Assert.Equal(0.0, result.Point.Y, 6);
        Assert.Equal(0.0, result.DistanceAlongCurve, 6);
    }

    [Fact]
    public void Constructor_RadiusTooSmall_ThrowsException()
    {
        // Arrange
        var start = new Point3d(0, 0, 0);
        var end = new Point3d(3, 0, 0);

        // Act and Assert
        Assert.Throws<ArgumentException>(
            () => new Arc3D(start, end, 1));
    }

    [Fact]
    public void Reverse_SwapsStartAndEndAndReversesDirection()
    {
        // Arrange
        var arc = new Arc3D(
            new Point3d(1, 0, 0),
            new Point3d(0, 1, 0),
            1);

        // Act
        var reversed = (Arc3D)arc.Reverse();

        // Assert
        Assert.Equal(0.0, reversed.Start.X, 6);
        Assert.Equal(1.0, reversed.Start.Y, 6);

        Assert.Equal(1.0, reversed.End.X, 6);
        Assert.Equal(0.0, reversed.End.Y, 6);

        Assert.Equal(-1.0, reversed.Radius, 6);
        Assert.Equal(arc.Length, reversed.Length, 6);
    }
}