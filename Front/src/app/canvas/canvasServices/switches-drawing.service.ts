import { ElementRef, Injectable } from '@angular/core';
import * as THREE from 'three';
import { DrawingItem, SwitchItem } from '../../generic/canvas-item';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SwitchesDawingService {
    private scene: THREE.Scene
    /**
     *
     */
    constructor(scene: THREE.Scene, http: HttpClient) {
        this.scene = scene;
    }

  
}
