import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class CanvasPanService {
  private camera!: THREE.OrthographicCamera;
  private panSpeed = 20; // world units per key press
  private isPanning = false; // Track if middle mouse is held
  init(camera: THREE.OrthographicCamera, speed: number = 2) {
    this.camera = camera;
    this.panSpeed = speed;
  

    this.attachKeyboardEvents();
  }

  private attachKeyboardEvents() {

    window.addEventListener('mousedown', (event) => {
    // Check if middle mouse button
    if (event.button === 1) {
      console.log('Middle mouse pressed - start panning');
      this.isPanning = true;
    }
    
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 1) {
      this.isPanning = false;
    }
  });

  window.addEventListener('mousemove', (event) => {
    if (!this.camera || !this.isPanning) return;

    this.camera.position.x -= event.movementX * this.panSpeed * 0.1;
    this.camera.position.y += event.movementY * this.panSpeed * 0.1;
  });

    window.addEventListener('keydown', (event) => {
      if (!this.camera) return;

      switch (event.key) {
        case 'ArrowUp':
          this.camera.position.y += this.panSpeed;
          break;
        case 'ArrowDown':
          this.camera.position.y -= this.panSpeed;
          break;
        case 'ArrowLeft':
          this.camera.position.x -= this.panSpeed;
          break;
        case 'ArrowRight':
          this.camera.position.x += this.panSpeed;
          break;
      }
    });
  }

  setPanSpeed(speed: number) {
    this.panSpeed = speed;
  }
}
