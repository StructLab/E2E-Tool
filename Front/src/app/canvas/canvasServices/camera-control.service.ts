import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class CameraControlService {
  private camera!: THREE.OrthographicCamera;
  private canvas!: HTMLCanvasElement;

  private minZoom = 0.001;
  private maxZoom = 20;
  private zoomSpeed = 1.15;

  private wheelHandler?: (event: WheelEvent) => void;

  init(
    canvas: HTMLCanvasElement,
    camera: THREE.OrthographicCamera
  ): void {
    this.canvas = canvas;
    this.camera = camera;

    this.attachEvents();
  }

  private attachEvents(): void {
    if (this.wheelHandler) {
      this.canvas.removeEventListener('wheel', this.wheelHandler);
    }

    this.wheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      this.handleWheelZoomToCursor(event);
    };

    this.canvas.addEventListener(
      'wheel',
      this.wheelHandler,
      { passive: false }
    );
  }

  private handleWheelZoomToCursor(event: WheelEvent): void {
    if (!this.camera || !this.canvas) return;

    const beforeZoomPoint = this.getWorldPointFromMouse(event);

    const zoomFactor =
      event.deltaY < 0
        ? this.zoomSpeed
        : 1 / this.zoomSpeed;

    const nextZoom = THREE.MathUtils.clamp(
      this.camera.zoom * zoomFactor,
      this.minZoom,
      this.maxZoom
    );

    // Stop when already at a zoom limit.
    if (nextZoom === this.camera.zoom) return;

    this.camera.zoom = nextZoom;
    this.camera.updateProjectionMatrix();

    const afterZoomPoint = this.getWorldPointFromMouse(event);

    this.camera.position.x +=
      beforeZoomPoint.x - afterZoomPoint.x;

    this.camera.position.y +=
      beforeZoomPoint.y - afterZoomPoint.y;

    this.camera.updateMatrixWorld();
  }

  private getWorldPointFromMouse(
    event: MouseEvent
  ): THREE.Vector3 {
    const rect = this.canvas.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);

    const plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      0
    );

    const point = new THREE.Vector3();

    const intersection =
      raycaster.ray.intersectPlane(plane, point);

    return intersection
      ? point
      : new THREE.Vector3(
          this.camera.position.x,
          this.camera.position.y,
          0
        );
  }

  setZoomLimits(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;
  }
}