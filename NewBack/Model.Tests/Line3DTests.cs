
using GeoModel.Geometry;
using Xunit;

namespace Model.Tests;

public class Line3DTests
{
    [Fact]
    public void Length_FromZeroToThreeFour_ReturnsFive()
    {
        //  create a line from (0,0,0) to (3,4,0).
        var start = new Point3d(0, 0, 0);
        var end = new Point3d(3, 4, 0);
        var line = new Line3D(start, end);

        //  calculate the line's length.
        double actual = line.Length;

        //  the expected length is 5.
        Assert.Equal(5.0, actual, 6);
    }

    [Fact]
    public void PointAt_Middle_ReturnsExpectedPoint()
    {
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        var point = line.PointAt(2.5);

        Assert.Equal(1.5, point.X, 6);
        Assert.Equal(2.0, point.Y, 6);
        Assert.Equal(0.0, point.Z, 6);
    }

    [Fact]
    public void TangentAt_ReturnsNormalizedDirection()
    {
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        var tangent = line.TangentAt(0);

        Assert.Equal(0.6, tangent.X, 6);
        Assert.Equal(0.8, tangent.Y, 6);
        Assert.Equal(0.0, tangent.Z, 6);
    }

    [Fact]
    public void Reverse_SwapsStartAndEnd()
    {
        var start = new Point3d(0, 0, 0);
        var end = new Point3d(3, 4, 0);
        var line = new Line3D(start, end);

        var reversed = (Line3D)line.Reverse();

        Assert.Equal(3.0, reversed.Start.X, 6);
        Assert.Equal(4.0, reversed.Start.Y, 6);
        Assert.Equal(0.0, reversed.End.X, 6);
        Assert.Equal(0.0, reversed.End.Y, 6);
    }

    [Fact]
    public void PointAt_DistanceBeyondLength_ThrowsException()
    {
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        Assert.Throws<ArgumentOutOfRangeException>(
            () => line.PointAt(6));
    }

    [Fact]
    public void Length_AlongZAxis_ReturnsCorrectLength()
    {
        // Arrange: create a line along the Z axis.
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(0, 0, 5));

        // Act: calculate its length.
        double actual = line.Length;

        // Assert: expected length is 5.
        Assert.Equal(5.0, actual, 6);
    }

    [Fact]
    public void PointAt_Start_ReturnsStartPoint()
    {
        // Arrange
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        // Act: distance zero means the start of the line.
        var point = line.PointAt(0);

        // Assert
        Assert.Equal(0.0, point.X, 6);
        Assert.Equal(0.0, point.Y, 6);
        Assert.Equal(0.0, point.Z, 6);
    }

    [Fact]
    public void PointAt_End_ReturnsEndPoint()
    {
        // Arrange
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        // Act: the line length is 5.
        var point = line.PointAt(line.Length);

        // Assert
        Assert.Equal(3.0, point.X, 6);
        Assert.Equal(4.0, point.Y, 6);
        Assert.Equal(0.0, point.Z, 6);
    }

    [Fact]
    public void PointAt_NegativeDistance_ThrowsException()
    {
        // Arrange
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        // Act and Assert
        Assert.Throws<ArgumentOutOfRangeException>(
            () => line.PointAt(-1));
    }

    [Fact]
    public void FindClosestPoint_InsideLine_ReturnsCorrectPoint()
    {
        // Arrange
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        var inputPoint = new Point3d(1.5, 2, 3);

        // Act
        var result = line.FindClosestPoint(inputPoint);

        // Assert: closest point is (1.5, 2, 0).
        Assert.Equal(1.5, result.Point.X, 6);
        Assert.Equal(2.0, result.Point.Y, 6);
        Assert.Equal(0.0, result.Point.Z, 6);

        Assert.Equal(3.0, result.Distance, 6);
        Assert.Equal(2.5, result.DistanceAlongCurve, 6);
    }

    [Fact]
    public void FindClosestPoint_BeforeStart_ReturnsStartPoint()
    {
        // Arrange
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        var inputPoint = new Point3d(-1, -2, 0);

        // Act
        var result = line.FindClosestPoint(inputPoint);

        // Assert
        Assert.Equal(0.0, result.Point.X, 6);
        Assert.Equal(0.0, result.Point.Y, 6);
        Assert.Equal(0.0, result.Point.Z, 6);

        Assert.Equal(0.0, result.DistanceAlongCurve, 6);
    }

    [Fact]
    public void FindClosestPoint_AfterEnd_ReturnsEndPoint()
    {
        // Arrange
        var line = new Line3D(
            new Point3d(0, 0, 0),
            new Point3d(3, 4, 0));

        var inputPoint = new Point3d(4, 6, 0);

        // Act
        var result = line.FindClosestPoint(inputPoint);

        // Assert
        Assert.Equal(3.0, result.Point.X, 6);
        Assert.Equal(4.0, result.Point.Y, 6);
        Assert.Equal(0.0, result.Point.Z, 6);

        Assert.Equal(5.0, result.DistanceAlongCurve, 6);
    }

    [Fact]
    public void FindClosestPoint_ZeroLengthLine_ReturnsStartPoint()
    {
        // Arrange: start and end are the same point.
        var line = new Line3D(
            new Point3d(1, 2, 3),
            new Point3d(1, 2, 3));

        var inputPoint = new Point3d(1, 2, 6);

        // Act
        var result = line.FindClosestPoint(inputPoint);

        // Assert
        Assert.Equal(1.0, result.Point.X, 6);
        Assert.Equal(2.0, result.Point.Y, 6);
        Assert.Equal(3.0, result.Point.Z, 6);

        Assert.Equal(3.0, result.Distance, 6);
        Assert.Equal(0.0, result.DistanceAlongCurve, 6);
    }
}
