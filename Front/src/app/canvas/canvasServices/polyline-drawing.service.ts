
import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class PolylineDrawingService {

  calculateNextPoint(
    lastPoint: THREE.Vector3,
    lengthMeters: number,
    angleDeg: number,
    worldUnitsPerMeter: number
  ): THREE.Vector3 {
    const lengthWorld = lengthMeters * worldUnitsPerMeter;
    const angleRad = THREE.MathUtils.degToRad(angleDeg);

    return new THREE.Vector3(
      lastPoint.x + Math.cos(angleRad) * lengthWorld,
      lastPoint.y + Math.sin(angleRad) * lengthWorld,
      0
    );
  }

  calculateSegmentInfo(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    worldUnitsPerMeter: number
    ): { lengthMeters: number; angleDeg: number } {
    const delta = new THREE.Vector3().subVectors(endPoint, startPoint);

    const lengthMeters = delta.length() / worldUnitsPerMeter;

    let angleDeg = THREE.MathUtils.radToDeg(
        Math.atan2(delta.y, delta.x)
    );

    if (angleDeg < 0) {
        angleDeg += 360;
    }

    return { lengthMeters, angleDeg };
    }
}
