
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { CreateSwitch } from '../../api/end_points';

@Injectable({ providedIn: 'root' })
export class SwitchesDawingService {

  createSwitch(
    scene: THREE.Scene,
    mainTrack: THREE.Line,
    branchTrack: THREE.Line,
    switchPoint: THREE.Vector3
  ): THREE.Group | null {

    const mainStart = mainTrack.userData['startPoint'] as THREE.Vector3;
    const mainEnd = mainTrack.userData['endPoint'] as THREE.Vector3;
    const branchStart = branchTrack.userData['startPoint'] as THREE.Vector3;
    const branchEnd = branchTrack.userData['endPoint'] as THREE.Vector3;

    if (!mainStart || !mainEnd || !branchStart || !branchEnd) {
      return null;
    }

    const mainDirection = mainEnd.clone().sub(mainStart).normalize();
    const branchDirection = branchEnd.clone().sub(branchStart).normalize();

    const symbolLength = 12;
    const shadedLength = 4;

    const mainSymbolEnd = switchPoint.clone().add(
      mainDirection.clone().multiplyScalar(symbolLength)
    );

    const branchSymbolEnd = switchPoint.clone().add(
      branchDirection.clone().multiplyScalar(symbolLength)
    );

    const mainShadeEnd = switchPoint.clone().add(
      mainDirection.clone().multiplyScalar(shadedLength)
    );

    const branchShadeEnd = switchPoint.clone().add(
      branchDirection.clone().multiplyScalar(shadedLength)
    );

    const switchGroup = new THREE.Group();

    switchGroup.userData = {
      type: 'Switch',
      layerType: 'Switch',
      layer: 'Switches',
      source: 'DrawnSwitch',
      draggable: true,
      id: crypto.randomUUID()
    };

    const shadeShape = new THREE.Shape();
    shadeShape.moveTo(switchPoint.x, switchPoint.y);
    shadeShape.lineTo(mainShadeEnd.x, mainShadeEnd.y);
    shadeShape.lineTo(branchShadeEnd.x, branchShadeEnd.y);
    shadeShape.closePath();

    const shadeMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shadeShape),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthTest: false
      })
    );

    shadeMesh.position.z = 0.8;
    shadeMesh.renderOrder = 450;
    switchGroup.add(shadeMesh);

    const createLine = (endPoint: THREE.Vector3): THREE.Line => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(switchPoint.x, switchPoint.y, 1),
        new THREE.Vector3(endPoint.x, endPoint.y, 1)
      ]);

      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          depthTest: false
        })
      );

      line.renderOrder = 500;
      return line;
    };

    switchGroup.add(createLine(mainSymbolEnd));
    switchGroup.add(createLine(branchSymbolEnd));

    scene.add(switchGroup);

    CreateSwitch("aa", switchPoint.x, switchPoint.y);

    return switchGroup;
  }

  
    public countTrackDirectionsAtPoint(
    scene: THREE.Scene,
    junctionPoint: THREE.Vector3,
    tolerance = 0.5
    ): number {

    let directionCount = 0;

    scene.traverse((object) => {
        if (!(object instanceof THREE.Line)) {
        return;
        }

        if (object.userData['type'] !== 'DrawnLine') {
        return;
        }

        const startPoint = object.userData['startPoint'] as THREE.Vector3 | undefined;
        const endPoint = object.userData['endPoint'] as THREE.Vector3 | undefined;

        if (!startPoint || !endPoint) {
        return;
        }

        const segment = endPoint.clone().sub(startPoint);
        const segmentLengthSquared = segment.lengthSq();

        if (segmentLengthSquared === 0) {
        return;
        }

        const t = THREE.MathUtils.clamp(
        junctionPoint.clone().sub(startPoint).dot(segment) /
            segmentLengthSquared,
        0,
        1
        );

        const pointOnLine = startPoint
        .clone()
        .add(segment.clone().multiplyScalar(t));

        if (pointOnLine.distanceTo(junctionPoint) > tolerance) {
        return;
        }

        const endpointTolerance = 0.01;

        if (
        junctionPoint.distanceTo(startPoint) <= endpointTolerance
        ) {
        directionCount += 1;
        } else if (
        junctionPoint.distanceTo(endPoint) <= endpointTolerance
        ) {
        directionCount += 1;
        } else {
        directionCount += 2;
        }
    });

    return directionCount;
    }

}
