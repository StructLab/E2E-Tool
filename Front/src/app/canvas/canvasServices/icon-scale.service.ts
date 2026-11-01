
import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class IconScaleService {

  // Default icon size: 100%
  private iconScale = 1.0;

  // Allowed range: 50% to 200%
  private readonly minScale = 0.5;
  private readonly maxScale = 2.0;

  getScale(): number {
    return this.iconScale;
  }

  setScale(scale: number, scene: THREE.Scene): void {
    this.iconScale = THREE.MathUtils.clamp(
      scale,
      this.minScale,
      this.maxScale
    );

    this.updateIcons(scene);
  }

  // Register an SVG icon for scaling
  registerIcon(icon: THREE.Object3D): void {
    if (!icon.userData['baseScale']) {
      icon.userData['baseScale'] = icon.scale.clone();
    }

    icon.userData['iconScalable'] = true;

    this.applyScale(icon);
  }

  private applyScale(icon: THREE.Object3D): void {
    const baseScale = icon.userData['baseScale'] as
      THREE.Vector3 | undefined;

    if (!baseScale) {
      return;
    }

    icon.scale.copy(baseScale).multiplyScalar(this.iconScale);
  }

  // Update all registered icons on the canvas
  updateIcons(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object.userData['iconScalable'] === true) {
        this.applyScale(object);
      }
    });
  }

  resetScale(scene: THREE.Scene): void {
    this.setScale(1.0, scene);
  }
}
    