using GeoModel.Geometry;
using GeoModel.Rail;
using GeoModel.Rail.TrackObjects;

namespace Model.Rail.TrackObjects
{
    public class Switch : TrackObject
    {
        public Point3d Location { get; set; }

        public List<Track> ConnectedTracks { get; private set; } = new();
        public Track? MainTrack { get; private set; }
        public Track? LeftTrack { get; private set; }
        public Track? RightTrack { get; private set; }
        public Switch(Point3d location) : base(string.Empty, location,0)
        {
            Location = location;
        }

        public void ConnectToTracks(IEnumerable<Track> allTracks)
        {
            ConnectedTracks = allTracks
                .Where(track =>
                    track.Geometry.Start.Equals(Location) ||
                    track.Geometry.End.Equals(Location))
                .ToList();

            if (ConnectedTracks.Count < 3)
            {
                throw new InvalidOperationException(
                    $"Switch at location {Location} must connect to at least 3 tracks, " +
                    $"but only {ConnectedTracks.Count} were found.");
            }
            // Add this switch to each connected track
            foreach (var track in ConnectedTracks)
            {
                if (!track.Objects.Contains(this))
                {
                    track.AddObject(this);
                }
            }
            CalculateTrackRoles();
        }
        private void CalculateTrackRoles()
        {
            if (ConnectedTracks.Count != 3)
            {
                throw new InvalidOperationException(
                    "Exactly 3 connected tracks are required.");
            }

            var directions = ConnectedTracks
                .Select(track => new
                {
                    Track = track,
                    Angle = GetAngleFromSwitch(track)
                })
                .ToList();

            // Find the pair of tracks with the smallest angle between
            // their outward directions: these form the main continuation.
            double bestAngle = double.MaxValue;
            Track? main = null;

            for (int i = 0; i < directions.Count; i++)
            {
                for (int j = i + 1; j < directions.Count; j++)
                {
                    double difference = AngularDifference(
                        directions[i].Angle,
                        directions[j].Angle);

                    // Outward directions pointing in opposite directions
                    // represent a straight continuation.
                    double deviationFromStraight = Math.Abs(Math.PI - difference);

                    if (deviationFromStraight < bestAngle)
                    {
                        bestAngle = deviationFromStraight;

                        // The first track in the pair is used as the main
                        // track reference. A pair of tracks forms the main route.
                        main = directions[i].Track;
                    }
                }
            }

            MainTrack = main;

            var branches = directions
                .Where(x => x.Track != MainTrack)
                .OrderBy(x => NormalizeAngle(x.Angle))
                .ToList();

            if (branches.Count != 2)
            {
                throw new InvalidOperationException(
                    "Could not determine left and right tracks.");
            }

            // These assignments assume the angles are measured in the
            // usual mathematical convention: X right, Y up, counterclockwise.
            LeftTrack = branches[1].Track;
            RightTrack = branches[0].Track;
        }
        private double GetAngleFromSwitch(Track track)
        {
            Point3d otherPoint;

            if (track.Geometry.Start.DistanceTo(Location) < 0.01)
                otherPoint = track.Geometry.End;
            else
                otherPoint = track.Geometry.Start;

            return Math.Atan2(
                otherPoint.Y - Location.Y,
                otherPoint.X - Location.X);
        }
        private static double AngularDifference(double a, double b)
        {
            double diff = Math.Abs(NormalizeAngle(a) - NormalizeAngle(b));
            return Math.Min(diff, 2 * Math.PI - diff);
        }
        private static double NormalizeAngle(double angle)
        {
            angle %= 2 * Math.PI;

            if (angle < 0)
                angle += 2 * Math.PI;

            return angle;
        }
    }
}
