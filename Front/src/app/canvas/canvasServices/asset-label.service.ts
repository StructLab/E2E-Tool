
import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class AssetLabelService {

  addLabel(
    icon: THREE.Object3D,
    displayId: string
  ): void {

    // Avoid adding duplicate labels
    const existing = icon.children.find(
      child => child.userData['type'] === 'AssetIdLabel'
    );

    if (existing) {
      icon.remove(existing);
    }

    // Create a canvas for the text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;

    const context = canvas.getContext('2d');

    if (!context) return;

    context.clearRect(0, 0, 256, 64);

    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#38bdf8';

    context.fillText(displayId, 128, 32);

    // Convert text into a Three.js texture
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const label = new THREE.Sprite(material);

    label.name = 'AssetIdLabel';

    label.userData['type'] = 'AssetIdLabel';
    label.userData['isAssetLabel'] = true;
    label.userData['displayId'] = displayId;
    label.userData['draggable'] = true;

    // Store the initial label position and rotation
    label.userData['labelRotation'] = 0;

    // Position relative to the icon's bounding box
    icon.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(icon);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    const worldPosition = new THREE.Vector3(
      center.x,
      bounds.max.y + Math.max(size.y * 0.3, 1),
      center.z
    );

    label.position.copy(icon.worldToLocal(worldPosition));
    label.userData['defaultPosition'] = label.position.clone();

    // Text size relative to the original icon size
    const labelHeight = Math.max(size.y * 0.3, 1);
    const localScale = icon.getWorldScale(new THREE.Vector3());

    label.scale.set(
      (labelHeight * 4) / Math.abs(localScale.x || 1),
      labelHeight / Math.abs(localScale.y || 1),
      1
    );

    // Keep labels above other objects
    label.renderOrder = 1000;

    // Attach the label to its icon
    icon.add(label);
  }
}
