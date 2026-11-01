
import { Injectable } from '@angular/core';
import * as THREE from 'three';

export type GeometryEndInfo = {
  object: THREE.Line;
  point: THREE.Vector3;
  endKind: 'start' | 'end';
  tangentAngle: number;
  curvature: number;
  direction: 'CW' | 'CCW';
};

@Injectable({
  providedIn: 'root'
})
export class RailwayGeometryService {

  public createCircle(
    center: THREE.Vector3,
    radiusPoint: THREE.Vector3
  ): THREE.Line {

    const radius = center.distanceTo(radiusPoint);

    const curve = new THREE.EllipseCurve(
      center.x,
      center.y,
      radius,
      radius,
      0,
      Math.PI * 2,
      false,
      0
    );

    const points = curve.getPoints(96).map(
      point => new THREE.Vector3(point.x, point.y, 0)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff
    });

    const circle = new THREE.LineLoop(geometry, material);

    circle.userData['draggable'] = true;
    circle.userData['type'] = 'DrawnCircle';
    circle.userData['centerPoint'] = center.clone();
    circle.userData['radius'] = radius;

    return circle;
  }

  
    public createCurve(
    startPoint: THREE.Vector3,
    controlPoint: THREE.Vector3,
    endPoint: THREE.Vector3
    ): THREE.Line {

    const curve = new THREE.QuadraticBezierCurve3(
        startPoint,
        controlPoint,
        endPoint
    );

    const points = curve.getPoints(64);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
        color: 0xffffff
    });

    const line = new THREE.Line(geometry, material);

    line.userData['draggable'] = true;
    line.userData['type'] = 'DrawnCurve';
    line.userData['startPoint'] = startPoint.clone();
    line.userData['controlPoint'] = controlPoint.clone();
    line.userData['endPoint'] = endPoint.clone();

    return line;
    }

    public updateCurveGeometry(curveLine: THREE.Line): void {

      const startPoint =
        curveLine.userData['startPoint'] as THREE.Vector3;

      const controlPoint =
        curveLine.userData['controlPoint'] as THREE.Vector3;

      const endPoint =
        curveLine.userData['endPoint'] as THREE.Vector3;

      if (!startPoint || !controlPoint || !endPoint) {
        return;
      }

      const curve = new THREE.QuadraticBezierCurve3(
        startPoint,
        controlPoint,
        endPoint
      );

      const points = curve.getPoints(64);

      const newGeometry = new THREE.BufferGeometry()
        .setFromPoints(points);

      // Release the previous geometry
      curveLine.geometry.dispose();

      // Apply the updated geometry
      curveLine.geometry = newGeometry;
    }

    public buildArcFromCenter(
        start: THREE.Vector3,
        end: THREE.Vector3,
        center: THREE.Vector3,
        direction: 'CW' | 'CCW'
    ): {
        center: THREE.Vector3;
        points: THREE.Vector3[];
        sweepAngle: number;
    } {
        const startAngle = Math.atan2(
        start.y - center.y,
        start.x - center.x
        );

        const endAngle = Math.atan2(
        end.y - center.y,
        end.x - center.x
        );

        let sweepAngle = endAngle - startAngle;

        if (direction === 'CCW') {
        while (sweepAngle <= 0) {
            sweepAngle += Math.PI * 2;
        }
        }

        if (direction === 'CW') {
        while (sweepAngle >= 0) {
            sweepAngle -= Math.PI * 2;
        }
        }

        const radius = center.distanceTo(start);
        const segmentCount = 64;
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const angle = startAngle + sweepAngle * t;

        points.push(
            new THREE.Vector3(
            center.x + Math.cos(angle) * radius,
            center.y + Math.sin(angle) * radius,
            0.2
            )
        );
        }

        return {
        center,
        points,
        sweepAngle
        };
    }

    public createRailwayArc(
        startPoint: THREE.Vector3,
        endPoint: THREE.Vector3,
        radius: number,
        direction: 'CW' | 'CCW'
    ): THREE.Line | null {
        const radiusAbs = Math.abs(radius);

        const start = new THREE.Vector3(startPoint.x, startPoint.y, 0);
        const end = new THREE.Vector3(endPoint.x, endPoint.y, 0);

        const chord = new THREE.Vector3().subVectors(end, start);
        const chordLength = chord.length();

        if (chordLength === 0) {
        console.warn('Arc start and end point cannot be the same');
        return null;
        }

        if (radiusAbs < chordLength / 2) {
        console.warn('Radius is too small for this start/end distance');
        alert('Radius is too small. Radius must be at least half the distance between start and end.');
        return null;
        }

        const midpoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);

        const halfChord = chordLength / 2;

        const centerOffsetDistance = Math.sqrt(
        radiusAbs * radiusAbs - halfChord * halfChord
        );

        const chordDirection = chord.clone().normalize();

        const perpendicular = new THREE.Vector3(
        -chordDirection.y,
        chordDirection.x,
        0
        );

        const centerCandidateA = midpoint
        .clone()
        .add(perpendicular.clone().multiplyScalar(centerOffsetDistance));

        const centerCandidateB = midpoint
        .clone()
        .add(perpendicular.clone().multiplyScalar(-centerOffsetDistance));

        const candidateA = this.buildArcFromCenter(
        start,
        end,
        centerCandidateA,
        direction
        );

        const candidateB = this.buildArcFromCenter(
        start,
        end,
        centerCandidateB,
        direction
        );

        // Choose the smaller arc, not the huge arc around the other side
        const chosen =
        Math.abs(candidateA.sweepAngle) <= Math.abs(candidateB.sweepAngle)
            ? candidateA
            : candidateB;

        const geometry = new THREE.BufferGeometry().setFromPoints(chosen.points);

        const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        depthTest: false
        });

        const arc = new THREE.Line(geometry, material);

        arc.renderOrder = 50;
        arc.userData['draggable'] = true;
        arc.userData['type'] = 'DrawnArc';

        arc.userData['startPoint'] = start.clone();
        arc.userData['endPoint'] = end.clone();
        arc.userData['radius'] = radiusAbs;
        arc.userData['direction'] = direction;
        arc.userData['centerPoint'] = chosen.center.clone();

        return arc;
    }

     public getTransitionCurvatureFactor(
        u: number,
        curveType:
        | 'clothoid'
        | 'cubicParabola'
        | 'bloss'
        | 'cosine'
        | 'sine'
        | 'biquadraticParabola'
        | 'wienerBogen'
    ): number {
        const clampedU = Math.max(0, Math.min(1, u));

        switch (curveType) {
        case 'clothoid':
            return clampedU;

        case 'cubicParabola':
            // In the generalized curvature model, cubic parabola behaves as
            // a simple transition approximation.
            return clampedU;

        case 'bloss':
            return 3 * clampedU * clampedU - 2 * clampedU * clampedU * clampedU;

        case 'cosine':
            return (1 - Math.cos(Math.PI * clampedU)) / 2;

        case 'sine':
            return clampedU - Math.sin(2 * Math.PI * clampedU) / (2 * Math.PI);

        case 'biquadraticParabola':
            // Temporary fallback until we implement exact version.
            return clampedU;

        case 'wienerBogen':
            // Temporary fallback until we implement exact version.
            return clampedU;

        default:
            return clampedU;
        }
    }

    public generateTransitionBetweenCurvatures(
        startPoint: THREE.Vector3,
        startAngle: number,
        length: number,
        startCurvature: number,
        endCurvature: number,
        direction: 'CW' | 'CCW',
        curveType:
        | 'clothoid'
        | 'cubicParabola'
        | 'bloss'
        | 'cosine'
        | 'sine'
        | 'biquadraticParabola'
        | 'wienerBogen',
        segments: number = 120
    ): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];

        if (length <= 0 || segments < 2) {
        console.warn('Invalid generalized transition parameters', {
            startPoint,
            startAngle,
            length,
            startCurvature,
            endCurvature,
            direction,
            curveType,
            segments
        });

        return points;
        }

        const sign = direction === 'CCW' ? 1 : -1;

        let x = startPoint.x;
        let y = startPoint.y;
        let theta = startAngle;

        const ds = length / segments;

        for (let i = 0; i <= segments; i++) {
        points.push(new THREE.Vector3(x, y, startPoint.z));

        const s = i * ds;
        const u = s / length;

        const factor = this.getTransitionCurvatureFactor(u, curveType);

        const curvature =
            startCurvature + (endCurvature - startCurvature) * factor;

        theta += sign * curvature * ds;

        x += Math.cos(theta) * ds;
        y += Math.sin(theta) * ds;
        }

        return points;
    }

    public generateTransitionCurvePoints(
        startPoint: THREE.Vector3,
        startAngle: number,
        length: number,
        endRadius: number,
        direction: 'CW' | 'CCW',
        curveType:
        | 'clothoid'
        | 'cubicParabola'
        | 'bloss'
        | 'cosine'
        | 'sine'
        | 'biquadraticParabola'
        | 'wienerBogen',
        segments: number = 120
    ): THREE.Vector3[] {
        const startCurvature = 0;
        const endCurvature = 1 / endRadius;

        return this.generateTransitionBetweenCurvatures(
        startPoint,
        startAngle,
        length,
        startCurvature,
        endCurvature,
        direction,
        curveType,
        segments
        );
    }

    public smoothlyMoveTransitionEnd(
        points: THREE.Vector3[],
        targetEndPoint: THREE.Vector3
    ): THREE.Vector3[] {
        if (points.length < 2) {
        return points.map(p => p.clone());
        }

        const rawEndPoint = points[points.length - 1];
        const correction = targetEndPoint.clone().sub(rawEndPoint);

        return points.map((point, index) => {
        const u = index / (points.length - 1);

        // Smooth correction: start unchanged, end fully moved.
        const smoothFactor = u * u * (3 - 2 * u);

        return point
            .clone()
            .add(correction.clone().multiplyScalar(smoothFactor));
        });
    }

    public forceEndTangentDirection(
        points: THREE.Vector3[],
        targetEndPoint: THREE.Vector3,
        targetEndDirection: THREE.Vector3
    ): void {
        if (points.length < 3) {
        return;
        }

        const lastIndex = points.length - 1;
        points[lastIndex] = targetEndPoint.clone();

        const averageStep =
        points[lastIndex].distanceTo(points[lastIndex - 2]) / 2 || 0.1;

        const influenceCount = Math.min(8, points.length - 2);

        for (let offset = 1; offset <= influenceCount; offset++) {
        const index = lastIndex - offset;

        const desiredPoint = targetEndPoint
            .clone()
            .sub(
            targetEndDirection
                .clone()
                .multiplyScalar(averageStep * offset)
            );

        if (offset === 1) {
            points[index] = desiredPoint;
        } else {
            const blend = Math.pow(1 - offset / (influenceCount + 1), 2);
            points[index] = points[index].clone().lerp(desiredPoint, blend);
        }
        }
    }

    public getEndDirectionFromPoints(points: THREE.Vector3[]): THREE.Vector3 | null {
        if (points.length < 2) {
        return null;
        }

        const lastPoint = points[points.length - 1];
        const previousPoint = points[points.length - 2];

        const direction = new THREE.Vector3().subVectors(lastPoint, previousPoint);
        direction.z = 0;

        if (direction.length() < 0.001) {
        return null;
        }

        direction.normalize();
        return direction;
    }

    public getSmallestAngleBetweenVectorsDeg(
        a: THREE.Vector3,
        b: THREE.Vector3
    ): number {
        const aNorm = a.clone().normalize();
        const bNorm = b.clone().normalize();

        const dot = THREE.MathUtils.clamp(aNorm.dot(bNorm), -1, 1);

        const angleRad = Math.acos(dot);
        const angleDeg = angleRad * 180 / Math.PI;

        return Math.min(angleDeg, 180 - angleDeg);
    }

    public fitTransitionPointsBetweenArcEnds(
        arcInfoA: GeometryEndInfo,
        arcInfoB: GeometryEndInfo,
        curveType:
        | 'clothoid'
        | 'cubicParabola'
        | 'bloss'
        | 'cosine'
        | 'sine'
        | 'biquadraticParabola'
        | 'wienerBogen',
        requestedLengthMeters: number,
        worldUnitsPerMeter: number
        ): {
        points: THREE.Vector3[];
        length: number;
        lengthMeters: number;
        direction: 'CW' | 'CCW';
        endTangentMismatchDeg: number;
    } | null {
        const chordLength = arcInfoA.point.distanceTo(arcInfoB.point);

        if (chordLength < 0.001) {
        return null;
        }

        const requestedLength =
            Number.isFinite(requestedLengthMeters) && requestedLengthMeters > 0
                ? requestedLengthMeters * worldUnitsPerMeter
                : chordLength;

        const baseLength = Math.max(chordLength, requestedLength);

        const targetEndDirection = new THREE.Vector3(
        Math.cos(arcInfoB.tangentAngle),
        Math.sin(arcInfoB.tangentAngle),
        0
        ).normalize();

        const directionsToTry: ('CW' | 'CCW')[] = [
        arcInfoA.direction,
        arcInfoA.direction === 'CW' ? 'CCW' : 'CW'
        ];

        let bestResult: {
        points: THREE.Vector3[];
        length: number;
        lengthMeters: number;
        direction: 'CW' | 'CCW';
        endTangentMismatchDeg: number;
        score: number;
        } | null = null;

        for (const direction of directionsToTry) {
        for (let scale = 1; scale <= 4; scale += 0.05) {
            const length = baseLength * scale;

            const rawPoints = this.generateTransitionBetweenCurvatures(
            arcInfoA.point,
            arcInfoA.tangentAngle,
            length,
            arcInfoA.curvature,
            arcInfoB.curvature,
            direction,
            curveType,
            120
            );

            if (rawPoints.length < 2) {
            continue;
            }

            const fittedPoints = this.smoothlyMoveTransitionEnd(
            rawPoints,
            arcInfoB.point
            );

            this.forceEndTangentDirection(
            fittedPoints,
            arcInfoB.point,
            targetEndDirection
            );

            const endDirection = this.getEndDirectionFromPoints(fittedPoints);

            if (!endDirection) {
            continue;
            }

            const endTangentMismatchDeg = this.getSmallestAngleBetweenVectorsDeg(
            endDirection,
            targetEndDirection
            );

            const endGap = fittedPoints[fittedPoints.length - 1].distanceTo(arcInfoB.point);

            const score =
            endTangentMismatchDeg +
            endGap * 1000 +
            scale * 0.05;

            if (!bestResult || score < bestResult.score) {
            bestResult = {
                points: fittedPoints,
                length,
                lengthMeters: length / worldUnitsPerMeter,
                direction,
                endTangentMismatchDeg,
                score
            };
            }
        }
        }

        if (!bestResult) {
        return null;
        }

        return {
        points: bestResult.points,
        length: bestResult.length,
        lengthMeters: bestResult.lengthMeters,
        direction: bestResult.direction,
        endTangentMismatchDeg: bestResult.endTangentMismatchDeg
        };
    }

    public generateClothoidPoints(
        startPoint: THREE.Vector3,
        startAngle: number,
        length: number,
        endRadius: number,
        direction: 'CW' | 'CCW',
        segments: number = 80
    ): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];

        if (length <= 0 || endRadius <= 0 || segments < 2) {
        console.warn('Invalid clothoid parameters', {
            startPoint,
            startAngle,
            length,
            endRadius,
            direction,
            segments
        });

        return points;
        }

        const sign = direction === 'CCW' ? 1 : -1;

        let x = startPoint.x;
        let y = startPoint.y;
        let theta = startAngle;

        const ds = length / segments;

        for (let i = 0; i <= segments; i++) {
        points.push(new THREE.Vector3(x, y, startPoint.z));

        const s = i * ds;

        // Clothoid curvature increases linearly from 0 to 1 / endRadius
        const curvature = s / (endRadius * length);

        theta += sign * curvature * ds;

        x += Math.cos(theta) * ds;
        y += Math.sin(theta) * ds;
        }

        return points;
    }

public generateCubicParabolaPoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid cubic parabola parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    const cosA = Math.cos(startAngle);
    const sinA = Math.sin(startAngle);

    for (let i = 0; i <= segments; i++) {
      const xLocal = (length * i) / segments;

      /**
       * Cubic parabola transition approximation:
       *
       * y = x³ / (6 R L)
       *
       * where:
       * x = distance along tangent
       * R = final circular radius
       * L = transition length
       */
      const yLocal = sign * (Math.pow(xLocal, 3) / (6 * endRadius * length));

      /**
       * Rotate local point by startAngle,
       * then translate to startPoint.
       */
      const xWorld = startPoint.x + xLocal * cosA - yLocal * sinA;
      const yWorld = startPoint.y + xLocal * sinA + yLocal * cosA;

      points.push(new THREE.Vector3(xWorld, yWorld, startPoint.z));
    }

    return points;
  }

  public generateBlossPoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid Bloss parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      /**
       * Bloss transition curvature function:
       *
       * k(u) = (3u² - 2u³) / R
       *
       * This starts and ends more smoothly than a linear clothoid.
       */
      const curvatureFactor = 3 * u * u - 2 * u * u * u;
      const curvature = curvatureFactor / endRadius;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  public generateCosinePoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid cosine transition parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      /**
       * Cosine transition curvature:
       *
       * k(u) = [1 - cos(pi * u)] / (2R)
       *
       * Starts gently, increases smoothly, and reaches 1/R.
       */
      const curvatureFactor = (1 - Math.cos(Math.PI * u)) / 2;
      const curvature = curvatureFactor / endRadius;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  public generateSinePoints(
    startPoint: THREE.Vector3,
    startAngle: number,
    length: number,
    endRadius: number,
    direction: 'CW' | 'CCW',
    segments: number = 120
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (length <= 0 || endRadius <= 0 || segments < 2) {
      console.warn('Invalid sine transition parameters', {
        startPoint,
        startAngle,
        length,
        endRadius,
        direction,
        segments
      });

      return points;
    }

    const sign = direction === 'CCW' ? 1 : -1;

    let x = startPoint.x;
    let y = startPoint.y;
    let theta = startAngle;

    const ds = length / segments;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, startPoint.z));

      const s = i * ds;
      const u = s / length;

      /**
       * Sine transition curvature:
       *
       * k(u) = [u - sin(2πu) / (2π)] / R
       *
       * Smooth at the start and end.
       */
      const curvatureFactor =
        u - Math.sin(2 * Math.PI * u) / (2 * Math.PI);

      const curvature = curvatureFactor / endRadius;

      theta += sign * curvature * ds;

      x += Math.cos(theta) * ds;
      y += Math.sin(theta) * ds;
    }

    return points;
  }

  public computeCircleTangentCandidates(
    center1: THREE.Vector3,
    radius1: number,
    center2: THREE.Vector3,
    radius2: number
  ): {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    type: 'external' | 'internal';
  }[] {
    const candidates: {
      p1: THREE.Vector3;
      p2: THREE.Vector3;
      type: 'external' | 'internal';
    }[] = [];

    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;

    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) {
      return candidates;
    }

    /*
      sign =  1 gives external tangents
      sign = -1 gives internal tangents
    */
    const tangentModes = [
      { sign: 1, type: 'external' as const },
      { sign: -1, type: 'internal' as const }
    ];

    for (const mode of tangentModes) {
      const radiusDifference = radius1 - mode.sign * radius2;

      const hSquared = distanceSquared - radiusDifference * radiusDifference;

      if (hSquared < 0) {
        continue;
      }

      const h = Math.sqrt(Math.max(0, hSquared));

      for (const side of [-1, 1]) {
        const nx =
          (dx * radiusDifference - side * dy * h) / distanceSquared;

        const ny =
          (dy * radiusDifference + side * dx * h) / distanceSquared;

        const p1 = new THREE.Vector3(
          center1.x + radius1 * nx,
          center1.y + radius1 * ny,
          0
        );

        const p2 = new THREE.Vector3(
          center2.x + mode.sign * radius2 * nx,
          center2.y + mode.sign * radius2 * ny,
          0
        );

        candidates.push({
          p1,
          p2,
          type: mode.type
        });
      }
    }

    return candidates;
  }

  public getArcTangentAtPoint(
    arc: THREE.Line,
    point: THREE.Vector3,
    pointKind: 'start' | 'end'
  ): THREE.Vector3 | null {
    const center = arc.userData['centerPoint'] as THREE.Vector3;
    const direction = arc.userData['direction'] as 'CW' | 'CCW';

    if (!center || !direction) {
      return null;
    }

    const radiusVector = point
      .clone()
      .sub(center);

    radiusVector.z = 0;

    if (radiusVector.length() === 0) {
      return null;
    }

    radiusVector.normalize();

    let tangent: THREE.Vector3;

    if (direction === 'CCW') {
      tangent = new THREE.Vector3(
        -radiusVector.y,
        radiusVector.x,
        0
      );
    } else {
      tangent = new THREE.Vector3(
        radiusVector.y,
        -radiusVector.x,
        0
      );
    }

    // At the start of the second arc, the incoming tangent direction is opposite
    // of the arc's forward tangent.
    if (pointKind === 'start') {
      tangent.multiplyScalar(-1);
    }

    tangent.normalize();

    return tangent;
  }

  public getArcEndInfo(
    arc: THREE.Line,
    endKind: 'start' | 'end'
  ): GeometryEndInfo | null {
    if (arc.userData['type'] !== 'DrawnArc') {
      return null;
    }

    const point =
      endKind === 'start'
        ? arc.userData['startPoint'] as THREE.Vector3
        : arc.userData['endPoint'] as THREE.Vector3;

    const radius = arc.userData['radius'] as number;
    const direction = arc.userData['direction'] as 'CW' | 'CCW';

    if (!point || !radius || !direction) {
      return null;
    }

    const tangent = this.getArcTangentAtPoint(arc, point, endKind);

    if (!tangent) {
      return null;
    }

    const tangentAngle = Math.atan2(tangent.y, tangent.x);

    return {
      object: arc,
      point: point.clone(),
      endKind,
      tangentAngle,
      curvature: 1 / radius,
      direction
    };
  }

  public findBestTangentBetweenArcs(
    arcA: THREE.Line,
    arcB: THREE.Line,
    arcAEndKind: 'start' | 'end',
    arcBEndKind: 'start' | 'end'
    ): {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    type: 'external' | 'internal';
  } | null {
    const centerA = arcA.userData['centerPoint'] as THREE.Vector3;
    const centerB = arcB.userData['centerPoint'] as THREE.Vector3;

    const radiusA = arcA.userData['radius'] as number;
    const radiusB = arcB.userData['radius'] as number;

    if (
      !centerA ||
      !centerB ||
      !radiusA ||
      !radiusB ||
      !arcAEndKind ||
      !arcBEndKind
    ) {
      return null;
    }

    const selectedPointA =
      arcAEndKind === 'start'
        ? arcA.userData['startPoint'] as THREE.Vector3
        : arcA.userData['endPoint'] as THREE.Vector3;

    const selectedPointB =
      arcBEndKind === 'start'
        ? arcB.userData['startPoint'] as THREE.Vector3
        : arcB.userData['endPoint'] as THREE.Vector3;

    if (!selectedPointA || !selectedPointB) {
      return null;
    }

    const candidates = this.computeCircleTangentCandidates(
      centerA,
      radiusA,
      centerB,
      radiusB
    );

    if (candidates.length === 0) {
      return null;
    }

    let bestCandidate: {
      p1: THREE.Vector3;
      p2: THREE.Vector3;
      type: 'external' | 'internal';
    } | null = null;

    let bestScore = Infinity;

    for (const candidate of candidates) {
      const score =
        candidate.p1.distanceTo(selectedPointA) +
        candidate.p2.distanceTo(selectedPointB);

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  public getAbsoluteAngleDeg(start: THREE.Vector3, end: THREE.Vector3): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    if (angleDeg < 0) {
      angleDeg += 360;
    }

    return angleDeg;
  }

  public normalizeRelativeAngle(angleDeg: number): number {
    let normalized = angleDeg;

    while (normalized > 180) {
      normalized -= 360;
    }

    while (normalized <= -180) {
      normalized += 360;
    }

    return normalized;
  }

  public createPolylineSegmentLine(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    segmentIndex: number
    ): THREE.Line {
    const start = startPoint.clone();
    const end = endPoint.clone();

    const direction = new THREE.Vector3().subVectors(end, start);
    direction.z = 0;

    if (direction.length() > 0.001) {
        direction.normalize();

        // Tiny visual overlap to hide gaps between segments
        const overlap = 0.04;

        start.add(direction.clone().multiplyScalar(-overlap));
        end.add(direction.clone().multiplyScalar(overlap));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start.x, start.y, 0.2),
        new THREE.Vector3(end.x, end.y, 0.2)
    ]);

    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        depthTest: false
    });

    const line = new THREE.Line(geometry, material);

    line.renderOrder = 50;

    line.userData['draggable'] = true;
    line.userData['type'] = 'DrawnLine';

    // Preserve the mathematical endpoints
    line.userData['startPoint'] = startPoint.clone();
    line.userData['endPoint'] = endPoint.clone();

    line.userData['createdFromPolyline'] = true;
    line.userData['polylineSegmentIndex'] = segmentIndex;

    return line;
    }

  public createPolylinePreviewSegment(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3
    ): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
        startPoint,
        endPoint
    ]);

    const material = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.45
    });

    const previewLine = new THREE.Line(geometry, material);

    previewLine.userData = {
        type: 'PolylinePreviewSegment',
        isPreview: true
    };

    return previewLine;
    }

 public createActivePolyline(
    points: THREE.Vector3[]
    ): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
        color: 0x00ffff
    });

    const line = new THREE.Line(geometry, material);

    line.userData = {
        type: 'PolylinePreview',
        isPolyline: true,
        isPreview: true,
        points: points.map(p => p.clone())
    };

    return line;
    }
  
    updateArcGeometry(arc: THREE.Line): void {
      if (arc.userData['type'] !== 'DrawnArc') {
        return;
      }

      const startPoint = arc.userData['startPoint'] as THREE.Vector3;
      const endPoint = arc.userData['endPoint'] as THREE.Vector3;
      const centerPoint = arc.userData['centerPoint'] as THREE.Vector3;
      const direction = arc.userData['direction'] as 'CW' | 'CCW';

      const arcData = this.buildArcFromCenter(
        startPoint,
        endPoint,
        centerPoint,
        direction
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(
        arcData.points
      );

      arc.geometry.dispose();
      arc.geometry = geometry;
    }

}
