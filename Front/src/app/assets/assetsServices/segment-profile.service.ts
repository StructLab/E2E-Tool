import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { addIcon, CanvasItem } from '../../generic/canvas-item';
import { NotificationService } from '../../services/notification.service';

@Injectable({ providedIn: 'root' })
export class SegmentProfileService {

    constructor(private notificationService: NotificationService) { }

    /**
     * Handle a dropped SVG and add it to the scene
     * @param event DragEvent from the canvas
     * @param canvas The canvas element
     * @param scene THREE.Scene to add the mesh to
     */
    SegmentProfileCreation(scene: THREE.Scene, id?: string) {
        scene.traverse((child) => {

            if (child.userData["type"] === "Track") {
                const line = child as THREE.Line;
                const mat = line.material as THREE.LineBasicMaterial;

                // ✅ reset all tracks first (optional but recommended)
                mat.color.set(0x000000);

                // ✅ highlight only selected one
                if (child.userData["id"] === id) {
                    mat.color.set(0xff0000); // 🔴 red
                    console.log('Track selected - highlight:', id);
                }
            }

        });

    }
}
