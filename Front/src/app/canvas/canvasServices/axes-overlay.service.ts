import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class AxesOverlayService {

  private axesScene!: THREE.Scene;
  private axesCamera!: THREE.OrthographicCamera;
  private axesHelper!: THREE.AxesHelper;

  init() {
    // Create separate scene
    this.axesScene = new THREE.Scene();

    // Small orthographic camera
    this.axesCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    this.axesCamera.position.set(0, 0, 10);
    this.axesCamera.lookAt(0, 0, 0);

    // Axes helper
    this.axesHelper = new THREE.AxesHelper(5);
    this.axesScene.add(this.axesHelper);

    // Add axis labels
    this.addLabels();
  }

  render(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) {
    const size = 120; // overlay size

    renderer.clearDepth(); // important!

    renderer.setViewport(
      canvas.clientWidth - size,
      0,
      size,
      size
    );

    renderer.render(this.axesScene, this.axesCamera);
  }

  private addLabels() {
    const xLabel = this.createAxisLabel('X', 'red');
    xLabel.position.set(6, 0, 0);

    const yLabel = this.createAxisLabel('Y', 'green');
    yLabel.position.set(0, 6, 0);

    const zLabel = this.createAxisLabel('Z', 'blue');
    zLabel.position.set(0, 0, 6);

    this.axesScene.add(xLabel, yLabel, zLabel);
  }

  private createAxisLabel(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    canvas.width = 256;
    canvas.height = 256;

    context.fillStyle = color;
    context.font = 'Bold 120px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(3, 3, 1);

    return sprite;
  }
}
