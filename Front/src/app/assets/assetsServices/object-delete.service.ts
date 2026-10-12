import { Injectable, HostListener } from '@angular/core';
import * as THREE from 'three';
import { CanvasItem } from '../../generic/canvas-item';
import { DeleteObject } from '../../api/end_points';
import { NotificationService } from '../../services/notification.service';

@Injectable({ providedIn: 'root' })
export class ObjectDeleteService {
  private camera!: THREE.OrthographicCamera;
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private raycaster = new THREE.Raycaster();
  private selectedMesh?: THREE.Mesh;

  constructor(private notificationService: NotificationService) { }

  init(camera: THREE.OrthographicCamera, scene: THREE.Scene, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.scene = scene;
    this.canvas = canvas;

    this.canvas.addEventListener('click', (event) => this.selectObject(event));

    // Listen globally for Delete key
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Delete') this.deleteSelectedMesh();
    });
  }

  selectObject(event: MouseEvent | DragEvent) {
    event.preventDefault();
    if (!this.canvas || !this.scene) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      this.selectedMesh = intersects[0].object as THREE.Mesh;
      console.log('Mesh selected:', this.selectedMesh.userData['id'] || this.selectedMesh.userData['type'] || this.selectedMesh.uuid);
    }
  }

  deleteSelectedMesh() {
    if (!this.selectedMesh || !this.scene) return;

    // Remove from scene
    this.scene.remove(this.selectedMesh);

    // Dispose geometry and material
    if (this.selectedMesh.geometry) this.selectedMesh.geometry.dispose();
    if (this.selectedMesh.material) {
      if (Array.isArray(this.selectedMesh.material)) {
        this.selectedMesh.material.forEach((m) => m.dispose());
      } else {
        this.selectedMesh.material.dispose();
      }
    }
    (this.selectedMesh.userData["canvasItem"] as CanvasItem)
    DeleteObject(this.selectedMesh.userData["id"]);
    console.log('Deleted mesh:', this.selectedMesh.userData['id'] || this.selectedMesh.uuid);

    // Clear selection
    this.selectedMesh = undefined;
  }
}