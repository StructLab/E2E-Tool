import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class CanvasSelectionService {

  private selectedImportedElement: THREE.Object3D | null = null;
  public getAssetScale(svgSrc: string): number {
    if (svgSrc.includes('AxleCounter')) return 0.35;
    if (svgSrc.includes('BaliseGroup')) return 0.45;
    if (svgSrc.includes('ETCSmarker')) return 0.35;
    if (svgSrc.includes('TimingPoint')) return 0.3;
    if (svgSrc.includes('BufferStop')) return 0.4;

    return 0.4;
  }

  public resizeLineEnd(line: THREE.Line, newEndPoint: THREE.Vector3): void {
    const startPoint = line.userData['startPoint'] as THREE.Vector3;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      startPoint,
      newEndPoint
    ]);

    line.geometry.dispose();
    line.geometry = geometry;

    line.userData['endPoint'] = newEndPoint.clone();
  }

  public resizeSelectedAsset(
    asset: THREE.Object3D,
    currentPoint: THREE.Vector3,
    resizeCenter: THREE.Vector3,
    resizeStartDistance: number,
    resizeStartScale: THREE.Vector3
  ): void {

    const currentDistance = currentPoint.distanceTo(resizeCenter);

    if (resizeStartDistance === 0) return;

    const rawScaleFactor = currentDistance / resizeStartDistance;

    const scaleFactor = THREE.MathUtils.clamp(
      rawScaleFactor,
      0.05,
      10
    );

    let newScaleX = resizeStartScale.x * scaleFactor;
    let newScaleY = resizeStartScale.y * scaleFactor;
    let newScaleZ = resizeStartScale.z * scaleFactor;

    const baseScale = asset.userData['baseScale'] as THREE.Vector3 | undefined;

    if (baseScale) {
      const signX = Math.sign(newScaleX) || 1;
      const signY = Math.sign(newScaleY) || 1;
      const signZ = Math.sign(newScaleZ) || 1;

      newScaleX = signX * Math.max(Math.abs(newScaleX), Math.abs(baseScale.x));
      newScaleY = signY * Math.max(Math.abs(newScaleY), Math.abs(baseScale.y));
      newScaleZ = signZ * Math.max(Math.abs(newScaleZ), Math.abs(baseScale.z));
    }

    asset.scale.set(newScaleX, newScaleY, newScaleZ);
    asset.updateMatrixWorld(true);
  }

  public isObjectInLayer(object: THREE.Object3D, layerName: string): boolean {
    const type =
      object.userData?.['layerType'] ??
      object.userData?.['type'];

    if (!type) return false;

    switch (layerName) {
      case 'Tracks':
      return (
        type === 'Track' ||
        type === 'Tracks' ||
        type === 'BackendTrack' ||
        type === 'DrawnLine' ||
        type === 'DrawnCurve' ||
        type === 'DrawnArc' ||
        type === 'DrawnTransitionCurve' ||
        type === 'DrawnClothoid'
      );

      case 'Switches':
        return type === 'Switch';

      case 'Signals':
        return type === 'Signal' || type === 'ETCSmarker';

      case 'Balises':
        return type === 'BaliseGroup';

      /*
      case 'Timing Points':
        return type === 'TimingPoint';
  
      case 'Segment Profiles':
        return type === 'SegmentProfile';
      */
      default:
        return false;
    }
  }

  public applyLayerHighlight(
    object: THREE.Object3D,
    highlightedObjects: THREE.Object3D[]
  ): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      const material = mesh.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (!material) return;

      const materials = Array.isArray(material)
        ? material
        : [material];

      materials.forEach((mat: any) => {
        if (!mat.color) return;

        mat.userData = mat.userData || {};

        if (!mat.userData['originalColor']) {
          mat.userData['originalColor'] = mat.color.clone();
        }

        mat.color.setHex(0x00aaff);
        mat.needsUpdate = true;
      });
    });

    highlightedObjects.push(object);
  }

  public clearLayerHighlights(
    highlightedObjects: THREE.Object3D[]
  ): void {
    highlightedObjects.forEach((object) => {
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;

        const material = mesh.material as
          | THREE.Material
          | THREE.Material[]
          | undefined;

        if (!material) return;

        const materials = Array.isArray(material)
          ? material
          : [material];

        materials.forEach((mat: any) => {
          if (!mat.color) return;

          if (mat.userData?.['originalColor']) {
            mat.color.copy(mat.userData['originalColor']);
            mat.needsUpdate = true;
          }
        });
      });
    });
  }

  public highlightSelectedImportedElement(
    object: THREE.Object3D
  ): void {
    this.clearSelectedImportedElementHighlight();

    object.traverse((child) => {
      const renderable = child as THREE.Line | THREE.Mesh;

      const material =
        renderable.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (!material) {
        return;
      }

      const materials = Array.isArray(material)
        ? material
        : [material];

      materials.forEach((mat: any) => {
        if (!mat.color) {
          return;
        }

        mat.userData = mat.userData || {};

        if (!mat.userData['selectionOriginalColor']) {
          mat.userData['selectionOriginalColor'] =
            mat.color.clone();
        }

        mat.color.setHex(0xffff00);
        mat.needsUpdate = true;
      });
    });

    this.selectedImportedElement = object;

    console.log('IMPORTED ELEMENT SELECTED:', {
      type: object.userData?.['type'],
      id:
        object.userData?.['id'] ??
        object.userData?.['name']
    });
  }

  public clearSelectedImportedElementHighlight(): void {
    if (!this.selectedImportedElement) {
      return;
    }

    this.selectedImportedElement.traverse((child) => {
      const renderable = child as THREE.Line | THREE.Mesh;

      const material =
        renderable.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (!material) {
        return;
      }

      const materials = Array.isArray(material)
        ? material
        : [material];

      materials.forEach((mat: any) => {
        const originalColor =
          mat.userData?.['selectionOriginalColor'];

        if (!mat.color || !originalColor) {
          return;
        }

        mat.color.copy(originalColor);
        mat.needsUpdate = true;

        delete mat.userData['selectionOriginalColor'];
      });
    });

    this.selectedImportedElement = null;
  }

  public cloneObjectForCanvas(object: THREE.Object3D): THREE.Object3D {
    const originalUserData = new Map<THREE.Object3D, any>();

    // 1. Temporarily remove circular userData before cloning
    object.traverse((child) => {
      originalUserData.set(child, child.userData);

      child.userData = {
        draggable: child.userData?.['draggable'] ?? false,
        type: child.userData?.['type'],
        isResizeHandle: child.userData?.['isResizeHandle'],
        isRotateHandle: child.userData?.['isRotateHandle'],
      };
    });

    // 2. Now clone safely
    const clone = object.clone(true);

    // 3. Restore original userData on original object
    object.traverse((child) => {
      const savedUserData = originalUserData.get(child);
      child.userData = savedUserData ?? {};
    });

    // 4. Clean duplicate userData and clone geometry/materials
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry = mesh.geometry.clone();
      }

      const material = mesh.material;

      if (Array.isArray(material)) {
        mesh.material = material.map((m) => m.clone());
      } else if (material) {
        mesh.material = material.clone();
      }

      child.userData = {
        ...child.userData,
        id: crypto.randomUUID(),
        draggable: true,
      };

      delete child.userData['canvasItem'];
      delete child.userData['notificationService'];
    });

    return clone;
  }

  public removeCanvasItemReferences(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (!child.userData) return;

      delete child.userData['canvasItem'];
      delete child.userData['notificationService'];

      child.userData['id'] = crypto.randomUUID();
      child.userData['draggable'] = true;
    });
  }

  public getDeletableRoot(
    object: THREE.Object3D,
    scene: THREE.Scene
  ): THREE.Object3D {
    let current: THREE.Object3D | null = object;

    while (current) {
      if (current.userData?.['canvasItem']) {
        return current;
      }

      if (current.parent === scene) {
        return current;
      }

      current = current.parent;
    }

    return object;
  }

  public disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const material = mesh.material;

      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else if (material) {
        material.dispose();
      }
    });
  }

  public mirrorAsset(
    object: THREE.Object3D,
    axis: 'horizontal' | 'vertical'
  ): void {
    const beforeBox = new THREE.Box3().setFromObject(object);
    const beforeCenter = beforeBox.getCenter(new THREE.Vector3());

    if (axis === 'horizontal') {
      object.scale.y *= -1;
    } else {
      object.scale.x *= -1;
    }

    object.updateMatrixWorld(true);

    const afterBox = new THREE.Box3().setFromObject(object);
    const afterCenter = afterBox.getCenter(new THREE.Vector3());

    object.position.add(beforeCenter.sub(afterCenter));
    object.updateMatrixWorld(true);
  }

  public getResizeHandleUnderMouse(
    event: PointerEvent,
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    resizeHandles: THREE.Mesh[]
  ): THREE.Object3D | null {
    const rect = canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(resizeHandles, true);

    return intersects.length > 0 ? intersects[0].object : null;
  }

  public getRotateHandleUnderMouse(
    event: PointerEvent,
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    rotateHandle: THREE.Mesh | null
  ): THREE.Object3D | null {
    if (!rotateHandle) return null;

    const rect = canvas.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(rotateHandle, true);

    return intersects.length > 0 ? rotateHandle : null;
  }

  public clearSelectionBox(
    scene: THREE.Scene,
    selectionBox: THREE.Line | null,
    resizeHandles: THREE.Mesh[],
    rotateHandle: THREE.Mesh | null
  ): void {
    if (selectionBox) {
      scene.remove(selectionBox);
      selectionBox.geometry.dispose();

      const material = selectionBox.material;

      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    }

    resizeHandles.forEach(handle => {
      scene.remove(handle);

      handle.geometry?.dispose();

      const material = handle.material;

      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else if (material) {
        material.dispose();
      }
    });

    if (rotateHandle) {
      scene.remove(rotateHandle);
      rotateHandle.geometry.dispose();

      const material = rotateHandle.material;

      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    }
  }

  public showSelectionBox(
    asset: THREE.Object3D,
    scene: THREE.Scene
  ): {
    selectionBox: THREE.Line | null;
    resizeHandles: THREE.Mesh[];
    rotateHandle: THREE.Mesh | null;
  } {
    const originalRotationZ = asset.rotation.z;
    const pivot = asset.position.clone();

    // Temporarily remove rotation to calculate bounds
    asset.rotation.z = 0;
    asset.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(asset);

    // Restore rotation
    asset.rotation.z = originalRotationZ;
    asset.updateMatrixWorld(true);

    if (box.isEmpty()) {
      return {
        selectionBox: null,
        resizeHandles: [],
        rotateHandle: null
      };
    }

    const padding = 2;

    const minX = box.min.x - padding;
    const maxX = box.max.x + padding;
    const minY = box.min.y - padding;
    const maxY = box.max.y + padding;

    const unrotatedCorners = [
      new THREE.Vector3(minX, minY, 0),
      new THREE.Vector3(maxX, minY, 0),
      new THREE.Vector3(maxX, maxY, 0),
      new THREE.Vector3(minX, maxY, 0)
    ];

    const rotatedCorners = unrotatedCorners.map(corner =>
      corner
        .clone()
        .sub(pivot)
        .applyAxisAngle(
          new THREE.Vector3(0, 0, 1),
          originalRotationZ
        )
        .add(pivot)
    );

    // Selection rectangle
    const selectionPoints = [
      ...rotatedCorners,
      rotatedCorners[0]
    ];

    const geometry = new THREE.BufferGeometry()
      .setFromPoints(selectionPoints);

    const material = new THREE.LineDashedMaterial({
      color: 0x00aaff,
      linewidth: 2,
      dashSize: 1,
      gapSize: 0.6,
      depthTest: false
    });

    const selectionBox = new THREE.Line(geometry, material);
    selectionBox.renderOrder = 999;
    selectionBox.computeLineDistances();

    scene.add(selectionBox);

    // Blue resize handles
    const resizeHandles: THREE.Mesh[] = [];

    rotatedCorners.forEach(corner => {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 0.1),
        new THREE.MeshBasicMaterial({
          color: 0x00aaff,
          depthTest: false
        })
      );

      handle.position.copy(corner);
      handle.renderOrder = 1000;
      handle.userData['isResizeHandle'] = true;

      scene.add(handle);
      resizeHandles.push(handle);
    });

    // Green rotation handle
    const topLeft = rotatedCorners[3];
    const topRight = rotatedCorners[2];

    const topMid = new THREE.Vector3()
      .addVectors(topLeft, topRight)
      .multiplyScalar(0.5);

    const topDirection = new THREE.Vector3()
      .subVectors(topRight, topLeft)
      .normalize();

    const outwardDirection = new THREE.Vector3(
      -topDirection.y,
      topDirection.x,
      0
    ).normalize();

    const rotatePosition = topMid
      .clone()
      .add(outwardDirection.multiplyScalar(5));

    const rotateHandle = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 32),
      new THREE.MeshBasicMaterial({
        color: 0x8ccf22,
        depthTest: false
      })
    );

    rotateHandle.position.copy(rotatePosition);
    rotateHandle.renderOrder = 1000;
    rotateHandle.userData['isRotateHandle'] = true;

    scene.add(rotateHandle);

    return {
      selectionBox,
      resizeHandles,
      rotateHandle
    };
  }

  public updateCurveHandlePositions(
    curve: THREE.Line,
    handleGroup: THREE.Group
  ): void {

    const startPoint =
      curve.userData['startPoint'] as THREE.Vector3;

    const controlPoint =
      curve.userData['controlPoint'] as THREE.Vector3;

    const endPoint =
      curve.userData['endPoint'] as THREE.Vector3;

    if (!startPoint || !controlPoint || !endPoint) {
      return;
    }

    handleGroup.children.forEach((child) => {

      const handle = child as THREE.Mesh;

      const kind = handle.userData['handleKind'];

      if (kind === 'start') {
        handle.position.copy(startPoint);
      }

      if (kind === 'control') {
        handle.position.copy(controlPoint);
      }

      if (kind === 'end') {
        handle.position.copy(endPoint);
      }

      handle.position.z = 2;
    });
  }

  public createCurveHandle(
      position: THREE.Vector3,
      kind: 'start' | 'control' | 'end',
      curve: THREE.Line
    ): THREE.Mesh {

      const geometry = new THREE.CircleGeometry(0.8, 32);

      const color =
        kind === 'control'
          ? 0x22c55e
          : 0x38bdf8;

      const material = new THREE.MeshBasicMaterial({
        color,
        depthTest: false,
        depthWrite: false
      });

      const handle = new THREE.Mesh(geometry, material);

      // Position the handle
      handle.position.copy(position);
      handle.position.z = 2;

      // Store information needed for editing
      handle.userData['type'] = 'CurveHandle';
      handle.userData['handleKind'] = kind;
      handle.userData['curve'] = curve;

      return handle;
    }

    clearCurveHandles(
      handleGroup: THREE.Group | null,
      scene: THREE.Scene
    ): void {
      if (!handleGroup) {
        return;
      }

      handleGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();

          const material = child.material;

          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material.dispose();
          }
        }
      });

      scene.remove(handleGroup);
    }

    public showCurveHandles(
    curve: THREE.Line,
    scene: THREE.Scene
  ): THREE.Group | null {

    const startPoint = curve.userData['startPoint'] as THREE.Vector3;
    const controlPoint = curve.userData['controlPoint'] as THREE.Vector3;
    const endPoint = curve.userData['endPoint'] as THREE.Vector3;

    if (!startPoint || !controlPoint || !endPoint) {
      return null;
    }

    const handleGroup = new THREE.Group();

    const startHandle = this.createCurveHandle(
      startPoint,
      'start',
      curve
    );

    const controlHandle = this.createCurveHandle(
      controlPoint,
      'control',
      curve
    );

    const endHandle = this.createCurveHandle(
      endPoint,
      'end',
      curve
    );

    handleGroup.add(startHandle, controlHandle, endHandle);

    scene.add(handleGroup);

    return handleGroup;
  }   
}