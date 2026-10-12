import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { addIcon } from '../../generic/canvas-item';
import { NotificationService } from '../../services/notification.service';

@Injectable({ providedIn: 'root' })
export class SvgDropService {

  constructor(private notificationService: NotificationService) { }

  dropSvg(
    ndcX: number,
    ndcY: number,
    rotation: number,
    svgSrc: string,
    scene: THREE.Scene,
    creatInBackEnd: boolean,
    id?: string
  ) {
    const scale = this.getAssetScale(svgSrc);

    addIcon(
      scene,
      svgSrc,
      scale,
      new THREE.Vector3(ndcX, ndcY, 0),
      rotation,
      this.notificationService,
      () => {},
      creatInBackEnd,
      id
    );
  }

  private getAssetScale(svgSrc: string): number {
    const file = svgSrc.toLowerCase();

    if (file.includes('axlecounter')) {
      return 1.0;
    }

    if (file.includes('balisegroup')) {
      return 1.1;
    }

    if (file.includes('etcsmarker')) {
      return 0.9;
    }

    if (file.includes('bufferstop')) {
      return 0.9;
    }

    return 1.0;
  }
}